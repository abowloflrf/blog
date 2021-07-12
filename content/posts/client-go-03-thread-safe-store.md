---
title: "client-go 阅读 03 ThreadSafeStore"
slug: "client-go-03-thread-safe-store"
tags: ["client-go"]
date: 2021-07-10T20:39:16+08:00
---

ThreadSafeStore 是一个允许并发且带有索引方式地访问的存储结构。

使用 informerFactory 在创建具体某个资源的 informer 的 `NewSharedIndexInformer` 中使用到的 Indexer 就创建了一个新的 `ThreadSafeStore`，这个结构就保存着 informer 对远端 apiserver 指定资源类型的所有本地缓存内容并随时保持更新，这样客户端就不用每次获取资源时远程访问一遍 apiserver，且 `ThreadSafeStore` 还有一个索引结构，更大程度地提高了客户端访问资源的效率。

## 基本数据结构

```go
type threadSafeMap struct {
    // 控制并发读写
	lock  sync.RWMutex
    // 保存所有数据
	items map[string]interface{}
    // 索引方法
	indexers Indexers
    // 索引数据
	indices Indices
}
```

如下图所示：

![sMQ3Pq-miYSBR](https://img.ruofeng.me/file/ruofengimg/2021-07/sMQ3Pq-miYSBR.png)

因此创建一个 `ThreadSafeStore` 需要两个关键参数 `Indexers` 和 `Indices`

### `Indexers` => `map[string]IndexFunc` 索引方法

`IndexFunc` 为获取某个对象其索引的方法，例如对于 Pod： `kube-system/pod1` ，传入的为整个 Pod，返回的是 `[]string{"kube-system"}`，"kube-system" 就是此 Pod 的索引。

对于具体的 PodInformer，构造该 Store 时传入的索引方法是 `{"namespace": cache.MetaNamespaceIndexFunc}`，k8s 几乎大多数资源的 Informer 传入的都是基于 namespace 的索引方法：

```go
func MetaNamespaceIndexFunc(obj interface{}) ([]string, error) {
	meta, err := meta.Accessor(obj)
	if err != nil {
		return []string{""}, fmt.Errorf("object has no meta: %v", err)
	}
	return []string{meta.GetNamespace()}, nil
}
```

### `Indices` => `map[string]Index` 索引

```go
// Index maps the indexed value to a set of keys in the store that match on that value
type Index map[string]sets.String
```

indices 为 index 的复数，该结构中保存着所有对象的索引，保存所有有该索引 value 的对象的 key，初始时为空。

何谓对象的 key 呢，在 k8s 中对于 kube-system 命名空间下的 Pod: pod1 此对象的唯一 key 为字符串 `"kube-system/pod1"` ，store 中 namespace index 所保存的关于该 pod 的索引为 key=kube-system，value 为此命名空间下的所有 pod 的 唯一 key，`kube-system/pod1` 即在这个 set 中。

## 如何通过上面的索引模式快速拿到对象

```go
// 例如要拿到命名空间 kube-system 下的所有 pod
// ByIndex("namespace", "kube-system")

// ByIndex returns a list of the items whose indexed values in the given index include the given indexed value
func (c *threadSafeMap)ByIndex(indexName, indexedValue string) ([]interface{}, error) {
	c.lock.RLock()
	defer c.lock.RUnlock()

	indexFunc := c.indexers[indexName]
	if indexFunc == nil {
		return nil, fmt.Errorf("Index with name %s does not exist", indexName)
	}

	index := c.indices[indexName]

	set := index[indexedValue]
	list := make([]interface{}, 0, set.Len())
	for key := range set {
		list = append(list, c.items[key])
	}

	return list, nil
}
```
