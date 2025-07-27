---
title: "PHP7 的部分新特性"
slug: "some-new-features-in-php7"
tags: ["PHP"]
pubDatetime: 2018-03-08T17:04:16+08:00
description: ""
---

## PHP 7.0

[http://php.net/manual/zh/migration70.new-features.php](http://php.net/manual/zh/migration70.new-features.php)

### 参数类型声明

```php
function sumOfInts(int ...$ints)
{
    return array_sum($ints);
}
```

函数到参数可以强制定义为以下类型：

- string
- int
- float
- bool

在 PHP5 中可使用：

- class
- array
- interface
- callable

### 返回值类型声明

```php
function arraysSum(array ...$arrays): array
{
    return array_map(function(array $array): int {
        return array_sum($array);
    }, $arrays);
}
```

### null 运算符

解决了三元运算符+isset()的麻烦

```php
//下面两个语句有同等效果
$username = $_GET['user'] ?? 'nobody';
$username = isset($_GET['user']) ? $_GET['user'] : 'nobody';
//还可以使用多个??来向后匹配
$username = $_GET['user'] ?? $_POST['user'] ?? 'nobody';
```

### 组合比较符

`<=>` 用于比较两个表达式，当左边分别小于、等于、大于时分别返回-1，0，1

```php
// 整数
echo 1 <=> 1; // 0
echo 1 <=> 2; // -1
echo 2 <=> 1; // 1

// 浮点数
echo 1.5 <=> 1.5; // 0
echo 1.5 <=> 2.5; // -1
echo 2.5 <=> 1.5; // 1

// 字符串
echo "a" <=> "a"; // 0
echo "a" <=> "b"; // -1
echo "b" <=> "a"; // 1
```

### `define()` 定义常量数组

在 PHP 5.6 中仅可使用 `const`

```php
define('ANIMALS', [
    'dog',
    'cat',
    'bird'
]);
```

### 匿名类

用于临时构建类

```php
new class{
    $foo="bar";
}
```

### 组合 use

```php
use some\namespace\{ClassA, ClassB, ClassC as C};
use function some\namespace\{fn_a, fn_b, fn_c};
use const some\namespace\{ConstA, ConstB, ConstC};
```

## PHP 7.1

[https://secure.php.net/manual/zh/migration71.new-features.php](https://secure.php.net/manual/zh/migration71.new-features.php)

### 可为空类型

在参数和返回值指定类型前加上 `?` 表明可为 `null`

```php
function testReturn(): ?string
{
    return null;
}


function test(?string $name)
{
    var_dump($name);
}
```

### void 函数

使用 void 函数时，函数内部要么不出现 return，要么只使用 `return;`

```php
function swap(&$left, &$right) : void
{
    if ($left === $right) {
        return;
    }

    $tmp = $left;
    $left = $right;
    $right = $tmp;
}
```

### 为常量设置访问控制

```php
class ConstDemo
{
    const PUBLIC_CONST_A = 1;
    public const PUBLIC_CONST_B = 2;
    protected const PROTECTED_CONST = 3;
    private const PRIVATE_CONST = 4;
}
```

### 负数的字符串偏移量

数组下标还不能指定为负数

```php
var_dump("abcdef"[-2]);
var_dump(strpos("aabbcc", "b", -3));
//string (1) "e"
//int(3)
```

## PHP 7.2

[https://secure.php.net/manual/zh/migration72.new-features.php](https://secure.php.net/manual/zh/migration72.new-features.php)

### object 类型

```php
function test(object $obj) : object
{
    return new SplQueue();
}

test(new StdClass());
```

### 抽象方法的重写

一个抽象类继承另一个抽象类时，子抽象类可以重写父抽象类中的方法

```php
abstract class A
{
    abstract function test(string $s);
}
abstract class B extends A
{
    // overridden
    abstract function test($s) : int;
}
```

### Argon2 算法生成密码 hash

Argon2 算法被认为是优于目前默认密码 hash 算法 bcrypt

```php
password_hash('rasmuslerdorf', PASSWORD_ARGON2I);
```

### 允许命名空间分组末尾使用逗号

```php
use Foo\Bar\{
    Foo,
    Bar,
    Baz,
};
```
