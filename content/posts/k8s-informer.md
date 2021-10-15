---
title: "Kubernetes 源码阅读 - Informer"
slug: "kubernetes-informer-in-depth"
tags: ["k8s", "client-go"]
date: 2021-07-10T20:41:16+08:00
---

## `sharedInformerFactory`

### 创建 `factory`

```go
func NewSharedInformerFactoryWithOptions(client kubernetes.Interface, defaultResync time.Duration, options ...SharedInformerOption) SharedInformerFactory {
	factory := &sharedInformerFactory{
		client:           client,
		namespace:        v1.NamespaceAll,
		defaultResync:    defaultResync,
    // 保存共享的 informer
		informers:        make(map[reflect.Type]cache.SharedIndexInformer),
    // 记录 informer 是否启动
		startedInformers: make(map[reflect.Type]bool),
    // 记录 informer 的自定义 resync 参数
		customResync:     make(map[reflect.Type]time.Duration),
	}

	// Apply all options
	for _, opt := range options {
		factory = opt(factory)
	}

	return factory
}
```

### 从 `factory` 获取具体资源的 informer

```go
// package informers factory.go
func (f *sharedInformerFactory) Core() core.Interface {
	return core.New(f, f.namespace, f.tweakListOptions)
}

// package core interface.go
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &group{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}
func (g *group) V1() v1.Interface {
	return v1.New(g.factory, g.namespace, g.tweakListOptions)
}

// package v1 interface.go
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &version{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}
func (v *version) Pods() PodInformer {
	return &podInformer{factory: v.factory, namespace: v.namespace, tweakListOptions: v.tweakListOptions}
}

// package v1 pod.go
type podInformer struct {
	factory          internalinterfaces.SharedInformerFactory
	tweakListOptions internalinterfaces.TweakListOptionsFunc
	namespace        string
}

func (f *podInformer) Informer() cache.SharedIndexInformer {
	return f.factory.InformerFor(&corev1.Pod{}, f.defaultInformer)
}
```

### `InformerFor` 根据传入的资源类型创建 informer

对于最后的 `podInformer.Informer()` 中的 `factory.InformerFor` 实际上就是调用的共享的 `sharedInformerFactory.InformerFor`，比如传入类型为 `pod` 它通过反射的到具体的资源类型，判断此资源的 informer 是否已经存在若存在则直接返回，若不存在说明是使用初次获取该 informer，因此使用 `newFunc` 创建该资源的 informer 并保存到 factory 的 informer map 中。

```go
func (f *sharedInformerFactory) InformerFor(obj runtime.Object, newFunc internalinterfaces.NewInformerFunc) cache.SharedIndexInformer {
	f.lock.Lock()
	defer f.lock.Unlock()
	// 通过反射的到具体需要的资源类型，如 v1.Pod，查找是在 facotry 中已经存在
  // 若存在则无需重新创建，直接返回即可
	informerType := reflect.TypeOf(obj)
	informer, exists := f.informers[informerType]
	if exists {
		return informer
	}
  // 未找到则开始为此资源构建新的 informer，先查找有没有为此资源自定义 resync 时间
  // 若没有则使用全局默认的 resync 参数
	resyncPeriod, exists := f.customResync[informerType]
	if !exists {
		resyncPeriod = f.defaultResync
	}
  // newFunc 构造新的 informer 并加入到 factory
	informer = newFunc(f.client, resyncPeriod)
	f.informers[informerType] = informer

	return informer
}
```

这个用于创建具体资源的 `newFunc` 是传入的方法，也是在具体资源的实现中定义的，对于 Pod ，这个方法是 `NewFilteredPodInformer`，源码如下。

### `NewSharedIndexInformer`

```go
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

// cache.NewSharedIndexInformer
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

可以看到创建 `informer` 需要两个关键结构：

-   `cache.ListWatcher` 这里的 List Watch 就是使用的原始 clientset 的 ListWatch 方法
    -   `List(options metav1.ListOptions) (runtime.Object, error)`
    -   `Watch(options metav1.ListOptions) (watch.Interface, error)`
-   `cache.Indexer`
    -   map of `IndexFunc func(obj interface{}) ([]string, error)` 给定对象找到其索引

## 启动 `sharedInformerFactory.Start`

```go
func (f *sharedInformerFactory) Start(stopCh <-chan struct{}) {
	f.lock.Lock()
	defer f.lock.Unlock()

	for informerType, informer := range f.informers {
		if !f.startedInformers[informerType] {
			go informer.Run(stopCh)
			f.startedInformers[informerType] = true
		}
	}
}
```

遍历 factory 下面创建的所有资源类型的 informer 分别调用其 `SharedIndexInformer.Run` 方法

### `SharedIndexInformer.Run` 启动具体的 informer

### 构造 `DeltaFIFO` 队列

```go
func (s *sharedIndexInformer) Run(stopCh <-chan struct{}) {
	// 构造 DeltaFIFO 队列，cache.Controller 需要此队列
	fifo := NewDeltaFIFOWithOptions(DeltaFIFOOptions{
		KnownObjects:          s.indexer,
		EmitDeltaTypeReplaced: true,
	})
  // ...
```

### 使用上面的 `DeltaFIFO` 创建 `Controller`

```go
func (s *sharedIndexInformer) Run(stopCh <-chan struct{}) {
  // ...
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
  // ...
```

### 启动 `Controller`

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

#### 构造 `Reflector`

#### `DeltaFIFO`

-   Add
-   List
-   Update - 和 Add 事件一样
-   Delete
-   Get
-   Pop

#### 进入 `processLoop` 循环

循环从 `DeltaFIFO` 队列中 Pop 对象

## `kcm` 的使用 example

具体的 controller 创建的时候传入的需要资源的 informer，构造不同的 controller 时都是从同一份 `ControllerContext` 中的 `InformerFactory` 拿到具体资源的 informer

```go
func NewControllerInitializers(loopMode ControllerLoopMode) map[string]InitFunc {
	controllers := map[string]InitFunc{}
	controllers["endpoint"] = startEndpointController
	controllers["endpointslice"] = startEndpointSliceController
	controllers["replicationcontroller"] = startReplicationController
	controllers["podgc"] = startPodGCController
	controllers["resourcequota"] = startResourceQuotaController
	controllers["namespace"] = startNamespaceController
	controllers["serviceaccount"] = startServiceAccountController
	controllers["garbagecollector"] = startGarbageCollectorController
	controllers["daemonset"] = startDaemonSetController
	controllers["job"] = startJobController
  controllers["deployment"] = startDeploymentController
  // ...
}

func startDeploymentController(ctx ControllerContext) (http.Handler, bool, error) {
	if !ctx.AvailableResources[schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}] {
		return nil, false, nil
	}
	dc, err := deployment.NewDeploymentController(
		ctx.InformerFactory.Apps().V1().Deployments(),
		ctx.InformerFactory.Apps().V1().ReplicaSets(),
		ctx.InformerFactory.Core().V1().Pods(),
		ctx.ClientBuilder.ClientOrDie("deployment-controller"),
	)
	if err != nil {
		return nil, true, fmt.Errorf("error creating Deployment controller: %v", err)
	}
	go dc.Run(int(ctx.ComponentConfig.DeploymentController.ConcurrentDeploymentSyncs), ctx.Stop)
	return nil, true, nil
}

// Deployment Controller
func NewDeploymentController(dInformer appsinformers.DeploymentInformer, rsInformer appsinformers.ReplicaSetInformer, podInformer coreinformers.PodInformer, client clientset.Interface) (*DeploymentController, error) {
  //...
```

## Resync 机制是什么

https://github.com/cloudnativeto/sig-kubernetes/issues/11

定时将 Indexer 缓存重新同步到 DeltaFIFO 队列中，让 eventHandler 处理失败的事件能够重新处理

具体表现是使用 informer 时会定时触发一次全量的 Update 事件
