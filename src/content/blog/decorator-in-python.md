---
title: "Decorator in Python"
slug: "decorator-in-python"
tags: ["Python"]
pubDatetime: 2018-10-27T17:33:18+08:00
description: ""
---

> Don't Repeat Yourself

---

在 Python 中一个与其他语言较为特殊的语法糖就是 **Decorator** 了，就如同它的名字，一个函数的 decorator 的作用就是将其做一层包装，可以定义在这个函数执行之前做一些什么工作，如检查传入参数等，执行完函数之后做一些定义的操作。比如说对一个函数的做一些额外的操作，记录日志，计算函数运行时间，这些与函数的核心运行逻辑不相关，而且是可以能够被多个函数所使用的小**包装**，因此可以单独定义一个这么一个装饰器以供不同的函数复用。

在 web 开发中更为常见的情景就是在处理请求对传入 request 数据进行校验、用户身份的校验，如果不符合则直接在 decorator 中 abort 这个请求即可。

decorator 的使用就是在定义函数的上面一行加入`@装饰器名`

```python
@timethis
def countdown(n):
		pass
```

这个`@`说明其实仅仅是一个语法糖，它的效果和下面的定义是完全一样的：

```python
def countdown(n):
		pass
countdown = timethis(countdown)
```

## 一个简单的计时装饰器

计时器可以算是最简单且经典的装饰器例子了，因为它在函数的执行前，执行后分别有获取时间、计算时间差并输出的操作，同时对函数内部逻辑没有侵入。

```python
import time
from functools import wraps
def timethis(func):# 传入的是要被装饰的原函数
    '''
    Decorator that reports the execution time.
    '''
    @wraps(func)
    def wrapper(*args, **kwargs):# 这样定义wrapper函数的参数是为来能够正常接收原函数的参数
        start = time.time() # 这个wrapper内定义的在这个原函数执行前执行的代码
        result = func(*args, **kwargs)# 执行原函数，并保存执行结果
        end = time.time() # 这个wrapper内定义的在这个原函数执行后执行的代码
        print(func.__name__, end - start)

        return result # 返回值，即原函数被包装后的返回值
    return wrapper
```

使用方法：

```python
>>> @timethis
... def countdown(n):
...     '''
...     Counts down
...     '''
...     whilen>0:
...     n -= 1
...
>>> countdown(100000)
countdown 0.008917808532714844
>>> countdown(10000000)
countdown 0.87188299392912 >>>
```

## 使用`functools`库中的`@wraps`

需要注意的是，在定义任何装饰器时都应该使用 `functools` 库中的 `@wraps` 来注解 wrap 函数，使用 `@wraps` 的重要原因之一是可以**保留原函数的元信息**，如 `__name` 和 `__doc__` 等。

还可以使用 `__wrapped__` 来直接访问被包装的原始函数：

```python
countdown.__wrapped__(1000000) # 去掉了一个装饰器，不会进行计时输出
```

## 多个装饰器

最上面定义的装饰器最先执行，然后依次向下

```python
# d1 先与 d2 执行
@decorator1
@decorator2
def add(x, y):
    return x + y
```

同样地，若要使用`__wrapped__`，要连续使用两次才能去除刚刚定义的两个装饰器。

```python
# 一个 __wrapped__ 只取消了d1，即最上面的decorator
add.__wrapped__(2, 3)
# 取消两个decorator
add.__wrapped__.__wrapped__(2, 3)
```

## 可传入参数的 decorator

例如在使用一个记录日志的 decorator 时，需要指定 log 的级别

```python
from functools import wraps
import logging

#  在这里定义要传入decorator的参数，对decorator再进行一次包装
def logged(level, name=None, message=None):
    """
    Add logging to a function.
    """
    # 传入原函数的decorator
    def decorator(func):
        # 默认值
        logname = name if name else func.__module__
        log = logging.getLogger(logname)
        logmsg = message if message else func.__name__

        @wraps(func)
        def wrapper(*args, **kwargs):
            log.log(level, logmsg)
            return func(*args, **kwargs)

        return wrapper

    return decorator


@logged(logging.DEBUG)
def add(x, y):
    return x + y


if __name__ == "__main__":
    add(1, 2)
```

## 在 flask 中使用 decorator 前置检查用户是否认证

在使用 flask 开发 api 时，比较常见的用户认证方法之一是在 HTTP Header 中带入一个 Token，这里我举了一个简单的例子来给 flask 写一个以验证用户认证的装饰器

```python
from functools import wraps
from flask import request, make_response, jsonify


def must_auth(f):
    @wraps(f)
    def decorate(*args, **kwargs):
        hdrs = request.headers
        token = hdrs.get('Authorization')
        # 检查 request header 的 Authorization 部分
        if token != 'Bearer 123456':
            # 校验失败则返回401错误
            return make_response(jsonify({'errno': -1, 'msg': 'not auth'}), 401)
        return f(*args, **kwargs)

    return decorate

# 在路由方法中使用must_auth装饰器
@app.route('/api/auth')
@must_auth
def auth_route():
    return res_data({'foo': 'bar'})
```
