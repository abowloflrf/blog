---
title: "HashTable 的简单实现"
slug: "implement-hashtable-in-c"
tags: ["c_cpp"]
pubDatetime: 2018-07-12T17:24:15+08:00
description: ""
---

哈希表 HashTable 是一个非常常用的数据结构，用于储存 k-v 键值对的数据。而且其插入、查找、删除的平均时间复杂度均为`O(1)`。为了了解到其内部实现，是如何实现高效的查询方式，参考了 [https://github.com/jamesroutley/write-a-hash-table](https://github.com/jamesroutley/write-a-hash-table) 使用 C 语言实现了一个简易的 HashTable。

## 基本结构

HashTable 中元素的最基本单位是 k-v 键值对，我们将其视为字符串，则有这样的结构：

```c
typedef struct {
    char* key;
    char* value;
} ht_item;
```

HashTable 的基本表结构中包含表最大容量`size`、当前表中元素个数`count`，以及一个储存元素指针的数组`ht_item** items`：

```c
typedef struct {
    int size;
    int count;
    ht_item** items;
} ht_hash_table;
```

## 新建与删除

对于每个表元素，与表本身，我们需要分别为其定义初始化的函数与删除结构的函数，初始化即分配内存，删除即释放内存。函数表示为`static`意味仅供内部调用，不允许外部调用，和面向对象中的`private`访问控制标识类似。

**新建元素**，参数为 k-v 字符串，主要为字符串分配内存

```c
static ht_item* ht_new_item(const char* k, const char* v) {
    ht_item* i = malloc(sizeof(ht_item));
    i->key = malloc(strlen(k) + 1);
    strcpy(i->key, k);
    i->value = malloc(strlen(v) + 1);
    strcpy(i->value, v);
    return i;
}
```

**新建表**，初始化表空间大小，这里设定为 53，数量初始化为 0，并根据 size 给保存元素数组的`items`指针分配一定的内存并初始化

```c
ht_hash_table* ht_new() {
    ht_hash_table* ht = malloc(sizeof(ht_hash_table));
    ht->size = 53;
    ht->count = 0;
    ht->items = calloc((size_t)ht->size, sizeof(ht_item*));
    return ht;
}
```

**删除元素**，直接释放内存

```c
static void ht_del_item(ht_item* i) {
    free(i->key);
    free(i->value);
    free(i);
}
```

**删除表**，遍历整个表逐个释放元素内存，然后释放数组以及本身

```c
void ht_del_hash_table(ht_hash_table* ht) {
    for (int i = 0; i < ht->size; i++) {
        ht_item* item = ht->items[i];
        if (item != NULL) {
            ht_del_item(item);
        }
    }
    free(ht->items);
    free(ht);
}
```

## 哈希函数

**哈希**表正是因为其索引的构建过程使用了哈希函数因此而得名。简单来讲，在向哈希表中插入一个 k-v 键值对时，首先需要对其 key 进行 hash，得到一个数，最为表中保存数组`ht->items`的索引即数组下标，然后再将 value 赋值给指定索引所指向元素的 value 中。hash 函数是单向的，对于不同的给定值通过 hash 后会得到不同的确定结果，且理想的 hash 函数，对于所有不同的给定值经过 hash 之后均会得到不同的结果。因此利用这一特性我们需要的 hash 函数将 key 计算后返回得到的是大小在表容量之内的一个确定结果作为储存的索引，在查询时也是计算 hash 然后将计算结果作为索引直接在数组中取值即可，这就是时间复杂度`O(1)`的原因。

这里实现一个对字符串的建议 hash 函数，这个 hash 函数需要这些参数，`s`为目标字符串，`a`为一个大于字母表的素数，我们需要 hash 的字符串是 ASCII 字符串，而 ASCII 大小为 128，这里可以取一个 151，`m`为容量，因为结果是数组的下标，计算结果不能够大于它，因此在运算中会与`m`进行求余运算：

```c
static int ht_hash(const char* s, const int a, const int m) {
    long hash = 0;
    const int len_s = strlen(s);
    for (int i = 0; i < len_s; i++) {
        hash += (long)pow(a, len_s - (i+1)) * s[i];
        hash = hash % m;
    }
    return (int)hash;
}
```

这个函数给定一个字符串，会返回一个在 0-m 之间的数组作为索引。

## 哈希冲突

但是并不是所有的 hash 函数都是完美的，有可能发生冲突，即给定不同的输入，有一定可能返回了相同的 hash 结果。而且对于一个容量较小，储存数量较多的哈希表，添加新元素时，发生冲突的概率变得很大。因此我们需要解决并减少发生冲突的情况：

- 使用 开放地址 + 双重 HASH 的方法解决冲突
- 在容量达到一定阈值时，需要 resize 整张表

其中双重 HASH 在使用时会多一个参数`i`，并且会使用到两个不同的 hash 函数分别为`hash_a`与`hash_b`，最基本的形式如下：

```c
index = hash_a(string) + i * hash_b(string) % num_buckets;
```

首次 hash 一个 key 时这个参数为 0，当没有冲突时，结果就是`hash_a`的结果；当发生冲突时，将 i 自增并计算两个 hash，但是`hash_b`的结果有一定可能为 0，此时的结果仍然是冲突的，因此作一点处理以保证其结果不会为 0：

```c
index = (hash_a(string) + i * (hash_b(string) + 1)) % num_buckets;
```

具体实现如下，将原来函数的第二个参数改为两个不同的素数`HT_PRIME_1`、`HT_PRIME_2`作为两个 hash 函数

```c
static int ht_get_hash(
    const char* s, const int num_buckets, const int attempt
) {
    const int hash_a = ht_hash(s, HT_PRIME_1, num_buckets);
    const int hash_b = ht_hash(s, HT_PRIME_2, num_buckets);
    return (hash_a + (attempt * (hash_b + 1))) % num_buckets;
}
```

## 基本操作

接下来是实现一个哈希表的基本操作：

- 插入
- 查找
- 删除
- 更新

### 插入（与更新）

插入操作首先初始化并对一个基本元素赋值，然后调用上一步完成的 hash 函数对 key 进行计算得到 `index`，然后拿到这个`index`在表中进行访问，若访问目标为`NULL`，表示这个地方是空闲的可以直接插入；若不为`NULL`代表发生了冲突，将 `i` 自增并再次 hash 并在表中查找，知道找到一个空地址可以进行插入。

更新操作可以在这里实现，直接替换原`value`即可。

```c
void ht_insert(ht_hash_table* ht, const char* key, const char* value) {
    //新建元素结构
    ht_item* item = ht_new_item(key, value);
    //调用double hash返回作为hash表的索引
    int index = ht_get_hash(item->key, ht->size, 0);
    ht_item* cur_item = ht->items[index];
    int i = 1;
    // iterate through indexes until we find an empty bucket
    while (cur_item != NULL) {
        //找到匹配的key则覆盖value作为更新操作
        if (strcmp(cur_item->key, key) == 0) {
            ht_del_item(cur_item);
            ht->items[index] = item;
            return;
        }
        index = ht_get_hash(item->key, ht->size, i);
        cur_item = ht->items[index];
        i++;
    }
    //插入元素内容
    ht->items[index] = item;
    ht->count++;
}
```

### 查找

查找与插入的算法大致相同，只是在循环中判断索引处的 key 值是否匹配，若找到`NULL`则代表表中没有此项，直接返回空指针。

```c
char* ht_search(ht_hash_table* ht, const char* key) {
    int index = ht_get_hash(key, ht->size, 0);
    ht_item* item = ht->items[index];
    int i = 1;
    //与插入元素类似，不过在循环中需要判断索引处的key值是否匹配
    //若索引处为NULL，则跳出循环直接返回NULL，表示未找到
    while (item != NULL) {
        if (strcmp(item->key, key) == 0) {
            return item->value;
        }
        index = ht_get_hash(key, ht->size, i);
        item = ht->items[index];
        i++;
    }
    return NULL;
}
```

### 删除

删除操作相对于插入与查找复杂一些，因为在找到对应 key 的元素时，不能直接将这个元素删除，因为这个元素可能位于冲突链的一部分，若是这样，将其释放为`NULL`，当下次查找这个冲突链删除掉的元素后面一个元素时，找到前面被删除的元素发现为`NULL`就会直接返回未找到了，而不会继续在冲突链中计算 hash 并继续查找。因此需要使用标识删除 instead of 直接删除。方式可以将这个节点指向一个定义的全局的代表以删除的节点即可：

```c
//删除标记
static ht_item HT_DELETED_ITEM = {NULL, NULL};
//删除操作
void ht_delete(ht_hash_table* ht, const char* key) {
    //先搜索到
    int index = ht_get_hash(key, ht->size, 0);
    ht_item* item = ht->items[index];
    int i = 1;
    while (item != NULL) {
        if (item != &HT_DELETED_ITEM) {
            if (strcmp(item->key, key) == 0) {
                ht_del_item(item);
                //置删除标志
                ht->items[index] = &HT_DELETED_ITEM;
            }
        }
        index = ht_get_hash(key, ht->size, i);
        item = ht->items[index];
        i++;
    }
    ht->count--;
}
```

改进删除方式后，在前面的插入与查找操作中就要作一定的改进。这里不做具体描述。

## 更新表大小

前面知道，当一个表在快要满时，hash 冲突的概率会变大，因此在这个时候我们需要重新修改表的容量，以容纳更多的元素与减少冲突概率。可以在每次插入与删除时计算一个`load=count/size`作为 resize 的标准，

- load > 0.7 则容量翻倍
- load < 0.1 则容量减半

更改容量大小的操作即新建一个目标容量的表作然后将原表内容复制过去，然后交换表中的属性（`size`与`base_size`）与所有内容（`items`），然后删除新表，这样原来表的容量被改变但是指向原表的指针未变。然而这个操作是比较耗时的，因此也需要根据使用情景设定合理的阈值、增大减小容量的标准、初始容量，来尽量避免在使用时的 resize 操作。

在实现 resize 操作时，在表结构体中新增加一个`base_size`作为基础容量，`size`为实际容量（大于`base_size`的第一个素数）

```c
//重新分配大小
static void ht_resize(ht_hash_table* ht, const int base_size) {
    //size小于初始容量时不再减少
    if (base_size < HT_INITIAL_BASE_SIZE) {
        return;
    }
    //新建一张表，并复制原表的所有数据
    ht_hash_table* new_ht = ht_new_sized(base_size);
    for (int i = 0; i < ht->size; i++) {
        ht_item* item = ht->items[i];
        if (item != NULL && item != &HT_DELETED_ITEM) {
            ht_insert(new_ht, item->key, item->value);
        }
    }

    //修改原表的属性
    ht->base_size = new_ht->base_size;
    ht->count = new_ht->count;

    //为了删除新表，将原表的size与base_size属性赋值给新表
    const int tmp_size = ht->size;
    ht->size = new_ht->size;
    new_ht->size = tmp_size;

    //将原表与新表的内容items交换
    ht_item** tmp_items = ht->items;
    ht->items = new_ht->items;
    new_ht->items = tmp_items;

    //删除新表
    ht_del_hash_table(new_ht);
}

//增大容量
static void ht_resize_up(ht_hash_table* ht) {
    const int new_size = ht->base_size * 2;
    ht_resize(ht, new_size);
}

//缩小容量
static void ht_resize_down(ht_hash_table* ht) {
    const int new_size = ht->base_size / 2;
    ht_resize(ht, new_size);
}
```

在插入删除元素时之前需要计算`load`并判断是否需要 resize：

```c
void ht_insert(ht_hash_table* ht, const char* key, const char* value) {
    const int load = ht->count * 100 / ht->size;
    if (load > 70) {
        ht_resize_up(ht);
    }
    // ...
}

void ht_delete(ht_hash_table* ht, const char* key) {
    const int load = ht->count * 100 / ht->size;
    if (load < 10) {
        ht_resize_down(ht);
    }
    // ...
}
```

## 测试

接下来在 `main` 函数中进行测试：

```c
#include <stdio.h>
#include <stdlib.h>
#include "src/hash_table.h"

int main(int argc, char const* argv[]) {
    // new hashtable
    ht_hash_table* ht = ht_new();

    // insert into hashtable
    ht_insert(ht, "foo", "bar");
    ht_insert(ht, "name", "ruofeng");
    ht_insert(ht, "number", "41524226");

    // search from hashtable
    printf("%s\n", ht_search(ht, "foo"));
    printf("%s\n", ht_search(ht, "name"));

    // update test
    ht_insert(ht, "foo", "barr");
    printf("%s\n", ht_search(ht, "foo"));

    // key not exsit test
    if (ht_search(ht, "not") == NULL) printf("%s\n", "key(not) doesn't exist");

    // delete key test
    ht_delete(ht, "foo");
    if (ht_search(ht, "foo") == NULL) printf("%s\n", "key(foo) doesn't exist");

    // delete hash table
    ht_del_hash_table(ht);

    return 0;
}
```

编译并运行：

```shell
gcc -g ./src/hash_table.c ./src/prime.c main.c -std=c11 -o ./build/main -lm
./build/main
```

运行结果

```plaintext
$ ./build/main
bar
ruofeng
barr
key(not) doesn't exist
key(foo) doesn't exist
```

## 源代码

所有可执行源代码可在我的 GitHub 找到：

[https://github.com/abowloflrf/hash-table](https://github.com/abowloflrf/hash-table)
