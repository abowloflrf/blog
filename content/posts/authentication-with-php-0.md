---
title: "PHP 实现账号登陆认证 0 - 开始使用 Slim"
slug: "authentication-with-php-0"
tags: ["PHP"]
date: "2018-03-03T10:52:57+08:00"
---

# 0-开始使用 Slim

为何使用 Slim 而不去使用众多流行使用广泛的 PHP 框架例如 Laravel 等等？因为目的是学习，而不是快速开发完成一个产品，学习的目的是了解某个功能在 PHP 代码中具体是怎样实现的，若使用 Laravel，其功能繁多，封装程度极高，以及框架中许多方便开发者使用的语义化方法、类等，都不利于我们学习基础知识。而使用 Slim，其只实现了基本的 router，request，response，dependency container 等等一些最最基本的功能，我们可以使用这个简单的骨架为基础开发扩展实现自己所需要的应用。

## 上手 Slim Framework

首先使用`composer`创建

```
composer create-project slim/slim-skeleton php auth
```

进入目录会发现生成了如下文件结构

```
.
├── public
│   └── index.php
├── src
│   ├── dependencies.php
│   ├── middleware.php
│   ├── routes.php
│   ├── settings.php
└── templates
    └── index.phtml
```

`public/index.php`为入口文件，所有的请求都会从此进入；`src`目录为项目代码的核心部分，绝大部分工作代码编写在此完成；`templates`为模板目录编写视图。首先看看`public/index.php`的内容：

```php
<?php
if (PHP_SAPI == 'cli-server') {
    // 在使用PHP内置的cli-server时检查请求是否为静态文件
    $url  = parse_url($_SERVER['REQUEST_URI']);
    $file = __DIR__ . $url['path'];
    if (is_file($file)) {
        return false;
    }
}
// 加载composer autoload
require __DIR__ . '/../vendor/autoload.php';
// 开始session（session是用户认证的关键）
session_start();
// 使用`src/settings.php`的配置文件实例化Slim app
$settings = require __DIR__ . '/../src/settings.php';
$app = new \Slim\App($settings);
// 加载dependencies
require __DIR__ . '/../src/dependencies.php';
// 注册中间件
require __DIR__ . '/../src/middleware.php';
// 注册路由
require __DIR__ . '/../src/routes.php';
// 运行
$app->run();
```

运行命令，指定从`public`目录启动服务器：

```
php -S localhost:8080 -t public
```

浏览器访问`localhost:8080`可以得到默认的模板文件`index.phtml`的内容。

## 使用路由 router

不同 URI 的请求是通过`routes.php`中定义的路由所控制的，默认生成如下：

```php
$app->get('/[{name}]', function (Request $request, Response $response, array $args) {
    // 日志记录
    $this->logger->info("Slim-Skeleton '/' route");
    // 渲染视图
    return $this->renderer->render($response, 'index.phtml', $args);
});
```

这里定义了一个 GET 请求的路由，所匹配为动态路由，`{name}`为定义的参数，例如访问`localhost:8080/hello`那么这个**hello**会作为参数传入，并在`index.phtml`模板中使用`$name`访问这个值

## 使用控制器 controller

我们不可能将所有的匹配到路由后的处理逻辑都写在这个路由定义文件中，因此一般的做法是使用**控制器 Controller**，在`src/`目录下新建一个`Controller`目录，新建`HomeController.php`，并在新建的控制器类中新建一个方法以处理路由匹配到后要作如何处理。为了在每个控制器中都能够访问到 container，可以定义一个 BaseController，编写构造函数传入 container：

```php
<?php
namespace App\Controller;

use Slim\Container;

class Controller
{
    protected $container;
    public function __construct(Container $c)
    {
        $this->container = $c;
    }
}
```

然后定义自己的 Controller 继承这个 BaseController

```php
<?php
namespace App\Controller;

use Slim\Http\Request;
use Slim\Http\Response;

class HomeController extends Controller
{
    public function index(Request $request, Response $response)
    {
        return $this->container->renderer->render($response, 'home.phtml', $args);
    }
}
```

然后在`routes.php`中修改为：

```php
$app->get('/home', '\App\Controller\HomeController:index');
```

此时并不能运行起来，因为新建的目录和类并没有被自动加载，若运行会提示找不到这个类。因此在`composer.php`中添加一项：

```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
}
```

意味 composer 会自动注册`src`目录下符合 psr-4 标准的`App\`命名空间下的类，接着运行

```
composer dump-autoload
```

就可以正常运行了
