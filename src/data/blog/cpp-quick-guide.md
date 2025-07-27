---
title: "C++ 刷题指南"
slug: "cpp-quick-guide"
tags: ["c_cpp", "algorithm"]
pubDatetime: 2021-09-03T16:49:33+08:00
description: ""
draft: true
---

## 基本数据结构

### 链表节点 `ListNode`

```c++
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
```

### 二叉树节点 `TreeNode`

```c++
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
```

## 图节点 TODO

## 标准库容器

### `vector`

```c++
// 一维 vector 初始化
vector<int> v1(10, 0);

// 二维 vector 初始化
vector<vector<int>> v1(10, vector<int>(10, 0));
auto v2 = vector<vector<int>>(10, vector<int>{});
```

### `list` 双向链表

```c++
// 创建含整数的 list
std::list<int> l = { 7, 5, 16, 8 };

// 添加整数到 list 开头
l.push_front(25);
// 添加整数到 list 结尾
l.push_back(13);

// 以搜索插入 16 前的值
auto it = std::find(l.begin(), l.end(), 16);
if (it != l.end()) {
    l.insert(it, 42);
}
```

## 字符串

- `s.substr(pos, len)` 包括 `pos` 的后面长度 `len` 的字符串
- `to_string` 数字转为字符串
- `stoi` 字符串转为 int

## 其他

### pair

```c++
std::pair<int, int> p1 = std::make_pair(1,2);
```

### iterator

### greater / less

greater 和 less 定义在标准库头文件 `<functional>` 中，一般用于：

- 大/小根堆 `priority_queue` 的初始化
- 排序方法 `sort` 中使用

**排序**

- `less<T>` 变成升序（从左到右遍历下标时，数组元素是从小到大）
- `greater<T>` 变成降序（从左到右遍历下标时，数组元素是从大到小）

**建堆**

- `less<T>` 变成大顶堆（从上层到下层，堆元素是从大到小，同层之间随便）（默认）
- `greater<T>` 变成小顶堆（从上层到下层，堆元素是从小到大，同层之间随便）
-

### lambda

### 自定义排序函数

```c++
sort(v.begin(), v.end(), less<int>());     // 默认，从小到大
sort(v.begin(), v.end(), greater<int>());  // 从大到小

// 定义 cmp 函数， bool cmp(const Type1 &a, const Type2 &b);
// 若第一参数小于（即先序于）第二参数则返回 ​true
bool customSort(const Custom &a, const Custom &b)
{
    return value1 < b.value1 && a.value2 < b.value2;
}
sort(v.begin(), v.end(), customSort);

// lambda 函数
sort(s.begin(), s.end(), [](int a, int b) {
    return b < a;
});

// < 操作符重载
```
