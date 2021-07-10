---
title: "client-go 阅读 04 DeltaFIFO"
slug: "client-go-04-delta-fifo"
tags: ["client-go"]
date: 2021-07-10T20:40:16+08:00
---

sharedInformer 在 `Run` 时，会新建此 DeltaFIFO 队列作为 Reflector 的本地存储结构

```go
fifo := NewDeltaFIFOWithOptions(DeltaFIFOOptions{
	    KnownObjects:          s.indexer,
		EmitDeltaTypeReplaced: true,
})
```

这个 DeltaFIFO 本质就是一个 FIFO 队列，但是它不仅仅是一个保存元素的线性数据结构，它还有以下不同之处：

-   对象 key 指向的不是对象本身，而是对象的**一组变化量**
-   每次对象有变化就是想这个对象 key 所指的一组变化量后追加一个 Delta

## 关键数据结构

-   **Delta**: `struct{Type,Object}`，每次变化的具体内容，表示究竟发生了什么变化，以及变化后对象的状态
-   **items**: `map[string]Deltas{}`，保存资源的 key 到 deltas 的映射
-   **queue**: `[]string{}` 保存 keys，以供以队列形式被消费，Pop 使用

DeltaFIFO 的内部关键数据结构和方法如下图所示：

![9ETTee-7YK2GH](https://img.ruofeng.me/file/ruofengimg/2021-07/9ETTee-7YK2GH.png)

## 关键方法

### `Add/Update/Delete`

本质都是将资源的变化事件放入队列中，其中调用的均为下面的 `queueActionLocked` 方法

### `queueActionLocked(DeltaType, interface{})`

```go
func (f *DeltaFIFO) queueActionLocked(actionType DeltaType, obj interface{}) error {
    // ..
    // 合并多余的 delta，仅处理了重复的删除事件
	oldDeltas := f.items[id]
	newDeltas := append(oldDeltas, Delta{actionType, obj})
	newDeltas = dedupDeltas(newDeltas)

	if len(newDeltas) > 0 {
		// 若是新的对象，即在 items map 中都未找到，则需要将此新的 key 插入队列
		if _, exists := f.items[id]; !exists {
			f.queue = append(f.queue, id)
		}
		// 更新此对象的 deltas，并广播通知告诉 Pop 队列有新的数据
		f.items[id] = newDeltas
		f.cond.Broadcast()
	}
    // ...
}
```

1. 等待处理的变化量 slice 若大于 1，则将变化量去重，但去重也仅仅去除最后重复的删除事件
2. 若是新的对象 items map 中没有此 key，则添加到 queue 中，等待消费
3. 将最新的 deltas 追加到 items 所指的对象的 deltas 后

### `Pop` 返回队列头部等待消费的一个元素的 deltas

```go
func (f *DeltaFIFO) Pop(process PopProcessFunc) (interface{}, error) {
	// ...
	for {
        // 若 queue 还是空，则等待 condition 广播，一直阻塞
		for len(f.queue) == 0 {
			if f.closed {
				return nil, ErrFIFOClosed
			}
			f.cond.Wait()
		}
		// 从队列中拿第一个元素，即 Pop 操作
		id := f.queue[0]
		f.queue = f.queue[1:]
        item, ok := f.items[id]
        // ...
		// 将 items map 中的 key 也清空，而不仅仅是清空 deltas 内容
		delete(f.items, id)
		err := process(item)
		if e, ok := err.(ErrRequeue); ok {
			f.addIfNotPresent(id, item)
			err = e.Err
		}
		return item, err
	}
}
```

1. 循环从 queue 中获取队首元素，若队列长度为空则 `cond.Wait` 持续等待
2. 获取到队首的 key 后，通过此 key 在 items 中找到这个资源的 deltas，清空 `items[key]`，然后返回该 deltas

### `Resync`

遍历所有对象的 key 并调用 `syncKeyLocked` 来执行同步，其实其中还是调用的上面的 `queueActionLocked` ，只不过事件类型变了 `Sync`
