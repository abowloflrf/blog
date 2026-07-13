---
author: Ruofeng Lei
pubDatetime: 2018-02-01T23:52:01.000+08:00
modDatetime:
title: PHP 中的引用
slug: reference-in-php
featured: false
draft: false
tags:
  - PHP
description: ""
---

可以很容易地通过在 $value 之前加上 & 来修改数组的元素。此方法将以引用赋值而不是拷贝一个值。

```php
<?php
$arr = array(1, 2, 3, 4);
foreach ($arr as &$value) {
    $value = $value * 2;
}
// $arr is now array(2, 4, 6, 8)
unset($value); // 最后取消掉引用
?>
```

> 数组最后一个元素的 $value 引用在 foreach 循环之后仍会保留。建议使用 unset() 来将其销毁。
