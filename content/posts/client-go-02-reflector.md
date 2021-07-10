---
title: "client-go 阅读 02 Reflector"
slug: "client-go-02-reflector"
tags: ["client-go"]
date: 2021-07-10T20:38:16+08:00
---

作用：watch 指定的资源，并将所有变化反射到指定的存储结构。简单来说就是保持本地存储与远端存储一致。

构造一个 `refector` 需要如下参数：

-   ListWatcher 接口
    -   `List(options metav1.ListOptions) (runtime.Object, error)`
    -   `Watch(options metav1.ListOptions) (watch.Interface, error)`
-   Store 接口，实现一些基本的增删改查等基本接口，其中 informer 使用的 `sharedInformer` 传入的是 `DeltaFIFO`
-   expectedType
-   resyncPeriod 定期同步周期

## Run

```go
func (r *Reflector) Run(stopCh <-chan struct{}) {
	wait.BackoffUntil(func() {
		if err := r.ListAndWatch(stopCh); err != nil {
			r.watchErrorHandler(r, err)
		}
	}, r.backoffManager, true, stopCh)
}
```

## ListAndWatch

其中的 `ListAndWatch` 内部主要有两个逻辑：

-   对于传入了 resync 周期的 reflector， go for select loop 用于从 `resyncChan` 中循环读取消息并决定对 store 进行 `Resync` 操作
-   for select loop 调用 listWathcer 的 Watch 方法并在 `watchHandler` 中处理 watch 信息，并分别根据不通的事件类型发送到 reflector 内部的 store 中，即上面所创建的 DeltaFIFO 队列

在 `watchHandler` 中也是一个大 loop，循环从 watcher 的 ResultChan 中取得 server 的更新 event，并保留每次更新的 resourceVersion，当异常退出 loop 时会重新传入此版本号发送建立 watch 请求

## watchHandler

```go
// watchHandler watches w and keeps *resourceVersion up to date.
func (r *Reflector) watchHandler(start time.Time, w watch.Interface, resourceVersion *string, errc chan error, stopCh <-chan struct{}) error {
// ...
loop:
	for {
		select {
		case <-stopCh:
			return errorStopRequested
		case err := <-errc:
			return err
		case event, ok := <-w.ResultChan():
			if !ok {
				break loop
			}
			// ...
            // 通过 meta 拿到最新结果的 resourceVersion
			meta, err := meta.Accessor(event.Object)
			if err != nil {
				utilruntime.HandleError(fmt.Errorf("%s: unable to understand watch event %#v", r.name, event))
				continue
			}
			newResourceVersion := meta.GetResourceVersion()

            // watch 返回的结果可能会有不通的时间，reflector 对不同时间做出不同处理
			switch event.Type {
			case watch.Added:
				err := r.store.Add(event.Object)
				// ...
			case watch.Modified:
				err := r.store.Update(event.Object)
				// ...
			case watch.Deleted:
				err := r.store.Delete(event.Object)
                // ...
			case watch.Bookmark:
                // Bookmark 事件仅仅是 server 定时发送的一个标记，内容只包含最新的 resourceVersion，refector 仅对当前的 resourceVersion 做出更新，以在意外退出时使用最新的 resourceVersion 继续 watch，因为 etcd 只保留 5min 的历史版本，定期使用 Bookmark 请求的意义即为时刻保持最新的 resourceVersion，避免资源长时间不更新再次 watch 时造成版本落后太久而 list 全量的数据
				// A `Bookmark` means watch has synced here, just update the resourceVersion
			default:
				utilruntime.HandleError(fmt.Errorf("%s: unable to understand watch event %#v", r.name, event))
			}
            // 每次得到 watch 结果后更新最新的 resourceVersion
			*resourceVersion = newResourceVersion
			r.setLastSyncResourceVersion(newResourceVersion)
			if rvu, ok := r.store.(ResourceVersionUpdater); ok {
				rvu.UpdateResourceVersion(newResourceVersion)
			}
			eventCount++
		}
	}
    // ...
}
```

## 定时同步

定时同步机制 `resyncChan` 使用 Timer 而非 Ticker 实现，初次运行同步一次数据后 newTimer 然后等待下一次 timer，再次执行同步结束后 Stop 改 timer，并再 NewTimer 开始及时，以此循环。

同步数据具体执行仅仅调用了 `store.Resync()` 接口，没有其他逻辑。
