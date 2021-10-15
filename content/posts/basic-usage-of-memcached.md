---
title: "将 Memcached 作为数据库缓存"
slug: "basic-usage-of-memcached"
tags: ["PHP", "Memcached"]
date: "2018-05-16T17:20:06+08:00"
---

高性能缓存数据库一般我们使用的有两种，一个是 Redis，一个就是 Memcached，其中 Redis 支持 5 种不同的数据类型操作，除了缓存外还支持数据持久化，甚至可以当作一个高性能 K-V 数据库来使用；Memcached 则是一个更加纯粹的缓存，只有 K-V 储存结构，不支持持久化，使用起来也非常简单。

在 Memcached [官网](http://memcached.org/about) 中是这样描述它的：

> memcached is a high-performance, distributed memory object caching system, generic in nature, but originally intended for use in speeding up dynamic web applications by alleviating database load.

## PHP 中的使用

在 PHP 中使用 Memcached 有两种方式：

-   [memcached](https://secure.php.net/manual/zh/class.memcached.php) 使用 libmemcached 实现，支持操作多性能高
-   [memcache](https://secure.php.net/manual/zh/book.memcache.php) 使用纯 PHP 实现，最初的 PHP 操作 memcached 扩展

这里直接使用 C 语言实现的 PHP 扩展 php-memcached，为了方便直接只用包管理工具安装：

```shell
sudo apt install memcached
sudo apt install php-memcached
```

## 使用举例

在了解到 Memcached 的基本使用操作之后，我在之前写过的一个[短链实现](https://github.com/abowloflrf/url-shortener)中加入的一层缓存的操作，在短链数据量巨大时每次从一个巨大的表中查询一条短链明显会非常耗时，而在这种典型的 读>>写 的操作中，使用缓存是一个很不错的选择。

### 典型的缓存使用流程图

![flowchart](https://dev.mysql.com/doc/refman/5.6/en/images/memcached-flow.png)

### 在 Slim Framework 中加入依赖

在`dependencies.php`中加入：

```php
//Memcached
$container['memcached'] = function ($container) {
    $mc = new Memcached();
    $mc->addServer("127.0.0.1", 11211);
    return $mc;
};
```

### 加入缓存使用逻辑

最初实现的短链接跳转中，是很直接的读取到路由中的参数然后将这个参数在 MySQL 中查询对应的完整链接返回然后跳转，现在加入缓存机制后，首先是在 Memcached 中查询短链接对应的缓存是否存在，若存在则直接读取数据并返回跳转即可，若不存在则在 MySQL 中查询，得到完整链接后，将这条记录种在 Memcached 中，再返回响应。

```php
    //使用Mamcached作为缓存
    public function redirect(Request $request, Response $response, array $args)
    {
        //短域名格式不匹配，返回404
        if (!preg_match('/^[a-zA-Z0-9]{6}$/', $args['url'])) {
            return $response->withStatus(404)
                ->withHeader('Content-Type', 'text/html')
                ->write('404 Page not found');
        }
        //从缓存中查找
        $inCache = $this->mc->get('url_' . $args['url']);
        if ($inCache) {
            return $response->withRedirect($inCache, 301);
        } else {
            //从数据库中查询完整域名并跳转
            $result = $this->url->where('url_short', $args['url'])->first();
            if ($result) {
                //种缓存
                $this->mc->set('url_' . $args['url'], $result->url_full);
                //跳转到目标链接
                return $response->withRedirect($result->url_full, 301);
            }
            //未查询到域名则跳转到首页
            else {
                return $response->withRedirect('/', 301);
            }
        }
    }
```

## 对比压测

我同时保留了一个不读取缓存的路由`/s/URL_S`，来与加入缓存后进行对比测试:

-   ab -n1000 http://127.0.0.1:8080/mN8r9q

```plain
Concurrency Level:      1
Time taken for tests:   2.388 seconds
Complete requests:      1000
Failed requests:        0
Non-2xx responses:      1000
Total transferred:      349000 bytes
HTML transferred:       0 bytes
Requests per second:    418.83 [#/sec] (mean)
Time per request:       2.388 [ms] (mean)
Time per request:       2.388 [ms] (mean, across all concurrent requests)
Transfer rate:          142.75 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.0      0       0
Processing:     2    2   1.2      2      30
Waiting:        0    2   1.2      2      30
Total:          2    2   1.2      2      30

Percentage of the requests served within a certain time (ms)
  50%      2
  66%      3
  75%      3
  80%      3
  90%      3
  95%      3
  98%      4
  99%      4
 100%     30 (longest request)
```

-   ab -n1000 http://127.0.0.1:8080/s/mN8r9q

```plain
Concurrency Level:      1
Time taken for tests:   3.537 seconds
Complete requests:      1000
Failed requests:        0
Non-2xx responses:      1000
Total transferred:      349000 bytes
HTML transferred:       0 bytes
Requests per second:    282.73 [#/sec] (mean)
Time per request:       3.537 [ms] (mean)
Time per request:       3.537 [ms] (mean, across all concurrent requests)
Transfer rate:          96.36 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.0      0       0
Processing:     2    3  17.9      3     567
Waiting:        2    3  17.7      3     564
Total:          2    4  17.9      3     567

Percentage of the requests served within a certain time (ms)
  50%      3
  66%      3
  75%      3
  80%      3
  90%      3
  95%      4
  98%      4
  99%      5
 100%    567 (longest request)
```

每秒请求分别为**418**与**282**，不过由于 MySQL 本身就应该有查询缓存的机制，差距可能不是太明显，不过显然性能差距还是在这里体现出来了。
