---
author: Ruofeng Lei
slug: design-pattern-factory-method
pubDatetime: 2018-02-07T00:33:08.000+08:00
modDatetime:
title: 设计模式之工厂方法模式 Factory Method
featured: false
draft: false
tags:
  - 设计模式
  - PHP
description: ""
---

当多个类的定义类似，都有一定的方法需要实现，而其本身之间又有些许区别时，其实例化的操作可以不用**直接**实例化类本身，而将这个实例化的过程交给另一个部分去操作，即其**工厂**中去实现。

## 实现思路

定义一个创建对象的**接口**，让实现这个接口的类来决定实例化哪个类。工厂方法让类的实例化推迟到子类中进行。

## 工厂 Fatory

在创建型模式中常常会遇到**工厂**这个词，在设计模式中，工厂通常指的是**用于创建其他对象的对象**，以用于实现不同的创建方案。

工厂对象通常包含一个或多个方法，用来创建这个工厂所能创建的各种类型的对象。这些方法可能接收参数，用来指定对象创建的方式，最后返回创建的对象。

## 代码实现

在本例中我们使用工厂方法模式定义 CarFactory 来制造不同的 Car，分别是 CarA 与 CarB。

### 定义工厂接口

工厂类中有`produce`方法来产生实例化的类，传入的参数`type`用于执行实例化哪种类

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

interface FactoryInterface
{
    //定义工厂接口的 produce 方法用于实例化类
    public function produce($type);
}
```

### 定义工厂

工厂类根据传入的不同参数在`produce`方法中指定逻辑来实例化不同的 Car，参数无效时抛出错误

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

class CarFactory implements FactoryInterface
{
    //CarFactory 类实现了 Factory 结构中的 produce 方法生产实例化 Car
    public function produce($type = '')
    {
        switch ($type) {
            case 'A':
                return new CarA();
                break;
            case 'B':
                return new CarB();
                break;
            default:
                echo "Type not support\n";
                break;
        }
    }
}
```

### Car 类的定义

不同的 Car 根据面向对象的设计也分别实现了统一的 Car 接口，它们都实现了**getType**方法以返回自身的类型

`CarInterface.php`

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

interface CarInterface
{
    //定义了 Car 的接口，每种 Car 必须要实现 getType() 方法以获取其类型
    public function getType();
}
```

`CarA.php`

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

class CarA implements CarInterface
{
    private $type = "Type A";
    public function getType()
    {
        return $this->type;
    }
}
```

`CarB.php`

```php
<?php
namespace DesignPattern\CreationalPatterns\FactoryMethod;

class CarB implements CarInterface
{
    private $type = "Type B";
    public function getType()
    {
        return $this->type;
    }
}
```

## 测试

在需要不同的 Car 时，我们只需要实例化一个 CarFactory，然后调用其 produce 方法，通过传入不同的参数来得到指定类型的实例。

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
