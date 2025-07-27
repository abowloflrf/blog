---
title: "一段程序了解 PHP 中的引用"
slug: "know-about-references-in-php-with-a-small-piece-of-code"
tags: ["PHP"]
pubDatetime: 2018-03-07T17:03:16+08:00
description: ""
---

PHP 中的引用类似于指针，引用是不同变量名对实际上内存中同一个变量的表示。对象默认是通过引用传递的，而其他变量是传值，相当于内存中又复制了一份。

```php
//定义一个类，内有共有属性$foo=1
class A
{
    public $foo = 1;
}

//使用变量名传递类
$a = new A;
$b = $a;
$b->foo = 2;
echo "A:" . $a->foo . "\n"; //2
echo "B:" . $b->foo . "\n"; //2

//使用引用传递类
$c = new A;
$d = &$c;
$d->foo = 2;
echo "C:" . $c->foo . "\n"; //2
echo "D:" . $d->foo . "\n"; //2

//在函数中使用变量名传递类
$e = new A;
function foo($obj)
{
    $obj->foo = 2;
}
foo($e);
echo "E:" . $e->foo . "\n"; //2

//在函数中使用引用传递类
$f = new A;
function bar(&$obj)
{
    $obj->foo = 2;
}
bar($f);
echo "F:" . $f->foo . "\n"; //2

//在函数中使用变量名传递变量
$var_a = 1;
function var_foo($v)
{
    $v = 2;
}
var_foo($var_a);
echo "var_a:$var_a\n";  //1

//在函数中使用引用传递变量
$var_b = 1;
function var_bar(&$v)
{
    $v = 2;
}
var_bar($var_b);
echo "var_b:$var_b\n";  //2

//使用变量名传递变量
$var_c = 1;
$var_d = $var_c;
$var_d = 2;
echo "var_c:$var_c\n";  //1
var_dump($var_c === $var_d);    //false

//使用引用传递变量
$var_e = 1;
$var_f = &$var_e;
$var_f = 2;
echo "var_e:$var_e\n";  //2
var_dump($var_e === $var_f);    //true
```
