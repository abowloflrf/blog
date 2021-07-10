---
title: "client-go 阅读 05 Informer 源码详解"
slug: "client-go-05-informer-in-depth"
tags: ["client-go"]
date: 2021-07-10T20:41:16+08:00
---

参考：https://github.com/kubernetes/sample-controller/blob/master/docs/controller-client-go.md

## informer 使用步骤

-   初始化 informer
-   添加 eventHandler
-   开始运行 informer
-   WaitForCacheSync

## 初始化一个 informer

### 1. 创建 informerFactory `informers/factory.go:NewSharedInformerFactory`

返回一个 `SharedInformerFactory` interface

```go
// internal interface
type SharedInformerFactory interface {
	Start(stopCh <-chan struct{})
	InformerFor(obj runtime.Object, newFunc NewInformerFunc) cache.SharedIndexInformer
}

// 和
type SharedInformerFactory interface {
	internalinterfaces.SharedInformerFactory
	ForResource(resource schema.GroupVersionResource) (GenericInformer, error)
	WaitForCacheSync(stopCh <-chan struct{}) map[reflect.Type]bool

    // 各种 api 资源
	Admissionregistration() admissionregistration.Interface
	Internal() apiserverinternal.Interface
	Apps() apps.Interface
	Autoscaling() autoscaling.Interface
	Batch() batch.Interface
	Certificates() certificates.Interface
	Coordination() coordination.Interface
	Core() core.Interface
	Discovery() discovery.Interface
	Events() events.Interface
	Extensions() extensions.Interface
	Flowcontrol() flowcontrol.Interface
	Networking() networking.Interface
	Node() node.Interface
	Policy() policy.Interface
	Rbac() rbac.Interface
	Scheduling() scheduling.Interface
	Storage() storage.Interface
}
```

实际返回结构体为

```go
factory := &sharedInformerFactory{
	client:           client,
	namespace:        v1.NamespaceAll,
	defaultResync:    defaultResync,
	informers:        make(map[reflect.Type]cache.SharedIndexInformer),
	startedInformers: make(map[reflect.Type]bool),
	customResync:     make(map[reflect.Type]time.Duration),
}
```

### 2. 从 factory 新建指定资源的 informer：`factory.Core().V1().Pods()` 得到一个 `PodInformer`

```go
type PodInformer interface {
	Informer() cache.SharedIndexInformer
	Lister() v1.PodLister
}
```

其中 `.Core()` 、`.V1()`、`.Pods()` 返回的结构体都如下，只是 struct 名不同

```go
// group/version/podInformer
type group struct {
    // 此 factory 就是第一部中所构造的 factory，一直作为参数传下来
	factory          internalinterfaces.SharedInformerFactory
	namespace        string
	tweakListOptions internalinterfaces.TweakListOptionsFunc
}
```

### 3. 这个具体资源的 podInformer 有两个方法：

```go
// 接口
type PodInformer interface {
	Informer() cache.SharedIndexInformer
	Lister() v1.PodLister
}

// 实现
func (f *podInformer) Informer() cache.SharedIndexInformer {
	return f.factory.InformerFor(&corev1.Pod{}, f.defaultInformer)
}

func (f *podInformer) Lister() v1.PodLister {
	return v1.NewPodLister(f.Informer().GetIndexer())
}
```

### 4. 使用 informer 的 `Informer()` 方法调用内部 factory 的 `InformerFor()` 构造一个 `cache.SharedIndexInformer`

```go
// 对于 PodInformer ，传入的第一个参数即为 Pod 结构体，如上面的  f.factory.InformerFor(&corev1.Pod{}, f.defaultInformer)
func (f *sharedInformerFactory) InformerFor(obj runtime.Object, newFunc internalinterfaces.NewInformerFunc) cache.SharedIndexInformer {
	f.lock.Lock()
	defer f.lock.Unlock()

	informerType := reflect.TypeOf(obj)
	informer, exists := f.informers[informerType]
	if exists {
		return informer
	}

	resyncPeriod, exists := f.customResync[informerType]
	if !exists {
		resyncPeriod = f.defaultResync
	}

	informer = newFunc(f.client, resyncPeriod)
	f.informers[informerType] = informer

	return informer
}
```

### 5. 但是对于通用的 factory 的 `InformerFor()` 方法其中还是传入了一个 Pod 资源类型所定义的 `f.defaultInformer`

```go
func (f *podInformer) defaultInformer(client kubernetes.Interface, resyncPeriod time.Duration) cache.SharedIndexInformer {
	return NewFilteredPodInformer(client, f.namespace, resyncPeriod, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}, f.tweakListOptions)
}

// 为 Pod 类型构造一个新的 informer
func NewFilteredPodInformer(client kubernetes.Interface, namespace string, resyncPeriod time.Duration, indexers cache.Indexers, tweakListOptions internalinterfaces.TweakListOptionsFunc) cache.SharedIndexInformer {
	return cache.NewSharedIndexInformer(
		&cache.ListWatch{
			ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
				if tweakListOptions != nil {
					tweakListOptions(&options)
				}
				return client.CoreV1().Pods(namespace).List(context.TODO(), options)
			},
			WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
				if tweakListOptions != nil {
					tweakListOptions(&options)
				}
				return client.CoreV1().Pods(namespace).Watch(context.TODO(), options)
			},
		},
		&corev1.Pod{},
		resyncPeriod,
		indexers,
	)
}
```

### 6. 真正的 informer 结构创建，位于 `tools/cache`

```go
func NewSharedIndexInformer(lw ListerWatcher, exampleObject runtime.Object, defaultEventHandlerResyncPeriod time.Duration, indexers Indexers) SharedIndexInformer {
	realClock := &clock.RealClock{}
	sharedIndexInformer := &sharedIndexInformer{
		processor:                       &sharedProcessor{clock: realClock},
		indexer:                         NewIndexer(DeletionHandlingMetaNamespaceKeyFunc, indexers),
		listerWatcher:                   lw,
		objectType:                      exampleObject,
		resyncCheckPeriod:               defaultEventHandlerResyncPeriod,
		defaultEventHandlerResyncPeriod: defaultEventHandlerResyncPeriod,
		cacheMutationDetector:           NewCacheMutationDetector(fmt.Sprintf("%T", exampleObject)),
		clock:                           realClock,
	}
	return sharedIndexInformer
}
```

### 7. 对于传入的 indexers

其中 indexer 为第 5 步骤之初创建的 `cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}` 结构体
且 indexer 结构体本质就是一个 map 类型

```go
type Indexers map[string]IndexFunc
```

初始化的时候该 indexer map 只有一个元素，key 为 "namespace" 字符串，v 为函数，以 namespace 作为索引：

```go
func MetaNamespaceIndexFunc(obj interface{}) ([]string, error) {
	meta, err := meta.Accessor(obj)
	if err != nil {
		return []string{""}, fmt.Errorf("object has no meta: %v", err)
	}
	return []string{meta.GetNamespace()}, nil
}
```

### 8. sharedIndexInformer 结构体中的使用 `NewIndexer` 创建的 indexer

```go
return &cache{
	cacheStorage: NewThreadSafeStore(indexers, Indices{}),
	keyFunc:      keyFunc,
}
```

### 9. `NewThreadSafeStore()`

这就是真正存储的结构体，共有三个内容

-   items: map `map[string]interface{}{}`
-   indexers: 一直逐层传入的，本质也是 map `map[string]IndexFunc`
-   indices: 一个空 map `map[string]Index`
    -   Index: 还是 map `map[string]sets.String`

```go
return &threadSafeMap{
	items:    map[string]interface{}{},
	indexers: indexers,
	indices:  indices,
}
```

### 10. `threadSafeMap` 中的两个关键概念

**indexer**

给定一个 value 对象，返回一组这个对象用于索引的值

例如对于 Pod： `kube-system/pod1` ，传入的为整个 Pod，返回的是 `[]string{"kube-system"}`

```go
// IndexFunc knows how to compute the set of indexed values for an object.
type IndexFunc func(obj interface{}) ([]string, error)
```

**index**

保存所有有该索引 value 的对象的 key

例如对于 kube-system 命名空间下的 Pod: pod1 该对象的唯一 key 为 `kube-system/pod1`，那么这个 store 中 namespace index 所保存的关于该 pod 的索引为 key=kube-system，value 为此命名空间下的所有 pod 的 唯一 key，`kube-system/pod1` 即在这个 set 中。

```go
// Index maps the indexed value to a set of keys in the store that match on that value
type Index map[string]sets.String
```

### 11. 如何通过上面的索引模式快速拿到对象

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

## 添加 event handler

注册 add update delete 事件处理方法

## Run

run 方法主要做的几件事

-   初始化 fifo 队列 `NewDeltaFIFOWithOptions` 用于 reflector 的底层存储
-   初始化 controller `s.controller = New(cfg)`
-   启动 `cacheMutationDetector`
-   启动 `processor`
-   启动 `controller.Run()` 此处会 `NewReflector`，reflector 的作用为保持本地的存储 store 和远程 server 数据一致

### 1. `sharedIndexInformer.Run()`

```go
func (s *sharedIndexInformer) Run(stopCh <-chan struct{}) {
	defer utilruntime.HandleCrash()

	fifo := NewDeltaFIFOWithOptions(DeltaFIFOOptions{
		KnownObjects:          s.indexer,
		EmitDeltaTypeReplaced: true,
	})

	cfg := &Config{
		Queue:            fifo,
		ListerWatcher:    s.listerWatcher,
		ObjectType:       s.objectType,
		FullResyncPeriod: s.resyncCheckPeriod,
		RetryOnError:     false,
		ShouldResync:     s.processor.shouldResync,

		Process:           s.HandleDeltas,
		WatchErrorHandler: s.watchErrorHandler,
	}

	func() {
		s.startedLock.Lock()
		defer s.startedLock.Unlock()

		s.controller = New(cfg)
		s.controller.(*controller).clock = s.clock
		s.started = true
	}()

	// Separate stop channel because Processor should be stopped strictly after controller
	processorStopCh := make(chan struct{})
	var wg wait.Group
	defer wg.Wait()              // Wait for Processor to stop
	defer close(processorStopCh) // Tell Processor to stop
	wg.StartWithChannel(processorStopCh, s.cacheMutationDetector.Run)
	wg.StartWithChannel(processorStopCh, s.processor.run)

	defer func() {
		s.startedLock.Lock()
		defer s.startedLock.Unlock()
		s.stopped = true // Don't want any new listeners
	}()
	s.controller.Run(stopCh)
}
```

### 2. `controller.Run()`

```go
func (c *controller) Run(stopCh <-chan struct{}) {
	defer utilruntime.HandleCrash()
	go func() {
		<-stopCh
		c.config.Queue.Close()
	}()
	r := NewReflector(
		c.config.ListerWatcher,
		c.config.ObjectType,
		c.config.Queue,
		c.config.FullResyncPeriod,
	)
	r.ShouldResync = c.config.ShouldResync
	r.WatchListPageSize = c.config.WatchListPageSize
	r.clock = c.clock
	if c.config.WatchErrorHandler != nil {
		r.watchErrorHandler = c.config.WatchErrorHandler
	}

	c.reflectorMutex.Lock()
	c.reflector = r
	c.reflectorMutex.Unlock()

	var wg wait.Group

	wg.StartWithChannel(stopCh, r.Run)

	wait.Until(c.processLoop, time.Second, stopCh)
	wg.Wait()
}
```

### 3. reflector run

```go
func (r *Reflector) Run(stopCh <-chan struct{}) {
	klog.V(3).Infof("Starting reflector %s (%s) from %s", r.expectedTypeName, r.resyncPeriod, r.name)
	wait.BackoffUntil(func() {
		if err := r.ListAndWatch(stopCh); err != nil {
			r.watchErrorHandler(r, err)
		}
	}, r.backoffManager, true, stopCh)
	klog.V(3).Infof("Stopping reflector %s (%s) from %s", r.expectedTypeName, r.resyncPeriod, r.name)
}
```

其中的 `ListAndWatch` 内部主要有两个逻辑：

-   go for select loop 用于从 `resyncChan` 中循环读取消息并决定对 store 进行 `Resync` 操作
-   for select loop 调用 listWathcer 的 Watch 方法并在 `watchHandler` 中处理 watch 信息，并分别根据不通的事件类型发送到 reflector 内部的 store 中，即上面所创建的 DeltaFIFO 队列

在 `watchHandler`中也是一个大 loop，循环从 watcher 的 ResultChan 中取得 server 的更新 event，并保留每次更新的 resourceVersion，当异常退出 loop 时会重新传入此版本号发送建立 watch 请求

### 4. controller loop

```go
func (c *controller) processLoop() {
	for {
		obj, err := c.config.Queue.Pop(PopProcessFunc(c.config.Process))
		if err != nil {
			if err == ErrFIFOClosed {
				return
			}
			if c.config.RetryOnError {
				// This is the safe way to re-enqueue.
				c.config.Queue.AddIfNotPresent(obj)
			}
		}
	}
}

```
