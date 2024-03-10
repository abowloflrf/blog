---
author: Ruofeng Lei
slug: design-pattern-proxy
pubDatetime: 2018-02-11T20:06:00.000+08:00
title: 设计模式之代理模式 Proxy
featured: false
draft: false
tags:
  - 设计模式
  - PHP
description: ""
---

代理模式为其他对象提供一种简介访问那个对象方法的接口，让代理对象控制目标对象的访问，并且可以在不改变目标对象的情况下添加一些额外的功能。

## 使用

Image 对象有显示图片的功能，但是我们这里不直接实例化 Image 对象并调用其方法，而是使用**ProxyImage**来间接显示图片

## 代码实现

RealImage 类自身可以 display

```php
class RealImage implements ImageInterface
{
    private $file;
    public function __construct($fileName)
    {
        $this->file = $fileName;
    }
    public function display()
    {
        echo "Displaying: " . $this->file . "\n";
    }
}
```

创建一个代理类，使用的**display**它来访问图片，其方法内部通过参数实例化了一个 RealImage 类，也是调用了这个方法。

```php
class ProxyImage implements ImageInterface
{
    private $file;
    private $image;
    public function __construct($fileName)
    {
        $this->file = $fileName;
    }
    public function display()
    {
        if ($this->image == null) {
            $this->image = new RealImage($this->file);
        }
        $this->image->display();
    }
}
```

## 测试

直接将图片路径作为参数传递给这个代理类来实例化。并通过代理类来执行 display 方法以显示图片。

```php
$image=new ProxyImage("dog.jpg");
$image->display();
```
