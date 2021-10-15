---
title: "Linux 下使用 VS Code 调试 C/C++ 程序"
slug: "debug-c-cpp-in-linux-with-vscode"
tags: ["Linux", "C/C++", "VS Code"]
date: "2018-02-11T16:50:50+08:00"
---

这里以我使用 C++ 练习算法题为例说明一些简单的配置。使用环境如下：

-   Ubuntu 17.10
-   GCC/G++/GDB
-   CMake

## 文件结构

```
.
├── build/
├── CMakeLists.txt
├── main.cpp
└── src/
    ├── 001TwoSum.cpp
    ├── 002AddTwoNumbers.cpp
    └── CMakeLists.txt
```

目录如上，src 目录下为所写的所有题目，一个题目为一旦单独的 C++文件，我把它当作一个库，根目录的`main.cpp`为所用于测试题目的入口文件。build 为编译以及生成 Makfile 的目录。

## 安装所需工具

若环境还未安装所需编译调试的工具，安装 gcc、gdb 以及 cmake

```
sudo apt install build-essential gdb cmake
```

## CMakeLists.txt

根目录下：

```
project(leetcode)
cmake_minimum_required(VERSION 2.6)
set(CMAKE_C_COMPILER "gcc")
set(CMAKE_CXX_COMPILER "g++")
set(CMAKE_CXX_STANDARD 11)

# 根目录
aux_source_directory(. DIR_MAIN)
# 添加子目录
add_subdirectory(src)
# 编译成可执行文件
add_executable(Main ${DIR_MAIN})
# 链接Solutions库，注意下面子目录src的CMakeLists
target_link_libraries(Main Solutions)
```

src 目录

```
aux_source_directory(. DIR_SRC)
# 子目录设置为名为Solutions的库
add_library(Solutions ${DIR_SRC})
```

## task.json

准备完毕后在 VS Code 中打开目录，添加 task，这里分别为两个 task，第一个 cmake 为使用 cmake 生成指定的 makefile，每次当文件目录结构有更改时需要执行一遍 cmake；第二个 task 为 make，这个不用多说了，`group`设置为 true，标识其为一个编译构建任务。在两个 task 外还需要设置一个`options`将路径切换至当前工作空间堆 build 目录下，以在此目录中生成 make 文件以及编译后的结果，可以将此目录添加到 gitignore 中。

```json
{
    "version": "2.0.0",
    "options": {
        "cwd": "${workspaceRoot}/build"
    },
    "tasks": [
        {
            "label": "cmake",
            "type": "shell",
            "command": "cmake",
            "args": ["-G", "Unix Makefiles", "-DCMAKE_BUILD_TYPE=Debug", ".."]
        },
        {
            "label": "make",
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "type": "shell",
            "command": "make"
        }
    ]
}
```

## launch.json

点击 VS Code 测栏的 debug 图标，会发现还没有任何配置，这里添加一个配置，编辑生成的 launch.json 文件。这里注意`program`为刚刚在 CMakeLists 中设置的编译生成的程序文件，位置要指定正确；`preLaunchTask`是每次执行 debug 前要执行的任务，debug 时总会有小修小改，这样在修改代码后可以直接在这里执行而不用再跑去手动再执行一遍编译命令了。

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "(gdb) Launch",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/build/Main",
            "args": [],
            "stopAtEntry": false,
            "cwd": "${workspaceFolder}",
            "environment": [],
            "externalConsole": true,
            "MIMode": "gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                }
            ],
            "preLaunchTask": "make"
        }
    ]
}
```

## 设置断点开始调试

1. 执行 cmake 生成 makefile。
2. 执行 make 根据生成的 makefile 来编译构建程序。
3. 在代码中设置断点。
4. 执行 debug，程序便会在断点处中断，上方会有浮动的断点控制条，左侧会有变量显示 watch 等等。
