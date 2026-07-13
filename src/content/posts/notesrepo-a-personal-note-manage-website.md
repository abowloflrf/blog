---
author: Ruofeng Lei
slug: notesrepo-a-personal-note-manage-website
pubDatetime: 2018-02-19T22:10:06.000+08:00
title: NotesRepo 一个简单的个人笔记管理站点
featured: false
draft: false
tags:
  - PHP
description: ""
---

年前刚放寒假在家那几天，趁着一股放假的兴奋劲头和精力，花了大概不刀一周的时间，想再次使用 Laravel 进行一次比较彻底的前后端分离全栈开发体验。站点内容就是这个，目标是个人笔记管理，支持账号系统，文件夹分类，Markdown 语法，笔记公开发布为单个页面以共享传播内容。现在这个项目的基本功能已经实现的差不多，我便将它部署在了自己的服务器上，注册了域名[http://notesrepo.com](http://notesrepo.com) ，喜欢的朋友可以体验以下，源代码也公开在了我的 Github [abowloflrf/notesrepo](https://github.com/abowloflrf/notesrepo)

其实这个网站很大程度上是受到了[Notion.so](https://www.notion.so/)它的影响，不夸张地说，这 notion.so，这个产品，是我有史以来使用过的众多笔记管理产品中最为好用且好看的，各个方面的功能几乎以及做到了完美（除了无限空间 8 美元美刀的高昂价格，它刚推广时，还有邀请注册得永久无限空间的活动，可惜当时没珍惜这个活动，现在却没了，后悔死，要不这里果断放上 ref 链接）。自己写的这个玩意儿呢也是一种学习，往后自己可能也许会在逐渐的学习中慢慢打磨这个产品，是它更加的完善好用，可能也不会吧。

另外：**千万不要有任何人将我的这个小站当作自己真正的笔记本了，我对其数据库储存没有任何保障，很有可能在开发过程中会随时 drop database，若因此带来麻烦，本人概不负责**

## 简介

NotesRepo [http://notesrepo.com](http://notesrepo.com) 是一个使用 Larvel 5.5 开发，前端使用 VueJS 框架，使用 Element-UI 组件，前后端分离的一个个人笔记 Web 站点。此网站主要内容是`/workspace`这个单页面 web app，是学习 Laravel 过程中第一个使用 vue 前后端分离开发的学习结果。

## 关于前端

由于并不是专注前端，VueJS 并没有学习的太深入，仅仅只是一个基本了解使用的情况，加上本 app 的前端逻辑也不是过于复杂，没有贯彻 Vue 渐进式、组件化开发的理念，只仅仅当作了一个写前端页面的工具，也没有使用 Vue 全家桶中的**路由 vue-routes**和**状态管理 vuex**，因此整个 Vue 实例都只是 Element-UI 的堆砌，模板与逻辑都写在了一整个`App.vue`文件中。

Makedown 编辑器使用的是[F-loat/vue-simplemde](https://github.com/F-loat/vue-simplemde)

## 关于后端

在后端 Web api 的开发中，api 认证使用的是 jwt 认证，使用了 laravel 的[tymondesigns/jwt-auth](https://github.com/tymondesigns/jwt-auth)这个包，在用于登陆表单操作时使用的传统的 Cookie Session 认证，以为跳转到**workspace**认证用户。在提交登陆表单时，同时也请求了 auth api 获取了一个 token 储存在浏览器的`localStorage`中，以为每次 api 请求储存认证信息，每次发送请求都会附带这个 api。

## [路由总览](https://github.com/abowloflrf/notesrepo/wiki/%E8%B7%AF%E7%94%B1)

## 一些预览

### Workspace 总览

![preview-workspace](https://ruofeng.me/content/images/2018/02/preview-workspace.png)

### 新建笔记

![preview-new](https://ruofeng.me/content/images/2018/02/preview-new.png)

### 新建文件夹

![preview-new-folder](https://ruofeng.me/content/images/2018/02/preview-new-folder.png)

### TODO

![preview-todo](https://ruofeng.me/content/images/2018/02/preview-todo.png)

### 发布笔记

![preview-publish](https://ruofeng.me/content/images/2018/02/preview-publish.png)

### 成功发布的笔记

![preview-post](https://ruofeng.me/content/images/2018/02/preview-post.png)
