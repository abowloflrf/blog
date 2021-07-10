---
title: "client-go 阅读 01 Listwatch"
slug: "client-go-01-listwatch"
tags: ["client-go"]
date: 2021-07-10T20:37:16+08:00
---

首先参考 k8s api 概念

-   https://kubernetes.io/zh/docs/reference/using-api/api-concepts/

## resourceVersion

每一个资源对象都有其 resourceVersion，代表该资源的版本，当请求资源时，server 的响应中会包含 resourceVersion 的值，此值用于向服务端发送 watch 请求，server 则会根据提供的 resourceVersion 返回此版本号之后的所有变更。当客户端断开链接时，也可以从最后返回的 resourceVersion 重新建立链接并请求，以至于不会错过其中的消息

**使用 etcd3 的 k8s 集群中默认保留过去 5min 的变更记录**

## BOOKMARK

由于 5min 时间窗口太短，比如客户端 watch 时 10min 都没有变化，当此时重连后上次的 resourceVersion 已经是 10min 前的了，server 会报错（410 GONE），导致客户端只能重新全量 list 并重新开始 watch。

因此引入了 BOOKMARK 的概念，BOOKMARK 服务端对 watch 请求的一种响应，其 body 只有 resourceVersion，用于标识一下改版本之前的所有变更都已经推送，客户端需要在 watch 时提供 `ListOptions{AllowWatchBookmarks: true}` 选项。
