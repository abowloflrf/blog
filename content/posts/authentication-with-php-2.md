---
title: "PHP 实现账号登陆认证 2 - 基本 Session 认证"
slug: "authentication-with-php-2"
tags: ["PHP"]
date: "2018-03-03T12:53:12+08:00"
---

用户在访问时，服务器是如何判断用户究竟是已经登陆的用户还是未登录的游客呢？比较普遍的方法是使用 Cookie-Session 认证的方法。其中**Cookie**是储存在客户端，即用户浏览器的数据；**Session**是储存在服务器中的数据。

在 PHP 中默认实现是在调用`session_start()`时，生成一个唯一的 session 文件保存在服务器中，同时这个 session 文件有一个与之对应的 id，PHP 将这个 session id 返回给服务器作为 Cookie 储存在客户端浏览器中，默认的 Cookie 名称为`PHPSESSID`，由于浏览器给服务器发送的每一个请求都会附带上当前的 Cookie，因此服务器在处理请求时会得到这个客户端所发送过来的 session id，PHP 根据这个 id 可以定位到服务器中保存的 session 文件信息，并对其内容做出读取，添加，修改等等操作。

## session 设置

在`public/index.php`中，在`session_start()`调用前，进行一些相关的设置，比如 session、cookie 有效时间，以长时间保存登陆状态，修改 session 文件的默认储存路径为项目文件夹，以方便查看 session 内容等。

```php
//服务端 Session 有效时间10天
ini_set('session.gc_maxlifetime', 60 * 60 * 24 * 10);
//客户端 Cookie 登陆状态有效时间10天
ini_set('session.cookie_lifetime', 60 * 60 * 24 * 10);
//将session储存地址设置为本地storage文件夹
ini_set('session.save_path', __DIR__ . "/../storage/");
//开始session会话
session_start();
```

## session 的储存

通常默认情况下使用的是 PHP 内置的 session 管理，将 session 以文件方式储存在服务器中。但是也可以根据自己的需求实现特定的 session 储存方式以替代原设方法，以改进其不足。一般有以下储存方案：

1.  自定义文件系统方式储存
2.  储存在关系型数据库中如 MySQL
3.  储存在告诉缓存中如 redis
4.  以加密的方式储存在 Cookie 中

## 路由

为了得到一个完整的用户登陆实例，需要实现以下最基本的路由

1.  `GET /`，首页
2.  `GET /login`，显示登陆页面
3.  `GET /register`，显示注册页面
4.  `POST /login`，处理登陆请求
5.  `POST /register`，处理登陆请求
6.  `GET /home`，用户登陆后也访问的主页
7.  `POST /logout`，注销登陆

```php
$app->get('/', function (Request $request, Response $response, array $args) {
    return $this->renderer->render($response, 'index.phtml', $args);
});
$app->get('/login', '\App\Controllers\LoginController:showLoginForm');
$app->get('/register','\App\Controllers\RegisterController:showRegisterForm');
$app->post('/register','\App\Controllers\RegisterController:handleRegister');
$app->post('/login', '\App\Controllers\LoginController:handleLogin');
$app->post('/logout', '\App\Controllers\LoginController:logout');
$app->get('/home', '\App\Controllers\HomeController:index');
```

## 登陆

`LoginController`控制器定义两个方法，处理两个请求，一个是`showLoginForm()`，处理 GET 请求以渲染登陆页面返回给客户端，一个是`handleLogin`处理登陆表单提交的 POST 请求

### 视图

```html
<form action="/login" method="post">
    Email:<input type="email" name="email" /> Password:<input type="password" name="password" />
    <button type="submit">Login</button>
</form>
```

### 控制

方法`handleLogin`首先解析提交过来的表单，然后在数据库中查询提交的 email 用户是否存在，若不存在跳转到登陆界面，若存在则将查询到的用户实例的密码与用户提交的密码使用`password_verify`方法进行检验，密码错误跳转到登陆界面，密码正确则使用内置的魔术变量`$_SESSION`**写入 session**，保存内容为用户信息，之后跳转到用户主页。

```php
//show login form
public function showLoginForm(Request $request, Response $response)
{
    return $this->container->view->render($response, 'login.twig');
}

//handle login request
public function handleLogin(Request $request, Response $response)
{
    //get post data from request
    $body = $request->getParsedBody();
    //check is user exists
    $user=User::where('email', $body['email'])->first();
    if (!$user) {
        return $response->withRedirect('/login', 301);
    }
    //check if password is correct
    if (!password_verify($body['password'], $user->password)) {
        //wrong password
        return $response->withRedirect('/login', 301);
    }
    //login succcessfully, redirect to home page
    $_SESSION = array();
    $_SESSION['user_id'] = $user->id;
    $_SESSION['user_name'] = $user->name;
    $_SESSION['user_email'] = $user->email;
    $_SESSION['user_logged_in'] = true;
    return $response->withRedirect('/home', 301);
}
```

## 注册

与`LoginController`类似，同样处理两个方法，一个是返回注册表单，一个是处理注册请求

### 视图

```html
<form action="/register" method="post">
    Email:<input type="email" name="email" /> Name:<input type="text" name="email" /> Password:<input
        type="password"
        name="password"
    />
    Confirm Password:<input type="password" name="password_confirmation" />
    <button type="submit">Register</button>
</form>
```

### 控制

首先需要验证用户提交过来的注册表单：

1.  提交表单的各项不为空
2.  密码与确认密码是否匹配
3.  提交的 email 是否已经被注册
4.  用户名，密码，长度是否符合要求

为了验证多项要求，定义一个`$pass=true`，每经过一项判断若不符合进入了 if 条件，则将其设置为`false`，最后若其值为`true`表明通过的所有的验证，反之未通过验证，重新返回到注册界面。

验证成功后，在数据库中创建相应的用户数据，并写入 session 表明用户已经登陆，最后跳转到`/home`

```php
public function handleRegister(Request $request, Response $response)
{
    //parse post data
    $body = $request->getParsedBody();
    $pass = true;

    //validate
    if ($body['name'] == '' || $body['email'] == '' || $body['password'] == '' || $body['password_confirmation'] == '') {
        //empty string detected
        $pass = false;
    }
    if ($body['password'] != $body['password_confirmation']) {
        //password not confirmed
        $pass = false;
    } else if (strlen($body['password']) <= 6) {
        //password too short
        $pass = false;
    }
    if (strlen($body['name']) <= 6) {
        //username too short
        $pass = false;
    }
    if (User::where('email', $body['email'])->first()) {
        //email exsited
        $pass = false;
    }

    if (!$pass) {
        return $response->withRedirect('/register', 301);
    }

    //save user data into database
    $newUser = User::create([
        "email" => $body['email'],
        "name" => $body['name'],
        "password" => password_hash($body['password'], PASSWORD_BCRYPT)
    ]);

    //insert successfull, login automatically and redirect to home
    session_regenerate_id(true);
    $_SESSION = array();
    $_SESSION['user_id'] = $newUser->id;
    $_SESSION['user_name'] = $newUser->name;
    $_SESSION['user_email'] = $newUser->email;
    $_SESSION['user_logged_in'] = true;

    //redirect
    return $response->withRedirect('/home', 301);
}
```

## Home 个人页面

为了在视图中得到用户的登陆状态，可以将 session 保存为变量在渲染时将其传入，通过`isset($session['user_logged_in'])`可以判断用户是否是已经登陆状态。

但是若用户未登录就访问`/home`呢，可以在`HomeController`中做如下处理：

```php
if (isset($_SESSION['user_logged_in'])) {
    return $this->container->view->render($response, 'home.twig');
} else {
    return $response->withRedirect('/login', 301);
}
```

若在 session 中没有检测到`user_logged_in`这个值，则重定向到登陆表单，否则返回到个人页面

## 注销

通常用户会持有多个账号，这时在切换账号时会使用到注销操作，因此在路由中再定义一个名为`/logout`的 POST 请求以处理注销，在个人页面展示这个表单：

```html
<form action="/logout" method="post">
    <button type="submit">logout</button>
</form>
```

在`LoginController`中新定义 logout 方法，方法中销毁了 session 并重新跳转到了主页：

```php
public function logout(Request $request, Response $response, array $args)
{
    session_destroy();
    return $response->withRedirect('/', 301);
}
```
