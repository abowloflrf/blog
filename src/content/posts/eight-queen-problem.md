---
title: "八皇后问题"
slug: "eight-queen-problem"
tags: ["algorithm"]
pubDatetime: 2017-11-19T16:42:20+08:00
description: ""
---

回溯法解决的一个比较经典的算法问题，题面即在一个 8×8 的棋盘上，要放下 8 个棋子，其中它们两两之间都不能在棋盘的同一行或者同一列或者对角线上，希望得到有多少种摆放方法。

首先想要表达这八个棋子在棋盘上的状态，最简洁的方法就是定义一个一维数组：

```c++
int board[8]={-1};
```

索引即行，值即列，初始化所有的值为-1 即还没有放上棋子，如`board[4]=5`意味棋盘的第 5 行的第 6 列摆放了一个棋子。

## 枚举

最容易想到同时性能最差的办法就是枚举法遍历整个棋盘这样就需要用到八重循环效率十分低下：

```c++
int solution() {
    int a[8] = { 0 },count=0;
    for(a[0] = 0; a[0] <= 7; a[0]++)
        for (a[1] = 0; a[1] <= 7; a[1]++)
            for (a[2] = 0; a[2] <= 7; a[2]++)
                for (a[3] = 0; a[3] <= 7; a[3]++)
                    for (a[4] = 0; a[4] <= 7; a[4]++)
                        for (a[5] = 0; a[5] <= 7; a[5]++)
                            for (a[6] = 0; a[6] <= 7; a[6]++)
                                for (a[7] = 0; a[7] <= 7; a[7]++)
                                {
                                    if (isConflict(a))
                                        continue;
                                    else
                                        count++;
                                }
    return count;
}
```

其中`isConflict`检查冲突的算法为：

```c++
bool isConflict(int a[8]) {
    for (int i = 1; i <= 7; i++)
        for (int j = 0; j <= i - 1; j++)
            if (a[i] == a[j] || abs(a[i] - a[j]) == i - j)
                return true;
    return false;
}
```

## 回溯

回溯+递归应当还是这道题较为优雅的解题思路：

从上往下每一行放一颗棋子，定义一个函数`solution(k)`，循环判断即将放下棋子的第 k 行的 1-8 列每种情况与前面所有已经放下的棋子是否存在冲突，若没有冲突则将全局变量数组`board[k]`的值确定下来，并接下来递归调用`solution(k+1)`进行下一行的落子判断，直到`k=8`时说明每一行棋子都已经下完得到了一个符合条件的完整解法。

完整源代码：

```c++
#include <iostream>
#define BOARD_WIDTH 8	//定义棋盘的宽度

using namespace std;

//初始化棋盘
int board[BOARD_WIDTH] = { 0 };

//解决方案数初始为0
int cnt = 0;

//在一个长宽均为BOARD_WIDTH的棋盘中，前queenNumber行已经放了皇后
//最后一次是在queenNumber行的row列，此方法检查最后放入的这个皇后是否有冲突
bool isConflict(int queenNumber, int row)
{
    //前queenNumber-1行的子其实在前面已经确保没有冲突，这里遍历是为了确认与新下的子有没有冲突
    for (int i = 0; i < queenNumber; i++)
    {
        //同一列或在对角线，这里不用判断是不是在同一行是因为算法本身就是一行下一个棋子，因此同一行不会出现多个棋子
        if (board[i] == row || abs(board[i] - row) == queenNumber - i)
            return true;
    }
    return false;
}

//回溯法判断一共有多少情况
void solution(int k)
{
    //k为此时应判断下子的行数，此时k==BOARD_WIDTH即已经把所有行数都下完得到了一个完整的棋盘
    if (k == BOARD_WIDTH)
    {
        cnt++;
        cout << "====Solution:" << cnt << "===="<<endl;
        //打印board数组
        for (int i = 0; i < BOARD_WIDTH; i++)
            cout << board[i] << ' ';
        cout << endl;
        //打印形象化棋盘
        for (int i = 0; i < BOARD_WIDTH; i++)
        {
            for (int j = 0; j < BOARD_WIDTH; j++)
            {
                if (board[i] != j)
                    cout << "○ ";
                else
                    cout << "● ";
            }
            cout << endl;
        }


	}
	//k<BOARD_WIDTH即还在判断中
	else
	{
        //在下第k行的皇后，从k行的第一列一直判断到最后检查与前面所下的棋子是否有冲突
        for (int i = 0; i < BOARD_WIDTH; i++)
        {
            if (!isConflict(k, i))
            {
                //没有冲突则将这个皇后放下，即计入board数组中
                board[k] = i;
                //然后继续下一行子的判断
                solution(k + 1);
            }
        }
	}
}

int main()
{
    solution(0);
    cout <<"一共有"<< cnt <<"种解法"<<endl;
    return 0;
}
```
