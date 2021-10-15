---
title: "PHP 实现账号登陆认证 5 - 添加 CSRF 保护"
slug: "authentication-with-php-5"
tags: ["PHP"]
date: "2018-03-04T15:53:12+08:00"
---

CSRF(Cross-site request forgery)跨站请求伪造，是一种挟制用户在当前已登录的 Web 应用程序上执行非本意的操作的攻击方法。

简单地说，是攻击者通过一些技术手段欺骗用户的浏览器去访问一个自己曾经认证过的网站并执行一些操作（如发邮件，发消息，甚至财产操作如转账和购买商品）。由于浏览器曾经认证过，所以被访问的网站会认为是真正的用户操作而去执行。这利用了 web 中用户身份验证的一个漏洞：简单的身份验证只能保证请求发自某个用户的浏览器，却不能保证请求本身是用户自愿发出的。

维基百科上给出了以下 CSRF 攻击的例子：

例子假如一家银行用以执行转账操作的 URL 地址如下：

```
http://www.examplebank.com/withdraw?account=AccoutName&amount=1000&for=PayeeName
```

那么，一个恶意攻击者可以在另一个网站上放置如下代码

```html
<img src="http://www.examplebank.com/withdraw?account=Alice&amount=1000&for=Badman" />
```

如果有账户名为 Alice 的用户访问了恶意站点，而她之前刚访问过银行不久，登录信息尚未过期，那么她就会损失 1000 资金。

## 解决 CSRF 的方案

一是**检查 Referer 字段**，在服务器收到请求是检查 HTTP 请求的 referer 是否为本站地址，以检查是否为跨站请求。但是 ref 字段的设置取决于浏览器，http 协议并为对此字段做明确规定，因此攻击者是可以随意更改 ref 字段达到跨站请求的目的的，这个方法并不是太可靠。

第二种是**添加 token**，这是最为广泛使用的方案，在客户端提交敏感请求时，附带上这个 token 传递给服务器进行校验，若校验通过则通过这个请求。在正常的访问时，客户端的表单中被自动附加得到了这个由服务器生成的 token，但是攻击者由于是非正常请求无法获取到这个 token，因此自然会验证失败

## 在 Slim 中完成简单的 CSRF 防护

简单的思路是开始 session 时自动生成一个随机字符串保存，然后在渲染表单时将这个 token 传入到表单中。

这里重构一下 session 开始方法，将其作为一个中间件注入到整个应用中，且应该是第一个被执行的中间件，这样才不会应该后面对用户判断中间件产生影响；然后再编写一个对 CSRF token 进行验证的中间件，应当对所有的 POST\PATCH 等请求做出防护验证这个必要的 token。

### SessionStartMiddleware

请求传入时，首先检验 session 中是否有名为`_token`的字段，否则这是一个新的回话，应该重新生成 token，这个生成 token 的方法是通过阅读 Laravel 源码得到的，照搬到这里，其实也就是生成一段长度为 40 的随机字符串。在生成 token 后为了能够在表单中加入 token 因此在需要为 Twig 添加一个扩展：

```php
<?php

namespace App\Twig;

class CsrfTwigExtension extends \Twig_Extension
{

    public function getFunctions()
    {
        return [
            new \Twig_SimpleFunction('csrf_field', array($this, 'csrfField')),
        ];
    }

    public function csrfField()
    {
        $token = isset($_SESSION['_token']) ? $_SESSION['_token'] : '';
        return '
            <input type="hidden" name="_token" value="'. $token .'">
        ';
    }
}
```

添加完成扩展后在 Twig 中可以使用`{{ csrf_field() | raw }}`将 token 一行添加到表单内。后面的 raw 是为了防止其转义成纯字符而不是表单内容。

下面是完整的 Session 初始化中间件：

```php
<?php
namespace App\Middleware;


class SessionStartMiddleware extends Middleware
{
    public function __invoke($request, $response, $next)
    {
        $config = $this->container['settings']['session'];
        $this->start($config);

        if (!isset($_SESSION['_token'])) {
            //generate csrf token
            $this->generateToken(40);
        }

        $this->initialForTwig();

        $response = $next($request, $response);
        return $response;
    }
    public function start($config)
    {
        //服务端 Session 有效时间10天
        ini_set('session.gc_maxlifetime', $config['gc_maxlifetime']);
        //客户端 Cookie 登陆状态有效时间10天
        ini_set('session.cookie_lifetime', $config['cookie_lifetime']);
        //将session储存地址设置为本地storage文件夹
        ini_set('session.save_path', $config['save_path']);
        //开始session会话
        session_start();
    }

    public function initialForTwig()
    {
        $view = $this->container['view'];
        $view->getEnvironment()->addGlobal('token', $_SESSION['_token']);
        $view->getEnvironment()->addExtension(new \App\Twig\CsrfTwigExtension);
        $view->getEnvironment()->addGlobal('auth', [
            'check' => \App\Auth\Auth::check(),
            'user' => \App\Auth\Auth::user()
        ]);
    }

    public function generateToken($length)
    {
        //generate a csrf token to session
        $token = '';
        while (($len = strlen($token)) < $length) {
            $size = $length - $len;
            $bytes = random_bytes($size);
            $token .= substr(str_replace(['/', '+', '='], '', base64_encode($bytes)), 0, $size);
        }
        $_SESSION['_token'] = $token;
    }
}
```

这是一个全局的中间件，因此在`middleware.php`全局注册：

```
$app->add(new \App\Middleware\SessionStartMiddleware($app->getContainer()));
```

### CsrfMiddleware

每一个对网站做出访问的新的回话，服务器中都会保存一个独特的 token，那么在表单提交时为了验证这个 session，还需要再编写一个全局中间件，对于指定的请求方法执行，判断传入的 token 与 session 保存的 token 是否一致，若一致才放行这个请求，否则直接返回错误：

```php
<?php
namespace App\Middleware;

class CsrfMiddleware extends Middleware
{
    public function __invoke($request, $response, $next)
    {
        if (in_array($request->getMethod(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            $body = $request->getParsedBody();
            if (!isset($body['_token'])) {
                return $response->write("CSRF token missing!");
            }
            if ($body['_token'] != $_SESSION['_token']) {
                return $response->write("CSRF token mismatch!");
            }
        }
        $response = $next($request, $response);
        return $response;
    }
}
```

### 注册中间件

在`middleware.php`中进行注册：

```php
<?php
//Add the global middlewares here

//CSRF Token Middleware
$app->add(new \App\Middleware\CsrfMiddleware($app->getContainer()));

// The last middleware is the first to excute

// Start session
$app->add(new \App\Middleware\SessionStartMiddleware($app->getContainer()));
```
