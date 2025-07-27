---
title: "PHP 实现账号登陆认证 4 - 完善表单"
slug: "authentication-with-php-4"
tags: ["PHP"]
pubDatetime: 2018-03-04T14:53:12+08:00
description: ""
---

现在我们的注册与登陆表单还有一些用户体验不太良好的地方需要做出以下改进：

1.  提交表单有错误返回时没有任错误提示，如邮箱已被注册
2.  提交表单有错误返回时旧的数据被清空

可以分别编写两个中间件来解决这两个问题，`ValidationMiddleware`返回错误信息，`OldFormDataMiddleware`返回旧的填写数据

## ValidationMiddleware

错误信息同样是以 session 的形式记录的，与保存登陆信息的 session 不同之处在于，错误信息提示 session 仅仅只在下一次请求时有效，显示给用户之后在服务器上就应该被清除。

### 改进 Controller

首先改写`LoginController`中的`handleLogin`方法。在有错误时在 session 中写入 key 为 errors 的错误信息

```php
//handle login request
public function handleLogin(Request $request, Response $response)
{
    //get post data from request
    $body = $request->getParsedBody();
    //check is user exists
    if (!User::where('email', $body['email'])->first()) {
        $_SESSION['errors']['email'] = "User doesn't exist!";
        return $response->withRedirect('/login', 301);
    }
    //check if password is correct
    $auth = Auth::attempt($body['email'], $body['password']);
    if (!$auth) {
        //wrong password
        $_SESSION['errors']['password'] = "Wrong password!";
        return $response->withRedirect('/login', 301);
    }
    //login succcessfully, redirect to home page
    return $response->withRedirect('/home', 301);
}
```

### 新建中间价

编写中间件时，首先获取到这个错误信息，为了方便在模板中显示，这里为 Twig 添加一个能够在模板中显示的变量：

```php
<?php
namespace App\Middleware;

class ValidationMiddleware extends Middleware
{
    public function __invoke($request, $response, $next)
    {
        if (isset($_SESSION['errors'])) {
            $this->container->view->getEnvironment()->addGlobal('errors', $_SESSION['errors']);
            unset($_SESSION['errors']);
        }

        $response = $next($request, $response);
        return $response;
    }
}
```

> 通过 container 获取到 twig 使用`getEnvironment()->addGlobal('errors', $_SESSION['errors']);`来为模板添加名为**errors**的变量

### 在模板中使用

为了更加美观地显示错误信息，我这里使用了[Bulma](https://bulma.io/)CSS 框架，在 Twig 模板中使用双大括号`{{ errors.email }}`就可以直接访问刚刚添加的错误信息数组了：

```html
<div class="field">
  <label class="label">Email</label>
  <div class="control">
    <input
      class="input {{ errors.email ? 'is-danger' : ''}}"
      value="{{ old.email }}"
      type="email"
      name="email"
      required
    />
  </div>
  {% if errors.email %}
  <p class="help is-danger">{{ errors.email }}</p>
  {% endif %}
</div>
```

### 为路由注册中间件

共有两个表单因此为它们注册`ValidationMiddleware`

```php
$this->get('/login', '\App\Controller\LoginController:showLoginForm')
    ->add(new \App\Middleware\ValidationMiddleware($this->getContainer()));
$this->get('/register', '\App\Controller\RegisterController:showRegisterForm')
    ->add(new \App\Middleware\ValidationMiddleware($this->getContainer()));
```

## OldFormDataMiddleware

与上面返回错误信息中间件大同小异，返回旧表单数据的关键只是在中间件中获取 request 提交过来的 post 数据并添加到 session 中：

```php
$this->container->view->getEnvironment()->addGlobal('old', $_SESSION['old']);
$_SESSION['old'] = $request->getParams();
```
