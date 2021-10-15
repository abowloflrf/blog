---
title: "LRU Cache 算法实现"
slug: "lru-cache"
tags: ["C/C++", "algorithm"]
date: "2018-07-13T17:25:26+08:00"
---

**Least recently used (LRU)** 最近最少使用的缓存替换策略，一次 get 或一次 put 都被称为使用。这个算法策略主要是记录容量有限的缓存中每个元素是都是**何时**使用的。

为了实现记录使用顺序，我们可以使用一个`list`来记录 key-value pair，每次使用时都将这个 pair 移动到 list 的首部，为了什么要使用 list 而不是 array 或 vector 呢，正是因为我们的缓存的每次操作均会移动 list 中的元素位置，而元素位置移动频繁的情况下使用**双向链表**是最佳的选择，因为这个数据结构移动元素位置的开销是最小的，仅仅是改变了指针而已。

但是仅仅使用一个 list 还是做不到高效的查找，要做到平均时间复杂度为 O(1)的查找，就需要使用 map，因此还需要`unordered_map`结构来完成查询的操作，而需要注意的是其储存的不是 key-value 的键值对数据，因为需要的数据已经在上面的 list 中储存了，key 所对应储存的数据是上面 list 结构的迭代器，因此在查询值可以在平均 O(1)的时间内拿到一个 list 的迭代器，再通过这个迭代器以 O(1)的时间在 list 中获取 value。同时移动 list 的位置的开销依然是常数时间复杂度。

这个结构可以形象得以这张图表示：

![lru-cache](https://ruofeng.me/content/images/2018/07/lru-cache.png)

## 基本数据结构声明

我们默认为 key-value 均储存的是 string 类型的数据

```cpp
// cache的最大容量
size_t capacity;
// list 中储存的的是需要保存的键值对
// 读取时会将目标项移动到头部
// 写入是直接插入到头部
list<pair<string, string>> dataList;
// map 保存查找表，保存的是key与list迭代器的对应
// 每次查询时根据key从map拿到迭代器可以直接在list中得到相应value
unordered_map<string, list<pair<string, string>>::iterator> positionMap;
```

## `put` 操作

向 LRU-Cache 中插入数据时，可以直接将 key-value 插入到 list 的首部，然后在 map 中查找给定的 key 是否已经存在，若已存在我们可以看作是替换 value 的操作，可以直接删除 map 与 list 中的原内容。然后再将新的 key 与指向 list 项的指针记录到 map 中

```cpp
void put(string key, string value) {
    auto it = positionMap.find(key);
    //将 pair 插入到列表头部
    dataList.push_front({key, value});
    if (it != positionMap.end()) {
        dataList.erase(it->second);
        positionMap.erase(it);
    }
    positionMap[key] = dataList.begin();
}
```

## `get` 操作

查找数据时，首先在 map 中查找 key 对应的内容是否存在，若不存在则表明 cache 中没有这一项内容，直接抛出错误，若存在则在 list 中的找到这一项，并使用`splice`将这一项移动到 list 的首部，因为我们**最近使用**它了，然后返回其 value。

```cpp
string get(string key) {
    auto it = positionMap.find(key);
    //若map中未找到key，则返回错误信息
    if (it == positionMap.end()) {
        return "NotFound";
    }
    //在list中找到get的pair并将它移动并插入到list头部
    dataList.splice(dataList.begin(), dataList, it->second);
    return it->second->second;
}
```

## `put` 时达到容量上限

若容量已满，则将 list 中最后一位（最近最久未使用的一项）从 list 与 map 中移除

```cpp
if (positionMap.size() > capacity) {
    positionMap.erase(dataList.back().first);
    dataList.pop_back();
}
```

## 完整源代码

```cpp
// LRU - Least Recently Used
#include <iostream>
#include <list>
#include <string>
#include <unordered_map>

using namespace std;

class LRUCache {
   public:
    LRUCache(int capacity) : capacity(capacity){};
    string get(string key) {
        auto it = positionMap.find(key);
        if (it == positionMap.end()) {
            return "NotFound";
        }
        dataList.splice(dataList.begin(), dataList, it->second);
        return it->second->second;
    }
    void put(string key, string value) {
        auto it = positionMap.find(key);
        dataList.push_front({key, value});
        if (it != positionMap.end()) {
            dataList.erase(it->second);
            positionMap.erase(it);
        }
        positionMap[key] = dataList.begin();
        if (positionMap.size() > capacity) {
            positionMap.erase(dataList.back().first);
            dataList.pop_back();
        }
    }

   private:
    size_t capacity;
    list<pair<string, string>> dataList;
    unordered_map<string, list<pair<string, string>>::iterator> positionMap;
};

int main() {
    LRUCache cache(10);
    cache.put("foo", "bar");
    cache.put("name", "ruofeng");
    cache.put("phone", "iPhone 7");
    cache.put("PC", "XPS 13");
    cache.put("CPU", "i5 7200U");
    cout << cache.get("name") << endl;
    cout << cache.get("PC") << endl;
    return 0;
}
```
