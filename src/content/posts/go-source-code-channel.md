---
title: "Golang Channel 原理"
slug: "go-source-code-channel"
tags: ["go"]
pubDatetime: 2021-08-05T00:33:10+08:00
description: ""
draft: true
---

参考：https://draveness.me/golang/docs/part3-runtime/ch06-concurrency/golang-channel/

源码位置 `src/runtime/chan.go`，主要结构 `hchan` `waitq`

```go
type hchan struct {
	qcount   uint           // total data in the queue
	dataqsiz uint           // size of the circular queue
	buf      unsafe.Pointer // points to an array of dataqsiz elements
	elemsize uint16
	closed   uint32
	elemtype *_type // element type

	sendx    uint   // send index
	recvx    uint   // receive index
	recvq    waitq  // list of recv waiters
	sendq    waitq  // list of send waiters

	// lock protects all fields in hchan, as well as several
	// fields in sudogs blocked on this channel.
	//
	// Do not change another G's status while holding this lock
	// (in particular, do not ready a G), as this can deadlock
	// with stack shrinking.
	lock mutex
}

type waitq struct {
	first *sudog
	last  *sudog
}
```

`sudug` 表示一个在等待列表中的 goroutine，该结构中存储了两个分别只想前后 `sudog` 的指针构成双向链表

## 创建 Channel

创建 channel 的函数位于 `runtime.makechan`

```go
func makechan(t *chantype, size int) *hchan {
	// 计算缓冲区应该分配多少内存
	mem, overflow := math.MulUintptr(elem.size, uintptr(size))
	if overflow || mem > maxAlloc-hchanSize || size < 0 {
		panic(plainError("makechan: size out of range"))
	}

	var c *hchan
	// 三种情况
	// 缓冲区为0：		 c = (*hchan)(mallocgc(hchanSize, nil, true))
	// 				   c.buf = c.raceaddr()
	// 元素不包含指针：	  c = (*hchan)(mallocgc(hchanSize+mem, nil, true))
	// 				   c.buf = add(unsafe.Pointer(c), hchanSize)
	// 默认：			c = new(hchan)
	// 				   c.buf = mallocgc(mem, elem, true)
	switch {
	case mem == 0:
		// 缓冲区为空，仅为 hchanSize 分配内存空间
		// Queue or element size is zero.
		c = (*hchan)(mallocgc(hchanSize, nil, true))
		// Race detector uses this location for synchronization.
		c.buf = c.raceaddr()
	case elem.ptrdata == 0:
		// 元素为非指针类型，
		// Elements do not contain pointers.
		// Allocate hchan and buf in one call.
		c = (*hchan)(mallocgc(hchanSize+mem, nil, true))
		c.buf = add(unsafe.Pointer(c), hchanSize)
	default:
		// Elements contain pointers.
		c = new(hchan)
		c.buf = mallocgc(mem, elem, true)
	}

	c.elemsize = uint16(elem.size)
	c.elemtype = elem
	c.dataqsiz = uint(size)
	lockInit(&c.lock, lockRankHchan)
	return c
}
```

初始化主要分为三种情况：

- 无缓冲区：仅为 hchan 分配 hchanSize 固定长度的空间
- channel 类型为非指针类型：分配 hchanSize + mem 长度的空间，mem 为上面计算的缓冲区大小
- 默认：单独为 hchan 和缓冲区分配内存

## 发送数据

向 channel 发送数据代码源码位于 `runtime.chansend`，其中发送也分为多种情况，会依次判断

### 直接发送

当能够从该 channel 的等待接受队列中拿到 goroutine 时，直接将从 `recvq` 中使用 `dequeue` 取出最先陷入等待的 goroutine 并直接将数据发送给它。

```go
if sg := c.recvq.dequeue(); sg != nil {
	send(c, sg, ep, func() { unlock(&c.lock) }, 3)
	return true
}
```

直接传递数据的方法如下，`sendDirect` 中就是使用 `memmove` 将数据直接拷贝到 `x = <-c` 中的 `x` 所在内存地址上，然后使用 `goready` 将等待方接收数据的 goroutine 标记为 `_Grunnable` 状态，并放到接收方所在 P 的 `runnext` 上等待执行。

```go
func send(c *hchan, sg *sudog, ep unsafe.Pointer, unlockf func(), skip int) {
	if sg.elem != nil {
		// memmove 直接拷贝数据到 x = <-c 的 x 所在内存地址上
		sendDirect(c.elemtype, sg, ep)
		sg.elem = nil
	}
	gp := sg.g
	unlockf()
	gp.param = unsafe.Pointer(sg)
	sg.success = true
	if sg.releasetime != 0 {
		sg.releasetime = cputicks()
	}
	goready(gp, skip+1)
}
```

### 有缓冲区且缓冲区未满

```go
// channel 有空闲缓冲区，直接将数据放入缓冲区
if c.qcount < c.dataqsiz {
	// Space is available in the channel buffer. Enqueue the element to send.
	qp := chanbuf(c, c.sendx)
	typedmemmove(c.elemtype, qp, ep)
	c.sendx++
	if c.sendx == c.dataqsiz {
		c.sendx = 0
	}
	c.qcount++
	unlock(&c.lock)
	return true
}
```

### 缓冲区满阻塞发送

- 初始化 `sudog` 并设置当前阻塞的相关信息如：channel、是否在 select 中、待发送数据的内存地址等
- 将 `sudog` 放入到 channel 的发送等待队列 `sendq` 中，并将其设置到当前 G 的 `waiting` 字段上，表示当前 G 正在等待这个 `sudog` 就绪
- 调用 `gopark` 将当前 goroutine 置位等待状态 `_Gwaiting`
- 被唤醒后，重置一些状态，释放 `sudog`

### channel 发送总结

- `recvq` 接受队列上有等待数据的 goroutine，发送方直接将数据发送到接收方
- channel 中若有空余缓冲，发送方将数据放到缓冲区 `sendx` 的位置
- 若都不满足，则说明发送阻塞，初始化一个 `sudog` ，加入到 channel 的发送等待 `sendq` 队列，当前 goroutine 陷入等待

## 接受数据

- 若 channel 为 nil，直接 park 挂起当前 goroutine
- 若 channel 已关闭且缓冲区没有数据，直接返回空值
- 若 channel 的 `sendq` 中有等待的 goroutine，会将先将缓冲区 `recvx` 位置的数据拷贝到接受变量的内存地址上，并将 `sendq` 数据拷贝到缓冲区
- 若 channel 缓冲区中有数据，直接读取 `recvx` 位置的数据
- 其他情况表示会阻塞，挂起当前 goroutine，初始化 `sudog` 加入到 `recvq` 队列中等待唤醒

## 关闭 channel

关闭 channel 代码位于 `runtime.closechan`

### 处理异常

channel 为空指针或已经被关闭然后再次关闭时，会触发 `panic`

### 关闭逻辑

按顺序将 `recvq` 和 `sendq` 两个队列中的数据 push 到 gorutine 列表 `gList` 中，同时清除所有 `sudog` 上未被处理的元素。最后依次 pop 将 `gList` 中的 goroutine 唤醒置为 ready 触发调度。

## select

参考：https://draveness.me/golang/docs/part2-foundation/ch05-keyword/golang-select/

`select` 实现的源码位于 `runtime.select.go`，基本数据结构如下

```go
type scase struct {
	c    *hchan         // chan
	elem unsafe.Pointer // data element
}
```

一般来讲，select 会有下面四种形式，编译器会根据不同的形式生成不同的执行代码

### 直接阻塞（没有任何 case）

空的 select 会直接调用 `gopark` 阻塞当前 goroutine，且永远无法被唤醒

### 单一 channel

select 中仅有一个 case

- 若 channel 为空，则直接 `block` 永久阻塞
- 若 channel 非空，变为 `v, ok := <-ch` 语句

### 非阻塞操作

两个 case 且其中一个是 default

### selectgo

- 随机生成一个遍历轮训顺序
- 根据顺序遍历所有 case 查看是否有可以处理的 channel
  - 若存在：获取 case 并返回
  - 若不存在：创建 `sudog` 将当前 goroutine 加入到所有相关 channel 的收发队列中，并 `gopark` 挂起当前 goroutine 等待唤醒
- 调度器唤醒时，再次按照顺序遍历所有等待 case
