---
title: "在 k8s 中对指定 Pod 进行抓包"
slug: "capture-packets-in-kubernetes"
tags: ["k8s"]
pubDatetime: 2018-09-19T17:31:14+08:00
description: ""
---

近日在研究微服务架构中的 [Distributed Tracing](https://istio.io/docs/tasks/telemetry/distributed-tracing/) 时，遇到了一些问题，需要深入到底层去进行网络抓包分析报文。但是应用时运行在 k8s 集群中的，与传统的在一台机器上跑一个进程直接通过 tcpdump 抓包方式略有不同。最初对容器的理解不深刻认为一定要进入到这个容器抓包，而进入容器内并没有 tcpdump 等基础工具，相当于自己还是把容器当作虚拟机在看待。而实际上 **它们只是在宿主机上不同 namespace 运行的进程而已** 。因此要在不同的容器抓包可以简单地使用命令切换 network namespace 即可，可以使用在宿主机上的 tcpdump 等应用。

## 查看指定 pod 运行在哪个宿主机上

    kubctl describe pod <pod> -n mservice

## 获得容器的 pid

    docker inspect -f {{.State.Pid}} <container>

## 进入该容器的 network namespace

    nsenter --target <PID> -n

## 使用 `tcpdump` 抓包，指定 eth0 网卡

    tcpdump -i eth0 tcp and port 80 -vvv

## 或者直接抓包并导出到文件

    tcpdump -i eth0 -w ./out.cap

## 从远程 scp 到本地

    scp ruofeng@ipaddr:/home/ruofeng/out.cap ./

之后在 Wireshark 中可以打开文件非常直观得查看过滤抓到的数据。
