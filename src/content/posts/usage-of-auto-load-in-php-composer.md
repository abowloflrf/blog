---
title: "PHP Composer 中 auto-load 的使用"
slug: "usage-of-auto-load-in-php-composer"
tags: ["PHP"]
pubDatetime: 2018-02-06T16:47:27+08:00
description: ""
---

当我们在进行现代化 PHP 项目的开发时，一定会使用到复杂的`class`与`namespace`的代码结构。而在一个文件中使用另一个文件的`class`、`interface`、或`trait`时，最原始的方法就是使用`require`方法引入一个指定目录的 PHP 文件从而使用这个文件中相应的定义。但是这样一来那么多文件有太多复杂的相互代码依赖，在每个文件中手动处理这些代码依赖实在不是一个好办法。这篇文章就介绍了`composer`工具中为开发者提供的`auto-load`功能。

## 使用情景

我最近在使用 PHP 学习设计模式，会涉及到一些类的相互复用依赖等，同时有需要编写一些测试用例，为了优雅的解决这一系列问题，我在这里使用了`composer`，如下是一些简单的代码目录结构，`FactoryMethod`目录是编写工厂方法模式代码的目录，其中`CarA.php`,`CarB.php`，是两种 Car 的类定义，其实现了`CarInterface.php`中定义的接口，`CarFactory.php`是 Car 工厂类的定义，其实现了`FactoryInterface.php`中定义的工厂类接口，`Test.php`是我用于测试的类。

```
src
├───BehavioralPatterns
├───CreationalPatterns
│   ├───FactoryMethod
│   │       CarA.php
│   │       CarB.php
│   │       CarFactory.php
│   │       CarInterface.php
│   │       FactoryInterface.php
│   │       README.md
│   │       Test.php
│   │
│   └───Singleton
│           README.md
│           Singleton.php
│           Test.php
│
└───StructuralPatterns
```

若不使用`autoloader`，我就必须要

- 在`CarA.php`,`CarB.php`中包含`CarInterface.php`以实现接口
- 在`CarFacory.php`中包含`FactoryInterface.php`以实现接口
- 在`CarFacory.php`中包含`CarA.php`与`CarB.php`以生产相应的 Car
- 在`Test.php`中包含`CarFactory.php`以实例化工厂来进行测试

进行这些操作才联动这些文件来跑动我的测试用例。很明显这样是不合理的。下面我们开始使用`composer`解决这个问题

## composer.json

首先在项目的根目录新建一个`composer.json`文件约定一些配置，完整文件内容如下。

```json
{
  "autoload": {
    "psr-4": { "DesignPattern\\": "src/" }
  }
}
```

这里我们不加载第三方库等操作，只需要他的`autoload`功能即可，在其中定义了

```
"psr-4": { "DesignPattern\\": "src/" }
```

意思是加载了根目录下`src`目录中，根`namespace`为`DesginPattern`的，且符合`psr-4`自动加载标准的类定义。

`psr-4`是一个关于自动加载的标准，`composer`中可以使用：

- `psr-0`，自动加载的旧标准，已被`psr-4`替代
- `PSR-4`，自动加载标准，**推荐使用此项**
- `classmap`，会检查指定目录下所有文件并加载其中的类
- `files`，加载指定文件的类

关于`psr-4`标准的详细定义可以在这里查看[PSR-4](https://www.php-fig.org/psr/psr-4/)，里面描述了一些`class`与`namespace`还有文件目录的一些定义标准，如何编写才能被自动加载，内容不多，可以仔细看看。

关于`composer`中自动加载的详细指南可以参考 Composer 的官方文档[Composer Autoload](https://getcomposer.org/doc/04-schema.md#autoload)

## 执行自动加载

在执行时首先确保两点：

1. 所编写的代码已经满足`psr-4`标准
2. `composer.json`中的设置满足编写的代码运行需要

然后在控制台包含有`composer.json`根目录中执行

```
composer dump-autoload
```

会发现根目录生成了一个`vendor`文件夹，文件夹下有`autoload.php`以及一些其他自动生成的文件。我们主要关注的是`autoload.php`文件。

## 实际使用

要体验到自动加载的好处，要在我们项目的入口文件中包含这个`autoload.php`，之后的所有代码中都可以根据相应的命名空间来引入所需要使用的类。例如我的需要测试我上面编写的工厂方法模式，我的测试类已如下写好：

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

class Test
{
    public function run()
    {
        $factory = new CarFactory();
        $car_a = $factory->produce('A');
        $car_b = $factory->produce('B');

        echo $car_a->getType() . "\n";
        echo $car_b->getType() . "\n";
    }
}
```

那么在根目录的入口文件`app.php`中可以如下使用：

```php
<?php
require __DIR__ . '/vendor/autoload.php';

$test =new DesignPattern\CreationalPatterns\FactoryMethod\Test;
$test->run();
```

不需要关系复杂的依赖关系，只要在实例化类时，确定好正确的命名空间关系，就能很舒服得跑动这个测试用例了。

> 在文件结构更改时，需要再次执行`composer dump-autoload`命令
