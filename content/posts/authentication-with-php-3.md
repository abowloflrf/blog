---
title: "PHP 实现账号登陆认证 3 - 使用中间件 Middleware"
slug: "authentication-with-php-3"
tags: ["PHP"]
date: "2018-03-04T16:53:12+08:00"
---

何谓中间件？正如名字一样，其作用与一个一个 HTTP 请求传递到应用与处理这个请求之间，以过滤 HTTP 请求。就像用户登录后访问`/home`个人页面一样，只有已经登陆的用户才能够访问这个页面，否则会被跳转到登陆页面。

中间件可以单独为某条路由注册，或者对于整个应用全局注册。当一个请求传递到服务器时，根据在代码中注册中间件的先后顺序。最后面定义的中间件会被最先处理。

## 重构认证类

在编写中间件之前，首先需要将认证用户的方式整理一下。在前面是直接使用`$_SESSION`这个魔术变量来判定用户是否登陆，以及判断登陆的用户究竟是谁，这些有关认证的操作在各个 Controller 中都有可能被频繁使用到。可以编写一个`Auth`类来处理与认证相关的逻辑：

新建`src/Auth/Auth.php`，类中根据整理有这些静态方法：

1.  attempt 验证密码并登陆，写入 session
2.  check 检查已经登陆
3.  user 返回已经登陆的用户
4.  guest 检查是否为未登录的游客
5.  logout 注销当前登陆，销毁 session

```php
<?php
namespace App\Auth;

use App\Models\User;

class Auth
{
    public static function attempt($email, $password)
    {
        $user = User::where('email', $email)->first();
        if (!$user) {
            //user do not exist
            return false;
        }
        if (password_verify($password, $user->password)) {
            //password passed, write into session
            session_regenerate_id(true);
            $_SESSION = array();
            $_SESSION['user_id'] = $user->id;
            $_SESSION['user_name'] = $user->name;
            $_SESSION['user_email'] = $user->email;
            $_SESSION['user_logged_in'] = true;

            return true;
        }
        return false;
    }

    public static function check()
    {
        return isset($_SESSION['user_logged_in']);
    }

    public static function user()
    {
        if (isset($_SESSION['user_id'])) {
            return User::find($_SESSION['user_id']);
        } else {
            return null;
        }
    }

    public static function guest()
    {
        if (isset($_SESSION['user_logged_in'])) {
            return false;
        }
        return true;
    }

    public static function logout()
    {
        session_destroy();
    }
}
```

编写完后，可以在应用中使用`Auth::check()`来验证用户是否已经登陆等等方法。

## 创建中间件

首先和 Controller 一样先定义一个 BaseMiddleware 以注入 Container

然后创建`src/Middleware/AuthMiddleware.php`中间件：

```php
<?php
namespace App\Middleware;

use App\Auth\Auth;

// AuthMiddle 只允许已经登陆的用户通过，否则跳转到login
class AuthMiddleware extends Middleware
{
    public function __invoke($request, $response, $next)
    {
        if (Auth::guest()) {
            return $response->withRedirect('/login', 301);
        }
        $response = $next($request, $response);
        return $response;
    }
}
```

Slim 框架的中间件的关键部分是`__invoke`方法，代码中的意义也很明晰，这个中间件被处理时，先判断用户是否登陆，若未登陆，则跳转到`/login`，否则放行这个请求。

## 注册中间件

现在编写了两个中间件，一个是`GuestMiddleware`只允许游客访问，为**注册登陆**路由注册，另一个是`AuthMiddleware`至允许已经登陆的用户访问，为**个人主页、注销**路由注册

```php
//未登录的游客才可访问的路由
$app->group('', function () {
    $this->get('/login', '\App\Controller\LoginController:showLoginForm');
    $this->get('/register', '\App\Controller\RegisterController:showRegisterForm');
    $this->post('/login', '\App\Controller\LoginController:handleLogin');
    $this->post('/register', '\App\Controller\RegisterController:handleRegister');
})->add(new \App\Middleware\GuestMiddleware($app->getContainer()));

//已经登陆的用户才可以访问的路由
$app->group('', function () {
    $this->post('/logout', '\App\Controller\LoginController:logout');
    $this->get('/home', '\App\Controller\HomeController:index');
})->add(new \App\Middleware\AuthMiddleware($app->getContainer()));
```

注册完毕后已经登陆的用户就无法访问注册登陆页面了否则会跳转到自己的个人主页。同样的未登陆的用户也无法访问个人主页和注销请求，否则跳转到登陆页面。
