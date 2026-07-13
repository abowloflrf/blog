---
title: "在 Laravel 中使用 jwt-auth 来构建 api"
slug: "use-jwt-in-laravel-to-build-api"
tags: ["PHP", "Laravel"]
pubDatetime: 2018-02-08T16:49:42+08:00
description: ""
---

在构建 REST-api 时，由于 api 是**无状态**的，因此无法使用 Cookie-Session 的传统的 Web 认证方式，
使用 Cookie-Session 认证机制，服务端在接收到 HTTP 请求时会将客户端的 Cookie 与服务端的 Session 进行判别来进行认证。但是构建 API 时一般不采用此方案，而是采用 token 进行认证，**JWT**全称为**JSON Web Token**，就是一套实现标准：
[jwt.io](https://jwt.io/)

前几天在使用 Laravel 构建一个前后端完全分离的 Web App 时，Laravel 就只需要接受 api 请求并返回 json 格式的结果即可，连 blade 模板也完全不需要使用了，为了区别不同用户已经是否登陆的用户的请求，在 Laravel 中我就使用了 jwt，具体使用的是这个包[jwt-auth - Github](https://github.com/tymondesigns/jwt-auth)，下面我就在以官方操作文档简单解释一下我是如何在 Laravel 中使用 jwt-auth 的

## 安装依赖

到我写这篇文章的今天：2018-2-8，这个包的 1.0 还是出去 rc 状态，应该马上会有 stable 版本了。官方 Wiki 说明 Laravel `5.*` && <`5.5` 最好使用 0.5 版本，1.0 版本是为 Laravel5.5 所适配的，我目前使用的是 Laravel 5.5 因此将 1.0.0-rc.1 加入依赖

```
composer require tymon/jwt-auth 1.0.0-rc.1
```

## 添加 Service Provider

使用 Laravel5.4 及以下版本时需要在在`config/app.php`中添加其 Service Provider，

```php
'providers' => [

    ...

    Tymon\JWTAuth\Providers\LaravelServiceProvider::class,
]
```

## 发布配置文件

执行以下命令

```
php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"
```

后会发现在`config`目录会多出一个`jwt.php`的配置文件，用于修改使用配置，比如 token 失效时间，刷新周期等等，这里我使用默认配置不做修改。

## 生成 Secret Key

执行以下命令

```
php artisan jwt:secret
```

此命令会在`.env`文件中生成一个自己的私钥，用于为 token 签名

> 在应用部署到生产环境中时，需要在生产环再次执行此命令重新生成 key

## 修改 User Model

在`User`Model 后实现`Tymon\JWTAuth\Contracts\JWTSubject`，以实现 jwt-auth 的两个方法，方法分别为`getJWTIdentifier()`和`getJWTCustomClaims()`

修改后的 User Model 应如下：

```php
<?php

namespace App;

use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable implements JWTSubject
{
    ...
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }
}
```

## 修改默认 Auth Guard

由于构建的是一个完全后端分离的 app，Laravel 只需要实现 api 即可，因此不再使用 web 认证，于是将默认 guard 修改为 api：在`config/auth.php`中修改默认的 Guard 方式为 api，再将 api 认证驱动修改为`jwt`，如下

```php
'defaults' => [
    'guard' => 'api',
    'passwords' => 'users',
],

...

'guards' => [
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
    ],
],
```

当然如果有时还是需要使用传统的 Laravel 的 web guard 时，可以在相应的 Controller 中添加如下方法即可避免使用默认的 api guard：

```php
protected function guard()
{
    return Auth::guard('web');
}
```

## 添加路由

由于构建的是 api 服务，因此在`routes/api.php`，中修改路由，在这里使用的路由默认 uri 最前面需加上`api/`

```php
Route::group(['middleware' => 'api', 'prefix' => 'auth'], function ($router) {
    Route::post('login', 'AuthController@login');
    Route::post('logout', 'AuthController@logout');
    Route::post('refresh', 'AuthController@refresh');
    Route::post('me', 'AuthController@me');
});
```

## 新建 Controller

这里也使用官方文档中的默认 Controller，这一步完成之后，Laravel 的 jwt-auth 就安装完成可以使用了

```
<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;

class AuthController extends Controller
{
    /**
     * Create a new AuthController instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login']]);
    }

    /**
     * Get a JWT via given credentials.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function login()
    {
        $credentials = request(['email', 'password']);

        if (! $token = auth()->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Get the authenticated User.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function me()
    {
        return response()->json(auth()->user());
    }

    /**
     * Log the user out (Invalidate the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout()
    {
        auth()->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh a token.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function refresh()
    {
        return $this->respondWithToken(auth()->refresh());
    }

    /**
     * Get the token array structure.
     *
     * @param  string $token
     *
     * @return \Illuminate\Http\JsonResponse
     */
    protected function respondWithToken($token)
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL() * 60
        ]);
    }
}

```

## 使用

发送一个 post 请求附带有效的用户 email 与密码到`/api/auth/login`以获得 token 会返回以下数据：

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ",
  "token_type": "bearer",
  "expires_in": 3600
}
```

在实际使用时可以将返回的 access_token 保存到浏览器的`LocalStorage`或 Cookie 中等等都行，然后在每次发送需要通过认证的 ajax 请求时在 Header 中附带以下参数即可：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

若认证失败服务端返回的 json 数据将会是`401 Unauthorized`

## Laravel + Vue + axios 最佳实践

在用户未认证的情况需要在 Web 中填写登陆表单时，我在登陆页编写了如下 js

```javascript
//首先获取Web中的csrf token以发送http post请求
axios.defaults.headers.common = {
  "X-CSRF-TOKEN": document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content"),
  "X-Requested-With": "XMLHttpRequest",
};
//点击登陆按钮后首先发送api的ajax login请求判断登陆凭据是否正确，若正确则保存返回的token到localStorage中供下次使用
handleLogin = function () {
  var loginForm = document.getElementById("login-form");
  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;
  axios
    .post("/api/auth/login", {
      email: email,
      password: password,
    })
    .then(response => {
      localStorage.setItem("token", response.data.access_token);
      loginForm.submit();
    })
    .catch(error => {
      loginForm.submit();
    });
};
```

登陆成功后跳转到使用`Vue`编写的一个 Web App，在初始化 Vue 组件前，获取之前在登陆时保存到 localStorage 的 token，添加到 axios 的公共头部中，以便让后面的所有请求都带上这个 token，那么接下来在使用 Vue 的整个生命周期中发送 axios 的 api 请求便都不用在意 token 如何附带进去了

```javascript
const app = new Vue({
  el: "#app",
  beforeCreate: function () {
    //let that = this;
    if (localStorage.token) {
      axios.defaults.headers.common["Authorization"] =
        "Bearer" + localStorage.token;
    }
  },
  render: h => h(App),
});
```
