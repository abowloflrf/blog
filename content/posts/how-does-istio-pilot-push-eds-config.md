---
title: "istio-pilot 进行配置推送源码分析（以EDS为例）"
slug: "how-does-istio-pilot-push-eds-config"
tags: ["k8s", "istio"]
date: "2018-11-18T17:34:09+08:00"
---

在公司实习接触到 **istio** 这个强大的微服务框架，作为一个微服务框架，核心功能之一就是**服务发现**（Service Discovery），在 istio 中负责服务发现的核心组件就是 **istio-pilot** ，它是如何管理集群中的服务并将各个服务的具体信息下发到所有其他服务的呢以流畅管理整个服务网格之间的请求的顺利进行呢。于是前几周很长一段时间我都在阅读 isito-pilot 部分的源码，尝试理解其配置更新推送的原理，下面是一些粗浅的解读与总结。

## 配置更新的情景

-   pilot-discovery 监听到 k8s 内 Pod 的变化，将新的 endpoint 信息推送给所有 envoy
-   envoy 发送 DiscoveryRequest 请求到 pilot-dicovery，查询配置信息
-   即使配置没有更新，pilot-discovery 也会周期性推送配置给所有 envoy（默认禁用）

其中主要研究第一种场景，即 pilot-discovery **主动推送**配置给所有 envoy，因为这个场景是服务的运行中会随时发生的，非常普遍，而且它对与服务运行的稳定性是息息相关的，尤其是在扩容缩容、意外宕机、流量配置变更等等时刻，时需要保证所有的 sidecar 能够在第一时间得到这一变更信息。

在集群中，每个 Pod 启动时其 sidecar 都会与 pilot-discovery 建立一个双向 gRPC 连接，server 端会（pilot-discovery）在一个 select 中接收两种通道的信息，分别对应 **响应查询请求** 与 **主动推送配置**，源代码位置如下：

首先是初始化发现服务`initDiscoveryService`

[`initDiscoveryService`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/bootstrap/server.go#L844)

```go
func (s *Server) initDiscoveryService(args *PilotArgs) error {

	//前面会有一些获取参数、新建旧版本v1的DiscoveryServer，用于一些旧版本兼容还有debug操作
	...

	//启动envoy api v2版本的DiscoveryServer
	s.EnvoyXdsServer = envoyv2.NewDiscoveryServer(environment, istio_networking.NewConfigGenerator(args.Plugins))
	envoy.V2ClearCache = s.EnvoyXdsServer.ClearCacheFunc()
	s.EnvoyXdsServer.Register(s.grpcServer)
	//Register这里主要是注册了两种gRPC stream
	//1. StreamAggregatedResources      实现ADS接口，主要关注这里
	//2. IncrementalAggregatedResources 用于增量更新，push效率更高，在1.0.3中实现了EDS的增量更新

	...

	//在这个init中添加StartFunc，启动了各种HTTP、gRPC Server
	s.addStartFunc(func(stop <-chan struct{}) error {
		log.Infof("Discovery service started at http=%s grpc=%s", listener.Addr().String(), grpcListener.Addr().String())
		...
		go func() {
			if err = s.grpcServer.Serve(grpcListener); err != nil {
				log.Warna(err)
			}
		}()
		...

		return err
	})

	return nil
}
```

然后在`StreamAggregatedResources`中主要在一个 select 中接收两个通道的消息进行处理

[`case discReq, ok = <-reqChannel`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/proxy/envoy/v2/ads.go#L336) 用于接收 envoy 的请求被动推送

[`case pushEv, _ := <-con.pushChannel`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/proxy/envoy/v2/ads.go#L472) 用于接收 watch 的配置变化然后主动向 envoy 推送更新

## 监听并推送过程

pilot-discovery 在启动时会初始化一个 ServiceController 它会去与 k8s 对接同步其相关的服务注册信息，在`NewController`方法中会对这些资源：

-   Service
-   Endpoint
-   Node
-   Pod

进行一个 watch/inform 的操作，在初始化时会执行**List**以获取所有需要的服务注册信息然后保存在自己的一个 Cache 中，随后会进行**Watch**来监听变更来更新这个 Cache，这个 watch 操作实际上是 k8s 集群的 apiserver 所提供的一个高效监听变化的方式。

在[`NewController`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/serviceregistry/kube/controller.go#L104) 中，即在`server.go`里创建`createK8sServiceController`时会对这些资源创建  相应的 watch/informer

```go
out.services = out.createInformer(&v1.Service{}, "Service", options.ResyncPeriod,
	func(opts meta_v1.ListOptions) (runtime.Object, error) {
		return client.CoreV1().Services(options.WatchedNamespace).List(opts)
	},
	func(opts meta_v1.ListOptions) (watch.Interface, error) {
		return client.CoreV1().Services(options.WatchedNamespace).Watch(opts)
	})
// out.endpoints=...
// out.nodes=...
// out.pods=...
```

在对每个类型资源的`createInformer`时，会添加 handler：

[`kube/controller.go#L165`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/serviceregistry/kube/controller.go#L165)

```go
informer.AddEventHandler(
    cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            k8sEvents.With(prometheus.Labels{"type": otype, "event": "add"}).Add(1)
            c.queue.Push(Task{handler: handler.Apply, obj: obj, event: model.EventAdd})
        },
        UpdateFunc: func(old, cur interface{}) {
            if !reflect.DeepEqual(old, cur) {
                k8sEvents.With(prometheus.Labels{"type": otype, "event": "update"}).Add(1)
                c.queue.Push(Task{handler: handler.Apply, obj: cur, event: model.EventUpdate})
            } else {
                k8sEvents.With(prometheus.Labels{"type": otype, "event": "updateSame"}).Add(1)
            }
        },
        DeleteFunc: func(obj interface{}) {
            k8sEvents.With(prometheus.Labels{"type": otype, "event": "add"}).Add(1)
            c.queue.Push(Task{handler: handler.Apply, obj: obj, event: model.EventDelete})
        },
    })
```

一共有三种类型的事件：Add、Update、Delete。然后将事件的详细内容（要推送的内容），添加到 Controller 中的一个 task queue 中。

这个 task queue 执行的源码如下：

[kube/queue.go#74](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/serviceregistry/kube/queue.go#L74)

```go
func (q *queueImpl) Run(stop <-chan struct{}) {
	// 开始对任务队列进行处理时对队列加锁，这是一次推送任务
	go func() {
		<-stop
		q.cond.L.Lock()
		q.closing = true
		q.cond.L.Unlock()
	}()

	for {
		q.cond.L.Lock()
		for !q.closing && len(q.queue) == 0 {
			q.cond.Wait()
		}
		//一次推送任务全部完成则退出运行
		if len(q.queue) == 0 {
			q.cond.L.Unlock()
			return
		}
		// 从队列中取出一个任务
		var item Task
		item, q.queue = q.queue[0], q.queue[1:]
		q.cond.L.Unlock()
		// 执行task，若执行失败则延迟一定时间将任务重新加入到队列
		if err := item.handler(item.obj, item.event); err != nil {
			log.Infof("Work item handle failed (%v), retry after delay %v", err, q.delay)
			time.AfterFunc(q.delay, func() {
				q.Push(item)
			})
		}

	}
}
```

`item.hander`实际执行的是 Task 中的`handler.Apply`

```go
// 其中有一组function被依次执行
func (ch *ChainHandler) Apply(obj interface{}, event model.Event) error {
	for _, f := range ch.funcs {
		if err := f(obj, event); err != nil {
			return err
		}
	}
	return nil
}
```

至于这些 handler 具体要执行  的是什么，它们是上面在初始化 Discovery Service 时所定义的 handler：`clearCache()`

[`NewDiscoveryService`](https://github.com/istio/istio/blob/1.0.2/pilot/pkg/proxy/envoy/discovery.go#L324)

```go
// Flush cached discovery responses whenever services, service
// instances, or routing configuration changes.
serviceHandler := func(*model.Service, model.Event) { out.clearCache() }
if err := ctl.AppendServiceHandler(serviceHandler); err != nil {
	return nil, err
}
instanceHandler := func(*model.ServiceInstance, model.Event) { out.clearCache() }
if err := ctl.AppendInstanceHandler(instanceHandler); err != nil {
	return nil, err
}
```

`envoy/discovery.go`中的 clearCache，这个方法主要实现了一个`debounce`机制，有一个`DebounceAfter`默认是 100ms，也就是每次 push 都会先推迟这个时间，并设置一个全局的变量`clearCacheTimerSet`记录此时是否有一个正在进行 debounce push 的，若有的话只直接放弃这个 push，并将全局变量`lastClearCacheEvent`重新设置为当前时间，在那个 debounce push 任务中会计算新的`since`时间，也就是距离新的 push 任务到来的时间，知道这个时间大于 200ms 才会真正执行 push，若短时间内一直有频繁的配置更新而刷新这个`lastClearCacheEvent`会导致 push 任务持续被推迟。因为 envoy 需要的只是最新的配置信息，减少了配置频繁更新时而多次推送导致的不必要的负载。

> 这里有一个问题就是，如果配置确实在短时间内频繁更新了，那么缓存和推送时间迟迟不执行，这时所有的 envoy 就无法及时得到最新的配置信息，也是影响配置生效的一个比较重要的原因。

```go
// debouncePush is called on clear cache, to initiate a push.
func debouncePush(startDebounce time.Time) {
	clearCacheMutex.Lock()
	// 已经在这个debounce push的任务中又有新的push任务到来，这个lastClearCacheEvent时间被更新
	// 实现的功能就是debounce time内做一个简单的限频，时间内若有新的push，则会持续debounce
	since := time.Since(lastClearCacheEvent)
	events := clearCacheEvents
	clearCacheMutex.Unlock()
	// 若自从这个debounce push开始的时间已经经过了200ms就开始执行push
	if since > 2*DebounceAfter ||
		time.Since(startDebounce) > DebounceMax {

		log.Infof("Push debounce stable %d: %v since last change, %v since last push",
			events,
			since, time.Since(lastClearCache))
		clearCacheMutex.Lock()
		// 将这个表示是否有正在进行push的全局变量置为false以允许下一个新的push的进行
		clearCacheTimerSet = false
		lastClearCache = time.Now()
		clearCacheMutex.Unlock()
		V2ClearCache()
	// 否则推迟100ms
	} else {
		log.Infof("Push debounce %d: %v since last change, %v since last push",
			events,
			since, time.Since(lastClearCache))
		time.AfterFunc(DebounceAfter, func() {
			debouncePush(startDebounce)
		})
	}
}
// clearCache will clear all envoy caches. Called by service, instance and config handlers.
// This will impact the performance, since envoy will need to recalculate.
func (ds *DiscoveryService) clearCache() {
	clearCacheMutex.Lock()
	defer clearCacheMutex.Unlock()

	clearCacheEvents++
	// 这里的DebounceAfter默认被设置为100ms
	if DebounceAfter > 0 {
		// 记录一下时间【注意这是一个全局的变量】
		lastClearCacheEvent = time.Now()
		// clearCahceTimerSet 表明又没有一个正在debounce递归中的push任务
		// 若为true则直接放弃这个push
		if !clearCacheTimerSet {
			// 开始一个debounce push
			clearCacheTimerSet = true
			startDebounce := lastClearCacheEvent
			time.AfterFunc(DebounceAfter, func() {
				debouncePush(startDebounce)
			})
		}

		return
	}
	// 后面源码中有一些原来实现类似debounce的方式，当debounceAfter被设置为0时，执行到后面的代码
}
```

`envoy/v2/discovery.go`中的`ClearCacheFunc()`，就是上面的`V2ClearCache()`，这里主要进行一些 pushContext 的初始化的操作，最后会起一个协程调用`adsPushAll`去以 ADS 协议执行推送

```go
// ClearCacheFunc returns a function that invalidates v2 caches and triggers a push.
// This is used for transition, once the new config model is in place we'll have separate
// functions for each event and push only configs that need to be pushed.
// This is currently called from v1 and has attenuation/throttling.
func (s *DiscoveryServer) ClearCacheFunc() func() {
	return func() {
		...
		go s.AdsPushAll(versionLocal, push)
	}
}
```

对当前所有与 pilot-discovery 建立连接的 envoy 客户端执行配置推送`ads.go`

```go
// AdsPushAll implements old style invalidation, generated when any rule or endpoint changes.
// Primary code path is from v1 discoveryService.clearCache(), which is added as a handler
// to the model ConfigStorageCache and Controller.
func (s *DiscoveryServer) AdsPushAll(version string, push *model.PushContext) {
	...
	// 获取所有待推送的xds连接，对应pilot-disovery来说就是所有与之建立连接的Pod的envoy
	adsClientsMutex.RLock()
	pending := []*XdsConnection{}
	for _, v := range adsClients {
		pending = append(pending, v)
	}
	adsClientsMutex.RUnlock()

	// 在for中持续对xdsConnection列表逐一进行推送
	for {
		//等待推送的连接数为0，即已经全部推送完毕
		if len(pending) == 0 {
			adsLog.Infof("PushAll done %s %v", version, time.Since(tstart))
			return
		}
		...
		// 取出一个pending的连接
		c := pending[0]
		pending = pending[1:]

		// Using non-blocking push has problems if 2 pushes happen too close to each other
		client := c
		// this should be in a thread group, to do multiple pushes in parallel.
		// 官方的todo表示进行推送的操作应该在一个线程组中来并行执行多个推送任务，这里有待改进

		// 设置一个单次推送超时时间5s
		to := time.After(PushTimeout)
		select {
		// client.pushChannel是一个缓冲为0的通道，通道为空表明没有推送任务，这里向其发送了一项XdsEvent其中包括了需要执行的推送任务
		// client端会接收这个通道的信号然后执行推送
		// 在asd.go的StreamAggregatedResources方法中会select两种配置推送情景如最上面所说，接收到了pushChennel的信息
		case client.pushChannel <- &XdsEvent{
			push:    pushContext,
			pending: &pendingPush,
			version: version,
		}:
			client.LastPush = time.Now()
			client.LastPushFailure = timeZero
		case <-client.doneChannel: // connection was closed
			adsLog.Infof("Client closed connection %v", client.ConID)
		case <-to:
			pushTimeouts.Add(1)
			//default:
			// This may happen to some clients if the other side is in a bad state and can't receive.
			// The tests were catching this - one of the client was not reading.
			pending = append(pending, c)
			...
		}
	}
}
```

pushAll

```go
// Compute and send the new configuration. This is blocking and may be slow
// for large configs.
func (s *DiscoveryServer) pushAll(con *XdsConnection, pushEv *XdsEvent) error {
	...
	//分别对CDS，RDS，LDS，EDS进行判断并执行不同xDS的实际响应封装
	if con.CDSWatch {
		err := s.pushCds(con, pushEv.push, pushEv.version)
		if err != nil {
			return err
		}
	}
	if len(con.Routes) > 0 {
		err := s.pushRoute(con, pushEv.push)
		if err != nil {
			return err
		}
	}
	if len(con.Clusters) > 0 {
		err := s.pushEds(pushEv.push, con)
		if err != nil {
			return err
		}
	}
	if con.LDSWatch {
		err := s.pushLds(con, pushEv.push, false, pushEv.version)
		if err != nil {
			return err
		}
	}
	return nil
}
```

例如对与 eds 配置进行推送：

```go
func (s *DiscoveryServer) pushEds(push *model.PushContext, con *XdsConnection) error {
	...
	//前面是对结构体的一些封装组成EDS的DiscoveryResponse
	response := s.endpoints(con.Clusters, resAny)
	//终于发送了。。。
	err := con.send(response)
	if err != nil {
		adsLog.Warnf("EDS: Send failure, closing grpc %v", err)
		pushes.With(prometheus.Labels{"type": "eds_senderr"}).Add(1)
		return err
	}
	...
}
```

## 一次 endpoint 改变 pushAll 的时间

在本次测试的集群中，一共有三个 pilot 实例，分别连接着 54、4、45 个 envoy clients

-   54 istio-pilot-6c9f665466-5b49s （push 时间大致在 600-700ms）
-   4 istio-pilot-6c9f665466-hgz7k （push 时间大致在 180-200ms）
-   45 istio-pilot-6c9f665466-jxtpw （push 时间大致在 500-600ms）

大致计算每多一个 Pod，push 的时间开销会多 10ms 左右，因此 Pod 数量过多导致 push 速度下降可以添加 istio-pilot 的副本个数解决以均衡每个 istio-pilot 连接的 envoy 数目

## Push 生效时间会导致的问题

在进行 scale down 操作时，由于 endpoint 配置没有及时的推送到 envoy 中，因此用户在访问时会导致少量的 503 错误。

可以使用考虑 istio 的 HTTPRetry 配置，其本质是传送了一个 HTTP 头部给 envoy 进行一个配置信息，envoy 收到后会根据指定的错误如 5XX 进行 retry 直到正确返回。但是根据推送时间在 500ms 上下，istio 文档中每次 retry 的时间大约在 25ms+，所以难道要进行这么多次 retry 才能正确收到请求？更加需要注意的是，如果在生产环境中真的有服务 down 了，那么所有的错误请求都会成倍的增加，导致整个集群的压力增大，也是一个需要考虑的问题。

相关 issue 的讨论[503 errors when scaling down, or rolling out a new application version #7665](https://github.com/istio/istio/issues/7665)
