---
title: "client-go 阅读 01 Listwatch"
slug: "client-go-01-listwatch"
tags: ["client-go"]
date: 2021-07-10T20:37:16+08:00
---

informer 本质是基于 k8s **ListWatch** API 所实现的，其中 List 比较简单直接列出服务端所有满足条件的资源列表，Watch 则是于 apiserver 建立一个长链接，当指定资源发生变化时，服务端及时将变化的资源推送给客户端，首先看看 k8s API 概念

-   https://kubernetes.io/zh/docs/reference/using-api/api-concepts/

首先要了解 WATCH API ，有两个重要概念

## resourceVersion

每一个资源对象都有其 resourceVersion，代表该资源的版本，当请求资源时，server 的响应中会包含 resourceVersion 的值，此值用于向服务端发送 watch 请求，server 则会根据提供的 resourceVersion 返回此版本号之后的所有变更。当客户端断开链接时，也可以从最后返回的 resourceVersion 重新建立链接并请求，以至于不会错过其中的消息

**使用 etcd3 的 k8s 集群中默认保留过去 5min 的变更记录**

## BOOKMARK

由于 5min 时间窗口太短，比如客户端 watch 时 10min 都没有变化，当此时重连后上次的 resourceVersion 已经是 10min 前的了，server 会报错（`410 GONE`），导致客户端只能重新全量 list 并重新开始 watch。

因此引入了 BOOKMARK 的概念，BOOKMARK 服务端对 watch 请求的一种响应，用于定期推送服务端的最新 resourceVersion，因此其 body 只有 resourceVersion，用于标识一下改版本之前的所有变更都已经推送，客户端随时保留此版本号以便在下次重新 watch 时不会失联太久导致重新全量更新。客户端需要在 watch 时提供 `ListOptions{AllowWatchBookmarks: true}` 选项。

## Watch API

使用 clientset 调用 Watch API，会返回一个 `WatchInterface`，其中有两个方法：

```go
type Interface interface {
	Stop()
	ResultChan() <-chan Event
}
```

`ResultChan()` 返回一个结果接受 channel，资源有变化时会在此 channel 中收到响应的 Event，Event 结构包括

-   `EventType` 如 `ADDED`、`MODIFIED`、`BOOKMARK` 等，表示目标资源发生了何种变化是新增的还是被修改了等
-   `Object` 目标对象最新的完整信息

`Stop()` 方法，想要走主动终止此次 WATCH 时调用
