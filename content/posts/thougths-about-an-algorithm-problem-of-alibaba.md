---
title: "关于阿里秋招一道算法题的反思"
slug: "thougths-about-an-algorithm-problem-of-alibaba"
tags: ["algorithm"]
date: "2018-07-21T17:29:41+08:00"
---

由于当时读题理解题意第一时间没有很好的将题目抽象成良好的数据结构模型，加上右上角的时间倒计时看得心慌，整个过程中心态很不好，导致没做出来，最后也将题目复制了下来当天晚上进行了好好的反思。为了防止被检索，这里就不贴处详细的内容了，仅仅描述一下题目本意：

给定一个 **有向无环图** ，这个图的每个节点中有一个数值，需要求出的是从入度为 0 的节点开始遍历整张图的所有路径的条数，以及所经过路径之和的最大值。

## 图节点的表示

确实也是因为最近接触到的图论的题目太少了，抽象能力不够，甚至想到图都第一时间没想到图节点是如何表示的

```cpp
class DirectedGraphNode {
  public:
    int tag;    //为了方便调试，这里标识一下是第几个节点
    int val;    //节点记录的值
    vector<DirectedGraphNode *> neighbors;                  //用vector记录其指向的所有下一个节点
    DirectedGraphNode(int t, int x) : tag(t), val(x) {};    //构造函数
};
```

## 计算并保存入度

由于这道题涉及到递归，已经记录一些全局的关键属性（路径条数还有最大值），因此在一个类中完成这个计算函数的编写，首先记录四个属性：

1.  图
2.  入度（可以在构造函数中完成计算）
3.  最大路径和
4.  路径数量

```cpp
vector<DirectedGraphNode *> graph;
unordered_map<DirectedGraphNode *, int> degrees;
int maxSum;
int pathCount;
```

其中入度用一个图节点与整数的对应 map 记录，构造方式为首先遍历整个图的所有节点，在 map 中若没有这个节点的 key 则初始化为 0，若有则遍历这个节点是所有 neighbor 即指向的所有下一节点，并为其递增 1
，代码表示如下：

```cpp
for (auto node: graph) {
    if (degrees.find(node) == degrees.end()) {
        degrees[node] = 0;
    }
    for (auto n:node->neighbors) {
        degrees[n]++;
    }
}
```

## 从入度为 0 的节点开始遍历

只有入度为 0 的节点能够被当作一条路径的起始节点

```cpp
void findFromStart() {
    for (auto node:graph) {
        if (degrees[node] == 0) {
            //初始化一条路径
            vector<DirectedGraphNode *> path;
            //初始化这条路径的和
            int currentSum = 0;
            findPath(node, path, currentSum);
        }
    }
}
```

需要判断是否走到尽头，若走到尽头则需要决定是否记录这条路径的最大值以及路径总条数累加，若未走到尽头则递归调用：

```cpp
void findPath(DirectedGraphNode *currentNode, vector<DirectedGraphNode *> currentPath, int currentSum) {
    //访问到这个节点，则将当前节点加入到路径中，当前节点的值也累加
    currentPath.push_back(currentNode);
    currentSum += currentNode->val;
    //走到路径尽头（出度为0）
    if (currentNode->neighbors.size() == 0) {
        //路径数目+1
        pathCount++;
        //计算并决定是否保留最大值
        if (currentSum > maxSum)
            maxSum = currentSum;
        return;
    }
    //继续向下寻找，并递归调用
    for (auto node:currentNode->neighbors) {
        findPath(node, currentPath, currentSum);
    }
}
```

## 总结并反思

首先是练习过少，这题其实是非常基础的图论算法题，仅仅是一个图的遍历而已，只是因为自己最近所做相关类型题目太少了于是短时间内没能想到比较好的思路。第二点就是最近所做的题都是类似 Leetcode 中非常直观的的给出了数据结构与算法需要完成什么，而这道题则有一个情景，并不是那么直接，于是自己理解题意与抽象数据结构有点失败。

秋招继续加油把，不要让我失望。
