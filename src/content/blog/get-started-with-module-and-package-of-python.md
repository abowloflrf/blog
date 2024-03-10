---
title: "简单接触 Python 中的模块 module 与包 package"
slug: "get-started-with-module-and-package-of-python"
tags: ["Python"]
pubDatetime: 2018-10-21T17:32:27+08:00
description: ""
---

最近在接触一个重构项目，主要是进行一次语言的切换，从 PHP 迁移到 Python。对于 Python 这门语言自己此前只是非常简单地接触过，仅限于写了一些单文件算法练手等等，并没有实际使用它做过工程项目。这次要从零开始对一个项目进行重构，这个时候编码的任务往往是最不重要的，更多的是对与其整个项目结构的设计与思考。因此，了解 Python 的模块与包的机制成了第一个要仔细了解的任务。

## Module

一个**模块**是一个单独的 Python 文件，模块名即为文件名，在这个模块中可以使用全局变量`__name__`来访问模块名。例如现在有两个文件一个入口文件`app.py`与另外编写的一个简单的模块`firstmode.py`

```python
# firstmode.py
first_var = 100

def firstfunc1():
    print('hello from func1')
    print('I\'m in ' + __name__)

def firstfunc2():
    print('hello from func2')

def _privatefunc3():
    print('i m a private func')

class FirstClass():
    pass
```

在`app.py`中可以这样引入这个模块，这样模块中所定义的变量、函数则可以在其中使用模块名调用， 在 vscode 中自动补全还有`_privatefunc3`，但是实际上在 Python 中以下划线开头的函数是被约定为私有的，并不允许从模块外调用。

![](https://cdn.nlark.com/yuque/0/2018/png/110142/1540125502512-assets/web-upload/29b3add0-d581-4c30-bc16-77850be52e17.png)

或者只想引入这个模块中的某一个函数，为了减少引入多余部分的开始，还可以使用：

```python
from firstmod import firstfunc1

# 就可以直接使用firstfunc1名字了不用加上模块名来限定
firstfunc1()
```

还有更多方式：

```python
# 逗号分隔以引入一个模块中的多个内容
from firstmod import firstfunc1, firstfunc2
# 引入了firstmod中的所有内容，且使用时不需要在前面加上模块名
from firstmod import *
# 为引入的内容设定一个别名，在下面直接使用自定义的别名func1就可以
from firstmode import firstfunc1 as func1
```

## Package

Package(包)，是 Python 中用于组织多个模块的方式，可以使用形如`A.B`的方式使用，意味子模块`B`位于名为`A`的包中。定义一个包需要新建一个目录为包名，在目录下必须有一个`__init__.py`的文件，用于初始化一些引入包的工作，一般可以留空。下面有一个简单的目录结构。

```
.
├── app.py
├── firstmod.py
└── mypackage
    ├── __init__.py
    ├── secondmod.py
    └── subpackage1
        ├── __init__.py
        └── thirdmod.py
```

定义了多个层级的包来管理模块，为了简单，在 secondmode 中只定义了一个`second_var`的变量，`thirdmod.py`中只定义了`third_var`变量。那么在入口文件`app.py`，则可以这样使用：

```python
# 只引入最上层的包
import mypackage
# 可以调用这个包下的所有子模块的内容
print(mypackage.secondmod.second_var)
# 但是这样调用包下面的子包下的模块的内容就会出错
# AttributeError: module 'mypackage' has no attribute 'subpackage1'
print(mypackage.subpackage1.thirdmod.third_var)

# 使用from
from mypackage import secondmod
print(secondmod.second_var)
```

简而言之，使用`from a import b`，若`a`是一个模块名，那么就引入了模块`a`下的一个名为`b`的函数、变量、或类；若`a`是一个包名，那么就引入了包`a`下的一个模块`b`。

## `*`的使用

很多时候为了方便在引入包时使用`*`，但是它并不是一个好方法，因为这样使用不可控且可读性差，若一定要使用`*`，可以在模块下定一个 list`__all__`，如在`firstmod.py`中定义一个：

```python
__all__ = ['firstfunc1', 'firstfunc2']
```

那么在使用`from firstmod import *`时，就只有定义在`__all__`中的两个方法被引入了。

## 相对引入

就如在表示目录时使用`.`表示当前目录，`..`表示上一级目录一样，Python 在 import 时也可以有这样的操作

```python
# 在thirdmod.py中
from .. import secondmod
print(secondmod.second_var)
```

## `dir()`

内置函数`dir()`可以查看在当前模块中定义了哪些名字，或者可以使用参数指定一个模块

```python
>>> import flask
>>> dir(flask)
['Blueprint', 'Config', 'Flask', 'Markup', 'Request', 'Response', 'Session', '__builtins__', '__cached__', '__doc__', '__file__', '__loader__', '__name__', '__package__', '__path__', '__spec__', '__version__', '_app_ctx_stack', '_compat', '_request_ctx_stack', 'abort', 'after_this_request', 'app', 'appcontext_popped', 'appcontext_pushed', 'appcontext_tearing_down', 'before_render_template', 'blueprints', 'cli', 'config', 'copy_current_request_context', 'ctx', 'current_app', 'escape', 'flash', 'g', 'get_flashed_messages', 'get_template_attribute', 'globals', 'got_request_exception', 'has_app_context', 'has_request_context', 'helpers', 'json', 'json_available', 'jsonify', 'logging', 'make_response', 'message_flashed', 'redirect', 'render_template', 'render_template_string', 'request', 'request_finished', 'request_started', 'request_tearing_down', 'safe_join', 'send_file', 'send_from_directory', 'session', 'sessions', 'signals', 'signals_available', 'stream_with_context', 'template_rendered', 'templating', 'url_for', 'wrappers']
>>>
```
