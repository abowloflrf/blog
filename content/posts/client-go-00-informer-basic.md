---
title: "client-go 阅读 00 Informer 基本使用"
slug: "client-go-00-informer-basic"
tags: ["client-go"]
date: 2021-07-10T20:36:16+08:00
---

例如我们需要写一个监听 Pod 变化并处理相应逻辑的 Pod Informer

## 0. 构造 clientset

构造 clientset 数据为使用 `client-go` 的基础内容，此处不再赘述

## 1. 初始化 informerFactory

```go
factory := informers.NewSharedInformerFactory(clientset, time.Hour*24)
```

## 2. 使用 factory 创建相应资源的 informer

```go
podInformer := informerFactory.Core().V1().Pods()
```

## 3. 注册事件回调方法

```go
podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
    AddFunc: func(obj interface{}) {
        //...
    },
    UpdateFunc: func(_, newObj interface{}) {
        //...
    },
    DeleteFunc: func(obj interface{}) {
        //...
    },
})
```

对目标资源的不通变化做出的相应的处理，一般而言会将变化的对象保存在一个 workqueue 中，之后再启动指定数量的 worker，循环从这个 workqueue 中消费内容并做出逻辑处理。

## 4. 开始运行 informer

不需要单独运行每一个类资源的 informer，只需在生产 podInformer 的工厂类型中运行 `Run` 方法即可

```go
informerFactory.Start((stopCh))
```

## 5. 等待缓存同步完成

```go
cache.WaitForCacheSync(stopCh, c.podInformer.Informer().HasSynced)
```

初始化完毕之后有两种方式使用 informer，一种是在 `addEventHandler` 中添加的 handler 对资源的三种变化作出的相应，另一种则是使用 `informer.Lister` 来 Get 或 List 资源列表。
