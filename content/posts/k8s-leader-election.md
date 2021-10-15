---
title: "Kubernetes 控制面组件高可用原理之 Leader Election"
slug: "k8s-leader-election"
tags: ["k8s"]
date: "2020-07-08T17:36:27+08:00"
---

Kubernetes 高可用集群的控制面组件里，除了 `kube-apiserver` 是多副本负载均衡同时提供服务之外，还有两个组件： `kube-scheduler` 和 `kube-controller-manager` ，它们虽然在三个 master 中均部署了三份副本，但是实际上只有一个在真正工作。三个组件如何在集群中相互协调决定哪一个真正工作，其背后原理是 leader election，使用了 `client-go` 中的 `tools/leaderelection` 包完成选举的行为。

## 基本概念

多个成员参与 leader election 的行为中，成为分为两类：

-   leader
-   candidate

其中 leader 为真正工作的成员，其他成员为 candidate ，它们并没有在执行工作而是随时等待成为 leader 并开始工作。在它们运行之初都是 candidate，初始化时都会去获取一个唯一的锁，谁抢到谁就成为 leader 并开始工作，在 `client-go` 中这个锁就是 apiserver 中的一个资源，资源类型一般是 `CoordinationV1()` 资源组中的 `Lease` 资源。

在 leader 被选举成功之后，leader 为了保住自己的位置，需要定时去更新这个 `Lease` 资源的状态，即一个时间戳信息，表明自己有在一直工作没有出现故障，这一操作称为续约。其他 candidate 也不是完全闲着，而是也会定期尝试获取这个资源，检查资源的信息，时间戳有没有太久没更新，否则认为原来的 leader 故障失联无法正常工作，并更新此资源的 holder 为自己，成为 leader 开始工作并同时定期续约。

## 三个时间参数

-   `leaseDuration` leader 续约一次的有效期
-   `RenewDeadline` 续租超时时间，leader 每次续租执行时间超过此时间认为失败，将 lease 释放
-   `RetryPeriod` leader 续约周期，candidate 循环获取锁的周期

## 源码

`kube-controller-manager` 组件在初始化时时如何使用 client-go 进行选举的，参考代码： https://github.com/kubernetes/kubernetes/blob/v1.18.5/cmd/kube-controller-manager/app/controllermanager.go#L245-L285

```go
// leaderElect 可选配置，通过命令行参数传入，若未开启直接运行run()开始工作
if !c.ComponentConfig.Generic.LeaderElection.LeaderElect {
    run(context.TODO())
    panic("unreachable")
}

// 开启 leaderElection，下面为使用leaderElection的步骤
// 首先为自己选定一个ID，此ID必须要在所有成员中是唯一的，这里使用 Hostname + UUID
id, err := os.Hostname()
if err != nil {
    return err
}
id = id + "_" + string(uuid.NewUUID())

// 创建一个资源锁，resourcelock也是client-go中的工具，选定哪个资源是leaderElection的竞争目标
rl, err := resourcelock.New(c.ComponentConfig.Generic.LeaderElection.ResourceLock,
    c.ComponentConfig.Generic.LeaderElection.ResourceNamespace,
    c.ComponentConfig.Generic.LeaderElection.ResourceName,
    c.LeaderElectionClient.CoreV1(),
    c.LeaderElectionClient.CoordinationV1(),
    resourcelock.ResourceLockConfig{
        Identity:      id,
        EventRecorder: c.EventRecorder,
    })
if err != nil {
    klog.Fatalf("error creating lock: %v", err)
}

// 开始进行选举，并注册回调函数
leaderelection.RunOrDie(context.TODO(), leaderelection.LeaderElectionConfig{
    Lock:          rl,
    LeaseDuration: c.ComponentConfig.Generic.LeaderElection.LeaseDuration.Duration,
    RenewDeadline: c.ComponentConfig.Generic.LeaderElection.RenewDeadline.Duration,
    RetryPeriod:   c.ComponentConfig.Generic.LeaderElection.RetryPeriod.Duration,
    Callbacks: leaderelection.LeaderCallbacks{
        OnStartedLeading: run,
        OnStoppedLeading: func() {
            klog.Fatalf("leaderelection lost")
        },
    },
    WatchDog: electionChecker,
    Name:     "kube-controller-manager",
})
```

## `client-go` 实现细节

代码位置 https://github.com/kubernetes/client-go/blob/v0.18.5/tools/leaderelection/leaderelection.go ，开始选举的入口函数为：

```go
leaderelection.RunOrDie(context, cfg)
```

Run 方法的核心逻辑，尝试获取资源，获取到则成为 leader，获取失败重试：

```go
func (le *LeaderElector) Run(ctx context.Context) {
	// 结束时，处理panic，以及调用StoppedLeading回调函数
	defer func() {
		runtime.HandleCrash()
		le.config.Callbacks.OnStoppedLeading()
	}()

	// loop，循环尝试获取锁，若已经有master拿到锁，则此candidate始终在此循环里没有返回
	if !le.acquire(ctx) {
		return // ctx signalled done
	}

	// 到这里说明此candidate已经成功获取到锁，并成为master正式开始工作
    // 调用开始的回调函数，一般控制器的入口函数会注册到此StartLeading回调函数中
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	go le.config.Callbacks.OnStartedLeading(ctx)

    // 也是一个循环，master在获取到锁之后也需要不停地去续租，相当于是发送心跳包表明自己在正常工作
	le.renew(ctx)
}
```

`acquire` 和 `renew` 两个方法的循环周期都是配置中的 `RetryPeriod` 参数，其中 `aquire` 的循环中调用的核心方法是 `tryAcquireOrRenew` 返回 true 表示拿到锁并成为了新的 leader，反之返回 false，自己还是 candidate，成功 aquire 之后便会退出循环:

```go
func (le *LeaderElector) tryAcquireOrRenew(ctx context.Context) bool {
    // 先实例化leaderElectionRecord 若真的获取到里就将资源更新为此实例
	now := metav1.Now()
	leaderElectionRecord := rl.LeaderElectionRecord{
		HolderIdentity:       le.config.Lock.Identity(),
		LeaseDurationSeconds: int(le.config.LeaseDuration / time.Second),
		RenewTime:            now,
		AcquireTime:          now,
	}

	// 1. 尝试获取目标资源，若没有找到，则说明还没有其他成员占用切成为leader，直接创建并更新即可
	oldLeaderElectionRecord, oldLeaderElectionRawRecord, err := le.config.Lock.Get(ctx)
	if err != nil {
		if !errors.IsNotFound(err) {
			klog.Errorf("error retrieving resource lock %v: %v", le.config.Lock.Describe(), err)
			return false
		}
		if err = le.config.Lock.Create(ctx, leaderElectionRecord); err != nil {
			klog.Errorf("error initially creating leader election record: %v", err)
			return false
		}
		le.observedRecord = leaderElectionRecord
		le.observedTime = le.clock.Now()
		return true
	}

	// 2. 获取到目标锁记录, 检查ID和时间
	if !bytes.Equal(le.observedRawRecord, oldLeaderElectionRawRecord) {
		le.observedRecord = *oldLeaderElectionRecord
		le.observedRawRecord = oldLeaderElectionRawRecord
		le.observedTime = le.clock.Now()
	}
    // holderID不为空 && 目标租约还没有过期 && ID不是自己，三项其中任何一项不满足都表明自己有资格成为leader
	if len(oldLeaderElectionRecord.HolderIdentity) > 0 &&
		le.observedTime.Add(le.config.LeaseDuration).After(now.Time) &&
		!le.IsLeader() {
		klog.V(4).Infof("lock is held by %v and has not yet expired", oldLeaderElectionRecord.HolderIdentity)
		return false
	}

    // 通过获取到的lease记录发现自己可以成为leader，下面开始执行成为leader的逻辑
	// 3. 若自己本身之前就是leader，则更新acquireTime，transition记录leader变化的次数
	if le.IsLeader() {
		leaderElectionRecord.AcquireTime = oldLeaderElectionRecord.AcquireTime
		leaderElectionRecord.LeaderTransitions = oldLeaderElectionRecord.LeaderTransitions
	} else {
		leaderElectionRecord.LeaderTransitions = oldLeaderElectionRecord.LeaderTransitions + 1
	}

	// 更新lease资源
	if err = le.config.Lock.Update(ctx, leaderElectionRecord); err != nil {
		klog.Errorf("Failed to update lock: %v", err)
		return false
	}

	le.observedRecord = leaderElectionRecord
	le.observedTime = le.clock.Now()
	return true
}
```

leader 在 `renew` 方法的循环中调用的实际上也是上面的 `tryAcquireOrRenew` 方法，只不过不出意外每次都到第 3 步更新一下时间续租即可。

## 自己尝试使用

近期写了一个小组件，收集 Kubernetes 集群中的 Events 并存入持久化储存如 ES 中以供快速查询。此组件本身并没有什么复杂度，实际上就是一个 informer + watch + workqueue 入库，可以算是一个自定义 controller 最基本简单的模型了。组件本身故障挂掉也不会有太大的影响，由 k8s 本身故障自愈重启启动 Pod 即可，虽然说可能会丢一些日志，但是问题也不算太大。但是开始尝试使用了 Leader Election 可能有一些大材小用吧，但是也当是熟悉练手了。

组件代码开源在 https://github.com/abowloflrf/k8s-events-dispatcher ，Leader Election 部分就在入口函数 `main.go` 中，实现可供参考。

## 参考

-   [Package tools/leaderelection Docs](https://pkg.go.dev/k8s.io/client-go/tools/leaderelection?tab=doc)
-   [kubernetes/client-go Example](https://github.com/kubernetes/client-go/blob/master/examples/leader-election/main.go)
