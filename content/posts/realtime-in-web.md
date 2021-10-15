---
title: "Realtime in Web - Polling/Websocket/SSE"
slug: "realtime-in-web"
tags: ["HTTP", "Web", "realtime"]
date: "2019-04-27T17:35:14+08:00"
---

## 实时性是什么？

HTTP 协议被认为是一种无状态协议：客户端发出请求，随之服务端对这次请求返回响应，一来一回为一次 HTTP 请求的过程。但是基本的 HTTP 请求往往无法高效优雅地满足 Web 中需要的各种功能。例如各种实时性要求的场景，在线聊天是最为经典的例子，A 发送消息给 B 后，B 如何能实时地拿到 A 发送的这条消息？按最简单最传统的思路，需要 B 的浏览器端去请求服务器看看是否有新的消息，HTTP 接口可能被设计成：

```
POST /send
{
  "to":"user_b",
  "msg":"hello"
}

GET /message
{
  "messages":[
    {
      "from":"user_a",
      "msg":"hello"
    }
  ]
}
```

用户 A 调用 send 发送消息，然后用户 B 的浏览器中有一个按钮 - **获取最新消息** 来调用 message 获取消息列表，这样 A 发送消息之后 B 没法直接知道谁在何时发送了消息，必须手动去点击按钮发送请求从服务器拉取消息，显然这样是一个很不合理的技术实现，完全不具有任何实时性。

要在 Web 中达到实时性首先需要需要思考它的实时性的根源问题：**服务端是知道一个事件发生的第一人，它如何将这个事件在第一时间让客户端（浏览器）知道？**

可以肯定的是做这件事只有两种最基本的方式：

1. Client Pull
2. Server Push

具体来说，Web 中有实现实时性的几种方式，本篇文章会对这些方法做一些简单的介绍：

1. Polling (Client Pull)
1. Websocket (Client Pull + Server Push)
1. SSE (Server Push)

## Polling

Polling 即所谓的轮询，是最基础的方式，它不需要额外的兼容性支持，最简单的 HTTP 协议就能完成，因此后面所要介绍的几种较为高级的实时性实现方式都会做一些 fallback 兼容的方法即退化到 Polling 方式以兼容不受支持的浏览器设备。

Polling 又可以细分为长轮询（Long Polling）和短轮询（Short Polling）。其中短轮询最好理解，就是每隔一段时间浏览器自动发送 HTTP 请求向服务端拉数据，但是这并没有做到太高的实时性，因为它取决于客户端的 interval，若 5 秒一次请求，那么在 3 秒时 A 发送的消息在 5s 时 B 才会去请求拿到消息，这样就有了 2s 的延迟，但是相比开头中所设计的让用户傻乎乎的点按钮至少进步了，即浏览器去每隔一段时间自动帮用户去点按钮。长轮询的出现则解决这个 2s 的延迟，提高实时性。连接在一开始 B 就发送了一个 HTTP 请求，在 A 还没有发消息时这个请求会一直阻塞，直到 A 发送了消息服务端就会立马将 A 发送的消息作为那个阻塞的 HTTP 请求的返回给 B。B 在收到 HTTP 响应之后又会立刻再发送 HTTP 请求如此往复。这样实时性就已经得到了非常大的提高，其延时就只在网络延迟、TCP 握手、SSL 握手等连接建立的时间消耗上了。

## Websocket

Websocket 是一个解决 Web 中实时性数据传输问题的最为广泛使用的方式。它使用 HTTP 协议进行握手，浏览器建立 Websocket 通信的 HTTP 请求头部如下：

```
GET /websocket HTTP/1.1
Host: 127.0.0.1:8000
Connection: Upgrade
Pragma: no-cache
Cache-Control: no-cache
Upgrade: websocket
Origin: http://127.0.0.1:8000
Sec-WebSocket-Version: 13
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7
Sec-WebSocket-Key: umeTOPSdULFnza3ucv1Izw==
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits

```

其中主要在 `Connection:Upgrade` 这个字段，告诉服务端要进行一次连接的**升级**，但是所谓升级，从网络协议栈上来看实际上是一次**降级**：从 7 层的 HTTP 协议**降级**为原始的 TCP 协议。服务端返回的状态码为 `101` :

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: 96PLAgW2q+VO9O7ubrmfQB6jhyY=
```

随后浏览器和服务端就以 Websocket 协议（[https://tools.ietf.org/html/rfc6455](https://tools.ietf.org/html/rfc6455)）在这个 TCP 连接上进行通信，不再是 HTTP 的形式而是 TCP 的形式进行数据传输。而且这个 TCP 连接可以是全双工的，也就是说不仅客户端可以发送 Frame，服务端还可以在这个 TCP 连接上向浏览器推送数据。相比 Polling，它的优势提升在：

1. 提供一个双向流同时支持 Server Push 和 Client Push
2. 一次 HTTP 握手后就建立了 TCP 连接，减少了 Polling 中重复的 HTTP 建立过程
3. 直接使用 TCP 连接传输数据，没有 HTTP 多余的头部信息，数据量小传输快

使用 Python 的 Sanic 框架中提供的 Webscoket：

```python
@app.websocket("/websocket")
async def feed(req, ws):
    while True:
        now = datetime.datetime.now().isoformat()
        await ws.send(json.dumps({"now": now}))
        await asyncio.sleep(5)
```

浏览器客户端中的使用也很方便，new 一个原生的 `Websocket` 类然后传入几个 on 事件的函数即可：

```javascript
//点击按钮与服务端建立Websocket连接
document.getElementById("btn-ws").onclick = () => {
    var loc = window.location;
    var ws_protocol = loc.protocol === "https" ? "wss://" : "ws://";
    var ws = new WebSocket(ws_protocol + loc.host + "/websocket");
    ws.onopen = (ev) => {
        console.log("Websocket open");
    };
    ws.onclose = (ev) => {
        console.log("Websocket close");
    };
    ws.onmessage = (ev) => {
        console.log(ev.data);
    };
};
```

使用 Chrome 开发者工具可直观看到 Websocket 的数据传输情况：

<img src="https://cdn.nlark.com/yuque/0/2019/png/110142/1556295570122-8e3fa857-1cf5-4dba-ad02-1203a3e8a607.png#align=left&display=inline&height=473&name=image.png&originHeight=946&originWidth=1092&size=161784&status=done&width=546" referrerpolicy="no-referrer">

## SSE(Server-Send-Events)

SSE 是一个比较少见的实现方案，这是我最近在做构建日志展示相关业务时想实时展示构建日志于是去看了我们所使用的构建系统 DroneCI 怎么实现的，才发现他们实时展示日志是使用的这个方案。相比 Websocket 它仅支持 Server Push，理解它的原理也比较简单，它还是基于一个正常的 HTTP 的请求，它利用 HTTP 协议传输数据是流式的特征，服务端在响应中去实时写内容，为了在这个流上区分消息和标示一些信息，这个标准只做了一些简单的约束：

以 `data: xxxx\n\n` 的形式传输数据，其中 xxxx 是内容， `\n\n` 来分割不同的消息，另外还提供两个可选的标示 `id: 1\n` 标识消息 id， `event: xxx\n` 标识时间类型，这样在 HTTP 流中一个完整的消息可能长这样：

```
id:1\n
event:message\n
data:helloworld\n\n
```

使用 Python 的 Sanic 框架的一个简单的写法如下：

```python
@app.get("/sse")
async def sse_handler(req):
    """
    Server-Send-Event
    """

    def sse_data(data: str, event: str = None, id: int = None) -> str:
        """
        组装sse信息
        """
        resp = "data: %s\n\n" % data
        if event is not None and event != "":
            resp = "event: %s\n" % event + resp
        if id is not None:
            resp = "id: %d\n" % id + resp
        return resp

    async def streaming(resp):
        for i in range(1, 10):
            now = datetime.datetime.now().isoformat()
            await resp.write(sse_data(data=json.dumps({"now": now}), event="timenow", id=i))
            await asyncio.sleep(5)

    return response.stream(streaming, content_type="text/event-stream")
```

客户端 JS 使用原生的 `EventSouce` （[https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)）对象：

```javascript
var source = new EventSource("/sse");
source.onopen = (e) => {
    // Event type=open
    console.log("SSE open");
};
source.onerror = (e) => {
    // Event type=error
    console.log("SSE error");
};
source.onmessage = (e) => {
    // MessageEvent type=message
    console.log("SSE message: " + e.data);
};
```

使用 Chrome 开发者工具观察 SSE 请求：

<img src="https://cdn.nlark.com/yuque/0/2019/png/110142/1556295615852-e1da3f52-c1e8-4b2e-b992-f15ef4b6ae91.png#align=left&display=inline&height=473&name=image.png&originHeight=946&originWidth=1060&size=111514&status=done&width=530" referrerpolicy="no-referrer">

因为它从原理上比 Websocket 要简单一些，因此若是只需要服务端推送数据的场景，比如上面所说的实时获取一些日志，使用 SSE 也是一种可选的方案。

## 一个很棒的时序图

有一个比较直观易懂的网络请求时序图去对比了解其中几种方式的原理：

<img src="https://cdn.nlark.com/yuque/0/2019/png/110142/1556296076171-ffc00850-9eee-498d-9760-1d9952f75b90.png#align=left&display=inline&height=385&name=image.png&originHeight=769&originWidth=1059&size=89897&status=done&width=529.5" referrerpolicy="no-referrer">

## 参考

1. [https://codeburst.io/polling-vs-sse-vs-websocket-how-to-choose-the-right-one-1859e4e13bd9](https://codeburst.io/polling-vs-sse-vs-websocket-how-to-choose-the-right-one-1859e4e13bd9)
2. [https://tools.ietf.org/html/rfc6455](https://tools.ietf.org/html/rfc6455)
3. [https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
