---
title: "The Go Memory Model (翻译)"
slug: "the-go-memory-model"
tags: ["go"]
pubDatetime: 2021-08-24T14:06:58+08:00
description: ""
draft: true
---

- [The Go Memory Model](https://golang.org/ref/mem)
- [Updating the Go Memory Model - Russ Cox ](https://research.swtch.com/gomm)

---

- [介绍](#介绍)
- [一些建议](#一些建议)
- [Happens Before](#happens-before)
- [同步](#同步)
  - [初始化](#初始化)
  - [Goroutine 的创建](#goroutine-的创建)
  - [Goroutine 的销毁](#goroutine-的销毁)
  - [Channel 通信](#channel-通信)
  - [锁](#锁)
  - [`Once`](#once)
- [错误的同步](#错误的同步)

## 介绍

Go 的内存模型确定了在什么场景下，一个 goroutine 对一个变量进行写操作的时候，另一个 goroutine 能够保证能够读到同一个变量。

## 一些建议

程序使用多个 goroutine 同时修改一块数据的操作必须要保证是串行的。

为了使这种访问串行化，可以使用 channel 或其他的同步原语例如标准库中的 `sync` 和 `sync/atomic` 包来保护数据。

> If you must read the rest of this document to understand the behavior of your program, you are being too clever.
>
> Don't be clever.

## Happens Before

## 同步

### 初始化

程序在最初运行时启动一个 goroutine ，但是这个 gourotine 后面可能会创建一些可能并发运行的其他 gourotine

_当包 `p` 在 import 包 `q` 时，被引用的 `q` 的 `init` 函数会先执行，然后再执行 `p` 的 `init` 函数。_

_`main.main` 入口函数在所有的 `init` 函数执行完毕后开始执行。_

### Goroutine 的创建

使用 `go` 启动一个新的 goroutine 发生在这个 goroutine 的执行函数结束之前，例如：

```go
var a string

func f() {
	print(a)
}

func hello() {
	a = "hello, world"
	go f()
}
```

调用 `hello` 会在未来的某时间点输出 `"hello, world"`（可能在 `hello` return 之后）

### Goroutine 的销毁

goroutine 的退出不被保证发生在程序的任何事件之前，例如：

```go
var a string

func hello() {
	go func() { a = "hello" }()
	print(a)
}
```

对变量 `a` 的赋值并没有遵循任何同步事件，因此它并不被保证能被其他 goroutine 察觉到。实际上，正因为这个不保证，一些激进的编译器甚至会直接删掉整个 `go` 语句。

若想要程序的其他 goroutine 必须能观察到这一变化，则需要使用 **lock** 或 **channel 通信** 等同步机制来简历一个相关性顺序。

### Channel 通信

Channel 通信是 goroutine 之间的主要同步机制。向指定 channel 发送的信息会在这个 channel 接受到相应的响应，通常在另一个 goroutine 中接受。

_向一个 channel 发送一条信息发生在这个 channel 收到响应完成之前_

```go
var c = make(chan int, 10)
var a string

func f() {
	a = "hello, world"
	c <- 0
}

func main() {
	go f()
	<-c
	print(a)
}
```

该段程序保证能够输出 `"hello, world"`。向变量 `a` 赋值发生在 向 channel `c` 发送数据之前，同时这两个时间也发生在 `c` 接收到对应的响应之前，同时也发生在 `print` 之前。

### 锁

### `Once`

`sync` 包中的 `Once` 提供了一个用于多 goroutine 进行安全初始化现场的机制。多个线程能够使用 `once.Do(f)` 来执行函数 `f`，但是只有一个能够成功执行 `f()`，其他调用者会一直阻塞直到第一个 `f()` 执行完成并返回。

_一次 `once.Do(f)` 中调用的 `f()` 会在任意调用 `once.Do(f)` 之前返回。_

```go
var a string
var once sync.Once

func setup() {
	a = "hello, world"
}

func doprint() {
	once.Do(setup)
	print(a)
}

func twoprint() {
	go doprint()
	go doprint()
}
```

在这个例子中，两次 `doprint` 调用，但是 `setup` 仅会执行一次，这次 `setup` 调用会在其他任意的 `print` 方法前执行完毕。执行结果是 `"hello, world"` 会被打印输出两次。

## 错误的同步
