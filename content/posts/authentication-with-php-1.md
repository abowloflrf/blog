---
title: "PHP 实现账号登陆认证 1 - 使用 Eloquent ORM 与 Twig"
slug: "authentication-with-php-1"
tags: ["PHP"]
date: "2018-03-03T11:52:57+08:00"
---

为了方便后面的开发，以及减少一些不必要的麻烦，我们集成两个实用的组件，分别是**Eloquent ORM**与**Twig**，作用分别是方便访问数据库与视图模板编写。使用过 Laravel 的朋友应该对 Eloquent ORM 十分熟悉，使用起来也是十分方便的。接下来在 Slim 中集成 Laravel 的 Eloquent ORM 来访问数据库，以及 Twig 模板扩展。

其中我使用的 User 表如下：

```sql
CREATE TABLE `users` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL,
	`email` VARCHAR(255) NOT NULL,
	`password` VARCHAR(255) NOT NULL,
	`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `users_email_unique` (`email`)
);
```

## 安装 Eloquent ORM

其实 Slim 官方文档中有一篇来告诉如何在 Slim 中使用 Eloquent：

[Using Eloquent with Slim](https://www.slimframework.com/docs/v3/cookbook/database-eloquent.html)

这里也做简单的说明，首先使用 composer 安装依赖：

```
composer require illuminate/database
```

接着在`settings.php`添加数据库配置，根据自己环境的数据库信息添加如下一个数组：

```php
'db' => [
    'driver' => 'mysql',
    'host' => 'localhost',
    'database' => 'auth',
    'username' => 'homestead',
    'password' => 'secret',
    'charset' => 'utf8',
    'collation' => 'utf8_unicode_ci',
]
```

然后在`dependencies.php`中为 Slim 框架加载这个依赖：

```php
$capsule = new \Illuminate\Database\Capsule\Manager;
$capsule->addConnection($container['settings']['db']);
$capsule->setAsGlobal();
$capsule->bootEloquent();
$container['db'] = function ($container) {
    return $capsule;
};
```

依赖就这样被注入到了 Container 容易中，在应用的其他地方便可以通过`$app->getContainer()['db']`得到实例，但是如此我们只能够通过其 Query Builder 来进行数据库相关操作而不能使用对象映射。为了使用 ORM，在`src`目录下新建`Models`目录以存放模型，新建`User.php`User 模型，User 类只需要继承`Illuminate\Database\Eloquent\Model`，在类中进行相关的参数填写，即可以在控制器中使用`App\Models\User`就可以像在 Laravel 中那样方便地操作，如`User::where('email','user@example.com')->first()`：

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';
    protected $fillable = ['name', 'email', 'password'];
}
```

## 安装 Twig

Twig 是一个在 PHP 中被广泛使用的模板引擎，Slim 也编写了官方扩展以在 Slim 中使用 Twig 模板：

```
composer require slim/twig-view
```

在`settings.php`中写入 twig 配置，分别是`.twig`后缀名的模板文件存放目录与模板缓存目录：

```php
'twig' => [
    'template_path' => __DIR__ . '/../templates/',
    'cache_path' => __DIR__ . '/../storage/view/'
]
```

在`dependencies.php`中添加：

```php
$container['view'] = function ($c) {
    //加载设置
    $settings = $c->get('settings')['twig'];
    //由于不是什么大型应用，将缓存关闭
    $view = new \Slim\Views\Twig($settings['template_path'], [
        'cache' => false
    ]);

    //下面两行是为Twig添加扩展，以在Twig模板中方便生成URI
    $basePath = rtrim(str_ireplace('index.php', '', $c['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension($c['router'], $basePath));

    return $view;
};
```

之后可以执行`composer remove slim/php-view`移除掉使用原始 php-view 的依赖，并在`dependencies.php`从容器中移除相关依赖。

现在可以在控制器中使用如下方法返回一个视图：

```php
return $this->container->view->render($response, 'home.twig');
```
