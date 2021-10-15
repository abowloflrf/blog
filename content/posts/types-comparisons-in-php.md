---
title: "PHP 中的类型比较"
slug: "types-comparisons-in-php"
tags: ["PHP"]
date: "2018-02-11T17:08:51+08:00"
---

PHP 是一种弱类型语言，即不像强类型的 C/C++一般定义一个变量必须要声明其类型：

```c
int data = 1;
```

PHP 中要定义变量只需要带上一个`$`说明其是一个变量即可：

```php
$data = 1;
```

正因为如此，也造成了弱类型语言的一些麻烦之处，这些尤其表现在 if 逻辑判断地方因为弱类型以及类型比较的理解不足造成了代码逻辑编写缺陷。

PHP 官网文档中就因此给我们提供了类型比较速查表，这篇文章将其摘录整理下来：

## 使用函数进行类型比较

使用 PHP 的内置函数对类型进行比较操作

![php-types-comparisons-1](https://i.loli.net/2021/10/15/WK3YenZMpQGFoVl.jpg)

-   `empty()` 检查一个变量是否为空，变量不存在或值为 FALSE 则被认定为空
-   `is_null()` 检测变量是否为 NULL
-   `isset()` 检测变量是否已设置并且非 NULL
-   `empty()`返回的值与其转化为 boolean 类型表现的值相反
-   `is_null()`返回的值与`isset()`返回的值相反

## 松散比较

使用`==`进行比较操作

![php-types-comparisons-2](![XJSY53wPqmFDbaj](https://i.loli.net/2021/10/15/XJSY53wPqmFDbaj.jpg))

松散比较要尤其注意数值的 0,1,-1，字符串的"0"，"1"，"-1"，NULL，空数组，空字符串这些比较的意义。

## 严格比较

使用`===`进行比较操作

![php-types-comparisons-3](![ykGgUz2JsHm6fIE](https://i.loli.net/2021/10/15/ykGgUz2JsHm6fIE.png))

严格比较最容易理解，不允许类型转换，只有当类型与值完全一样是才返回 true
