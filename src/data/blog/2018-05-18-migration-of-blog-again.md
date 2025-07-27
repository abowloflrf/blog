---
author: Ruofeng Lei
slug: migration-of-blog-again
pubDatetime: 2018-05-18T02:29:00+08:00
title: 站点的又一次搬家
draft: false
tags:
  - 随想
description: ""
---

其实从去年年底开始就发现，站点上了 HTTPS 之后就会间歇性得无法访问，而同时 HTTP 访问却正常，初步觉得是位服务器于机场横行的日本，丢包拥塞极高导致的问题，于是就迁移过一次服务器，从日本到了美西，延迟上来了但是丢包低点不过访问暂时也正常了。

不过最近两个月又开始如此抽风，而且 V 站上也逐渐有发帖，有挺多人发现了这个情况，具体原因并不好查明，但是确实是国外一些服务商或 IP 会被重点照顾，在 TLS 握手的时候，只有一个 Client Hello，Server Hello 不知道死在了回国的哪一条路由上，导致 TLS 握手失败，Chrome 永远卡在 Establishing Secure Connection 上。作为个人技术博客，要回到 HTTP 确实会能稳定访问，可是似乎显得又不太合适，Not Secure 挂在地址栏过于丑陋。想着，再迁一次站吧，看看会不会好些吧，也许呢。

还好 Ghost 的迁移过程很顺利，需要备份的数据就两样：

1. 文本数据（直接在 Ghost 后台 export 打包成 json 就可以了，不需要去数据库备份）
2. 图片（content/images 打个包）

## 具体过程

1. 导出 json
2. 打包图片
3. 修改域名 DNS 指向新服务器
4. 新服务器安装 Node，ghost-cli 后新建一个站
5. 进入新站目录解压图片
6. 进入新站后台，导入 json
7. 使用`acme.sh`签新证书（顺便试试野卡）
8. 配置 Nginx 证书
9. `ghost config`将域名修改为`https`
10. 完成
