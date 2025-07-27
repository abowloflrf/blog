---
title: "为了安全 - 使用密钥代替密码登陆服务器"
slug: "login-with-public-key-instead-of-password"
tags: ["Liunx"]
pubDatetime: 2017-12-17T16:44:00+08:00
description: ""
---

在云服务触手可得的时代，作为程序员们常常都持有一台或者多台属于自己的服务器，但是由于自己运维经验不足或者安全意识不足常常将自己的服务器的登陆密码设置的十分简单或多台服务器密码一样。服务器不同于网站，各大网站账户若泄露了密码往往还有机会通过各种方式找回，但是一旦服务器密码被泄露而恰巧这个用户又有 sudo 权限，那么这台服务器的数据就完全暴露给了别人，数据丢失，服务器挂马，被拿去挖矿，当肉鸡去 ddos，有无限被拿去作恶的可能。

而在改用公钥登陆后，只要自己的私钥文件保存的足够好，任何必须要有你的私钥文件才能够登陆，也可以设置密码让别人拿到公钥没有密码也无从登陆。

## 在客户端上生成密钥

```shell
$ ssh-keygen -t rsa #生成密钥对
Generating public/private rsa key pair.
Enter file in which to save the key (/home/ruofeng/.ssh/id_rsa): #密钥储存地址，默认为~/.ssh
Enter passphrase (empty for no passphrase): #密钥的密码，留空表示不设置密码
Enter same passphrase again:
```

客户端生成完后，若为修改路径和名称密钥默认被对存储在用户目录的`.ssh`目录下分别为`id_rsa`，`id_rsa.pub`私钥和公钥。这里的公钥是被用来上传到所要登陆的服务器，私钥自己留存在本地千万不要泄露。

## 将公钥上传到服务器并设置文件权限

使用 ftp 或其他方式将客户端生成的 rsa 公钥上传到服务器

```shell
$ cat id_rsa.pub >> ~/.ssh/authorized_keys #将上传的公钥添加到服务器的认证的密钥中
```

若服务器用户目录没有`.ssh`这个目录可以手动创建并确认只有用于自己拥有其权限，最好设置为只有自己可读其他用户没有任何权限

```shell
$ chmod 400 ~/.ssh/authorized_keys
```

为保证文件权限不会被更改，再设置 immutable 权限

```shell
# chattr +i ~/.ssh/authorized_keys
```

又为防止`.ssh`目录被重命名然后新建新的`.ssh`目录，再为目录文件设置 immutable 权限

```shell
# chattr +i ~/.ssh
```

在需要添加新的公钥时，移除`authorized_keys`的 immutable 权限之后添加新的 key，然后再加上 immutable 权限

## 配置 ssh_config 禁用密码登陆

修改`/etc/ssh/sshd_config`配置

```
# 禁用密码登陆
PasswordAuthentication no
ChallengeResponseAuthentication no
# 确保ssh开启公钥认证及RSA认证
RSAAuthentication yes
PubkeyAuthentication yes
# 最好注意不允许root用户登陆
PermitRootLogin no
```

修改完成后重启 ssh 服务就可以使用私钥登陆远程服务器

```shell
$ service ssh restart
```

## ssh 客户端使用私钥登陆

```shell
$ ssh -i [私钥文件在本地机上的存储路径] <username>@<hostname>
```
