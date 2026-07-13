---
title: "Golang Interface 原理"
slug: "go-interface"
tags: ["go"]
pubDatetime: 2021-08-30T11:11:32+08:00
description: ""
draft: true
---

```go
func main() {
	var x interface{} = nil
	var y *int = nil
	interfaceIsNil(x)
	interfaceIsNil(y)
}

func interfaceIsNil(x interface{}) {
	if x == nil {
		fmt.Println("empty interface")
		return
	}
	fmt.Println("non-empty interface")
}

/**
output:
empty interface
non-empty interface
*/
```

## interface 底层结构

Go 中有两种接口，带方法的借口 `iface` 和不带方法的空接口 `eface`

```go
// 非空 interface
type iface struct {
	tab  *itab
	data unsafe.Pointer
}

// 空 interface
type eface struct {
	_type *_type
	data  unsafe.Pointer
}

type itab struct {
	inter *interfacetype
	_type *_type
	hash  uint32 // copy of _type.hash. Used for type switches.
	_     [4]byte
	fun   [1]uintptr // variable sized. fun[0]==0 means _type does not implement inter.
}

```

## 指针和接口

使用接受指针方式定义方法，但使用结构体方式初始化变量时会导致编译报错

因为 Go 中参数传递是传值的，对于以指针方式初始化的结构体调用方法 `&Cat{}`，会发生值拷贝，也就是拷贝一个结构体的指针，编译器会隐式对遍历进行解引用获取指针指向的结构体。

但是对于 `Cat{}` 方式初始化遍历，调用方法时，值拷贝会传递一个全新的 `Cat{}` ，但是方法的参数是 `*Cat` 时，编译器不会创建一个新的指针，就算创建了新的指针，指向的也是全新的复制之后的结构体而不是原来的结构体。

## nil 和 non-nil

`var s *Foo` 初始化结构体，直接使用 `s == nil` 比较得到的是 True，但是若通过 `v interface{}` 参数传递时函数内的 `s == nil` 得到的结果是 False，因为在函数内发生了**隐式的类型转换**， `*Foo` 类型被转换成 `interface{}` 类型。
