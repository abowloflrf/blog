---
author: Ruofeng Lei
slug: how-to-evaluate-a-vps
pubDatetime: 2017-11-14T21:23:41.000+08:00
modDatetime:
title: 一台海外 VPS 网络质量测试的基本步骤
featured: false
draft: false
tags:
  - Linux
description: ""
---

自从十月份以来，自己长期使用的一些 vps 都断断续续开始抽风，甚至是自己挂网站的服务器也是经常访问不了，就连科学上网工具也大多失效，直至我写这篇文章的今天 2017-11-14，依然如此，自己前段时间挂了脚本在校园网环境（北京）监控过自己 vultr，linode，digitalocean 这三大家在程序员圈子里比较有名的 vps 服务商的 ip，监控端口为 80，443，22，结果发现可用率不超过 50%，于是便决心放弃这三家被国人玩坏的知名服务商另寻出路了。

其实我首先是用上 Google 的 Google Cloud Platform，用着注册送的 300 美元开了一家 asia-east-2 的小主机，发现网速十分快，到大陆的三网延迟均在 50 上下，下载速度也十分理想，本决定是它了，结果仔细看了看价格，最低配置是 0.2 个 cpu,0.6g 内存每个月为 5 美元，流入中国的流量每 G 要 0.23 美元，这一下算过来这么差的配置跑一个月得用十几刀，想想自己也消费不起还是放弃了。就是从这时走上了寻找小众厂商的道路，写这篇文章也是总结了以下我购买一台 vps 之后测试它是否符合我的网络使用需求的一般步骤。

## 创建新用户

买下一台服务器后服务商一般是提供给一个 root 账号以供 ssh 登陆，密码有随机数也有自己初始化的，不过最好还是自己新建一个非 root 账户使用：

```bash
# 新建一个<user>用户，之后会提示输入用户名信息等，会自动创建一个/user/<user>的目录
adduser <user>
# 将刚刚新建的用户授予管理员权限
usermod -aG sudo <user>
```

## 更新系统

一般我选择的是 Ubuntu 16.04 64bit，因此下面的所有步骤都是基于此系统

```bash
sudo apt update
sudo apt upgrade
```

## 更新内核

需要一台有高质量网络的服务器，我会选择开始防止网络拥塞的 bbr 选项，经过我的几次测试发现真的挺管用的，不过这一选项需要在 linux 内核版本为 4.9 及以上才能开启，这里说明如何升级内核：

进入 http://kernel.ubuntu.com/~kernel-ppa/mainline 选择合适版本的内核，如你选择了 4.9.61，则进入后复制这三个下载链接

http://kernel.ubuntu.com/~kernel-ppa/mainline/v4.9.61/linux-headers-4.9.61-040961_4.9.61-040961.201711080535_all.deb

http://kernel.ubuntu.com/~kernel-ppa/mainline/v4.9.61/linux-headers-4.9.61-040961-generic_4.9.61-040961.201711080535_amd64.deb

http://kernel.ubuntu.com/~kernel-ppa/mainline/v4.9.61/linux-image-4.9.61-040961-generic_4.9.61-040961.201711080535_amd64.deb

使用`wget`命令下载到 vps 上并执行

```bash
sudo dpkg -i *.deb
```

安装完毕后，更新引导并重启

```bash
sudo update-grub
sudo reboot
```

删除旧的内核 (4.4)

```bash
sudo dpkg -l|grep linux-image
sudo apt-get purge linux-image-4.4*
```

检查是否已经是最新的内核

```bash
uname -r
```

## 开启 BBR

```bash
# 切换到管理员权限
sudo su

# 写入配置
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf

# 保存配置
sysctl -p

sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control

# 检查是否有bbr模块，若出现则生效
lsmod | grep bbr
```

## 延迟与丢包测试

延迟与丢包测试我一般会使用 http://ping.chinaz.com/ 测试全国延迟情况，以及 http://ping.pe 测试延迟与丢包，若美国西部地区 250ms 以下为佳，日本以 150ms 为佳，香港台湾地区以 100ms 以下为佳，最好三网都比较好，尽量不要出现某一家延迟巨大。测试丢包时 http://ping.pe 尽量一片绿最好，偶尔几个红色冒出来也可以接受。

## 安装 nginx 测试下载速度

```bash
sudo apt update
sudo apt install nginx
```

在 nginx 的默认网站根目录下放较大的二进制文件，在生成大文件时可以顺便观察以下磁盘的 io 速度，不过我的重点实在网络质量，普通每秒几十 m 的机械硬盘我都可以接受，而且现在大部分都提供了 ssd，速度都不会太差

```bash
cd /var/www/html
sudo dd if=/dev/zero of=2M.bin bs=1M count=2
sudo dd if=/dev/zero of=100M.bin bs=1M count=100
```

使用 https://www.17ce.com/ 输入你的`ip/2M.bin`测试全国 get 的速度，若失败，检查以下你服务商的服务器防火墙选项查看 80 端口是否打开，跑完测试结果后全国平均下载速度在 1m/s 以上为佳，500k/s，也可以接受，与延迟测试同理，三大运营商中不要有特殊情况，速度质量平均最好。

之后也会在自己所处的网络环境访问一遍`ip/100M.bin`看看自己的下载速度怎么样。

## 本地网络环境测试

因为自己的校园网总抽风和普通的三网或 4g 都有点不同，所以自己也会使用校园网跑一遍本看看 80 端口正不正常，内容如下，跑个两小时若没有出现 100% 失败的情况那就没问题了

```bash
#!/bin/bash
DATE_LOG=`date "+%Y-%m-%d-%H-%M"`
while true
do
DATE_N=`date "+%Y-%m-%d %H:%M:%S"`
echo "$DATE_N" >> ping_$DATE_LOG.log
echo "========================" >> ping_$DATE_LOG.log
echo "ld.lrf.pw">>ping_$DATE_LOG.log
~/paping -p 80 -t 2000 -c 5 --nocolor YOURIPHERE | grep -E 'Average|Failed' >> ping_$DATE_LOG.log
sleep 60
done
```
