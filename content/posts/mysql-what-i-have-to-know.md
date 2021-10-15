---
title: "MySQL 基础必知必会"
slug: "mysql-what-i-have-to-know"
tags: ["MySQL", "数据库", "SQL"]
date: "2018-03-06T17:01:06+08:00"
---

总结 SQL 在 MySQL 中的一些基本使用

## 数据库信息相关

```sql
use [database_name]; -- 切换数据库

show databases; -- 显示所有数据库
show tables; -- 显示所有表

show columns from [table_name]/describe [table_name]; -- 显示指定表的列信息
show status; -- 显示数据库状态
show create table [table_name]; -- 显示创建表的SQL语句
show create database [database_name]; -- 显示创建数据库的SQL语句
show grants; -- 显示用户权限

show errors; -- 列出错误信息
show warnings; -- 列出警告信息
```

## 基本检索

```sql
SELECT DISTINCT prod_name from products; -- 只返回不同的值
SELECT prod_name FROM products LIMIT 5; -- 只返回结果的前5行
SELECT prod_name FROM products LIMIT 5,5; -- 返回从第5行开始的5行
SELECT products.prod_name FROM products; -- 同时使用表名和列来限定
```

## 排序检索

```sql
SELECT prod_name FROM products ORDER BY prod_name; -- 结果按照指定列排序
SELECT prod_id,prod_price,prod_name FROM products
    ORDER BY prod_price,prod_name; -- 先按照价格，再按照名称排序
SELECT prod_name FROM products ORDER BY prod_name DESC; -- 降序排列
SELECT prod_id,prod_price,prod_name FROM products
    ORDER BY prod_price DESC,prod_name; -- 先按照价格降序，再按照名称升序排列
```

## 过滤数据

```sql
SELECT prod_name,prod_price FROM products
    WHERE prod_price = 2.50; -- 查找价格为2.5的产品
SELECT prod_name,prod_price FROM products
    WHERE prod_price > 2.50; -- 查找价格大于2.5的产品
SELECT prod_name,prod_price FROM products
    WHERE prod_price BETWEEN 5 AND 10; -- 查找价格在5-10的产品
SELECT prod_name FROM products
    WHERE prod_price IS NULL; -- IS NULL 检查空值

SELECT prod_name,prod_price FROM products
    WHERE vend_id = 1002 OR prod_price <= 10; -- 使用AND OR操作符限定条件

/*在计算AND OR时，优先组合AND操作符*/
/*下面的语句筛选的是满足：（生产商为1002）或（生产商为1003且价格大于10）的产品*/
SELECT prod_name,prod_price FROM products
    WHERE vend_id = 1002 OR vend_id = 1003 AND prod_price >= 10;
/*要指定条件组合顺序，可以使用括号*/
SELECT prod_name,prod_price FROM products
    WHERE (vend_id = 1002 OR vend_id = 1003) AND prod_price >= 10;

/*IN 用于指定取值范围*/
SELECT prod_name,prod_price FROM products
    WHERE vend_id IN (1002,1003) ORDER BY prod_name;
/*NOT 指定不在取值内的筛选*/
SELECT prod_name,prod_price FROM products
    WHERE vend_id NOT IN (1002,1003) ORDER BY prod_name;
```

## 使用通配符

```sql
/*检索任何以jet开头的产品名称，大小写敏感*/
/*LIKE '%' 不能匹配 NULL*/
SELECT prod_id,prod_name FROM products
    WHERE prod_name LIKE 'jet%';

/*下划线匹配单个字符*/
SELECT prod_id,prod_name FROM products
    WHERE prod_name LIKE '_ton'
```

## 使用正则表达式

```sql
/*与使用LIKE类似，使用REGEXP，后面加上正则表达式*/
SELECT prod_name FROM products
    WHERE prod_name REGEXP '\\([0-9] sticks?\\)'
    ORDER BY prod_name;
```

## 插入数据

```sql
/*每一列都指定值的插入方法，避免使用*/
INSERT INTO Customers
VALUES(NULL,
            'Pep E. LaPew',
            '100 Main Street',
            'Los Angeles',
            'CA',
            '90046'
            'USA',
            NULL,
            NULL);

/*指定要插入的列*/
INSERT INTO customers(cust_name,cust_address)
VALUES('Pep E. LaPew','Los Angeles');

/*插入多行数据，在VALUES的括号后逗号隔开多组数据*/
INSERT INTO customers(cust_name,cust_address)
VALUES('Pep E. LaPew','Los Angeles'),('M. Martin','New York');

/*插入使用SELECT检索出的数据*/
INSERT INTO customers(cust_name,cust_address)
    SELECT cust_name,cust_address
    FROM custnew;
```

## 更新数据

使用 `UPDATE` 更新数据，使用 `WHERE` 更新指定行，不使用则更新所有行。

```sql
UPDATE customers
SET cust_email = 'elmer@fudd.com'
WHERE cust_id = 10005;
```

## 删除数据

```sql
DELETE FROM customers
WHERE cust_id = 10006;
```

## 创建表

```sql
CREATE TABLE customers (
    cust_id INT(11) NOT NULL AUTO_INCREMENT,
    cust_name CHAR(50) NOT NULL,
    cust_address CHAR(50) NULL DEFAULT NULL,
    cust_city CHAR(50) NULL DEFAULT NULL,
    cust_state CHAR(5) NULL DEFAULT NULL,
    cust_zip CHAR(10) NULL DEFAULT NULL,
    cust_country CHAR(50) NULL DEFAULT NULL,
    cust_contact CHAR(50) NULL DEFAULT NULL,
    cust_email CHAR(255) NULL DEFAULT NULL,
    PRIMARY KEY (cust_id)
)ENGINE=InnoDB;
```

## 更新表

```sql
    /*向表中添加一个字段*/
    ALTER TABLE vendors
    ADD vend_phone CHAR(20);

    /*给表定义外键*/
    ALTER TABLE orderitems
    ADD CONSTRAINT fk_orderitems_orders
    FOREIGN KEY (order_num) REFERENCES orders (order_num)
```

## 计算字段

```sql
/*Concat()函数用于拼接，返回多个列拼接的字段而不是原本的列字段*/
SELECT Concat(vend_name,'(',vend_country,')') FROM vendors
    ORDER BY vend_name;

/*RTrim()用于删除右边多余的空格，LTrim()左边，Trim()两边*/
SELECT Concat(RTrim(vend_name),'(',RTrim(vend_country),')') FROM vendors
    ORDER BY vend_name;

/*拼接后使用AS来指定列别名*/
SELECT Concat(RTrim(vend_name),'(',RTrim(vend_country),')') AS vend_title
    FROM vendors ORDER BY vend_name;

/*在SELECT语句中使用算术运算*/
SELECT prod_id,quantity,item_price,quantity*item_price AS expanded_price
    FROM orders WHERE oder_num = 20005;
```

## 文本处理函数

如同在上面计算字段中使用的`Trim()`函数

```sql
/*Upper()将字符串转为大写*/
SELECT vend_name,Upper(vend_name) AS vend_name_upcase
    FROM vendors ORDER BY vend_name;
```

常见的文本处理函数：

-   `Left("samplestring",5)` 返回指定字符串左侧 5 个字符
-   `Length("samplestring")` 返回指定字符串长度
-   `Locate("am","samplestring")` 在字符串中查找字符串，返回首个出现位置(2)
-   `Lower("Sample")` 全部转化为小写
-   `Upper("Sample")` 全部转化为大写
-   `LTrim("Sample ")` 去除左侧多余的空格
-   `Soundex("Lie")` 返回发音类似(Lee)
-   `SubString("samplestring",5,3)` 截取子字符串，一个参数表示从指定位置后面所有字符串，两个参数表示从指定位置开始后面 n 个字符串，负数表示从尾部开始计算位置

## 日期处理函数

日期类型：

-   `DATE` 日期(2018-03-05)
-   `DATETIME[(fsp)]` 日期与时间
-   `TIMESTAMP[(fsp)]` 时间戳，与 DATETIME 类似，默认时间为当前时间，且默认在行更新时此列也会自动更新为当前时间戳
-   `TIME[(fsp)]` 时间(17:12:15.000)
-   `YEAR` 年份(2018)

```sql
/*创建一个表*/
create table date_and_time(
time TIME(3),
    datetime DATETIME(4),
    date DATE,
    year YEAR,
    ts TIMESTAMP
);
/*显示表的所有列信息*/
show columns from date_and_time;
+----------+-------------+------+-----+-------------------+-----------------------------+
| Field    | Type        | Null | Key | Default           | Extra                       |
+----------+-------------+------+-----+-------------------+-----------------------------+
| time     | time(3)     | YES  |     | NULL              |                             |
| datetime | datetime(4) | YES  |     | NULL              |                             |
| date     | date        | YES  |     | NULL              |                             |
| year     | year(4)     | YES  |     | NULL              |                             |
| ts       | timestamp   | NO   |     | CURRENT_TIMESTAMP | on update CURRENT_TIMESTAMP |
+----------+-------------+------+-----+-------------------+-----------------------------+
/*插入一行数据，内容均为当前时间*/
insert into date_and_time (time,datetime,date,year,ts)
    values (Now(),Now(),Now(),Now(),Now());
/*显示所插入的数据*/
select * from date_and_time;
+--------------+--------------------------+------------+------+---------------------+
| time         | datetime                 | date       | year | ts                  |
+--------------+--------------------------+------------+------+---------------------+
| 17:12:15.000 | 2018-03-05 17:12:15.0000 | 2018-03-05 | 2018 | 2018-03-05 17:12:15 |
+--------------+--------------------------+------------+------+---------------------+
/*更新一行数据后*/
update date_and_time set year = 2019;
/*类型为timestamp的数据已自动更新*/
select * from date_and_time;
+--------------+--------------------------+------------+------+---------------------+
| time         | datetime                 | date       | year | ts                  |
+--------------+--------------------------+------------+------+---------------------+
| 17:12:15.000 | 2018-03-05 17:12:15.0000 | 2018-03-05 | 2019 | 2018-03-05 17:14:56 |
+--------------+--------------------------+------------+------+---------------------+
```

常用日期与时间处理函数：

-   `AddDate('2018-01-01',4)` 增加日期(’2018-01-05‘)
-   `AddTime('2018-01-01 12:00:00','1:1:2')` 增加时间
-   `CurDate()` 当前日期，同等与 `CURRENT_DATE()`
-   `CurTime()` 当前时间，同等与 `CURRENT_TIME()`
-   `Now()` 当前时间戳，同等与 `CURRENT_TIMESTAMP()`
-   `Date()` 返回日期部分
-   `Time()` 返回时间部分
-   `Day()` 返回日
-   `DayOfWeek()` 返回星期数，周日为第一天
-   `DayOfYear()` 返回指定日期为一年中的第几天
-   `DayOfMonth()` 返回指定日期为一个月中的第几天
-   `Month()` 返回月份
-   `Year()` 返回年份
-   `Hour()` 返回小时
-   `Minute()` 返回分钟
-   `Second()` 返回秒钟
-   `Date_ForMat()` 格式化表示时间
-   `Date_Diff()` 计算两日期之差
-   `Time_Diff()` 计算两时间之差

```sql
/*返回订单日期为2005年九月份的所有订单*/
SELECT cust_id,order_num FROM orders
    WHERE Year(order_date) = 2005 AND Month(order_date) = 9;
```

## 数值处理函数

-   `Abs()` 绝对值
-   `Cos()` 余弦
-   `Sin()` 正弦
-   `Tan()` 正切
-   `Sqrt()` 平方根
-   `Exp()` 指数值
-   `Mod()` 余数
-   `Pi()` 圆周率

## 聚集函数

-   `AVG()` 平均值
-   `COUNT()` 行数
-   `MAX()` 最大值
-   `MIN()` 最小值
-   `SUM()` 和

```sql
/*计算平均价格*/
SELECT AVG(prod_price) AS avg_price FROM products;
/*计算有email的顾客，若为NULL则不计入*/
SELECT COUNT(cust_email) AS num_cust FROM customers;
/*只计算价格不同的值的平均值*/
SELECT AVG(DISTINCT prod_price) AS avg_price FROM products;
```

## 数据分组

```sql
/*SELECT 指定了两个字段，GROUP BY指定按照vend_id分组并排序，
这导致对每个不同的vend_id进行COUNT计算而不是整个表计算
这个语句的目的是展示每个生产商各自的产品数目并按照产品数目从多到少排序*/
SELECT vend_id,count(*) AS num_prods FROM products
    GROUP BY vend_id
    ORDER BY num_prods DESC;

/*HAVING 过滤分组，而不是使用WHERE*/
SELECT vend_id,count(*) AS num_prods FROM products
    GROUP BY vend_id HAVING COUNT(*) >= 2;

/*WHERE 是对行的过滤，若需要使用WHERE则应当在GROUP BY之前指定*/
SELECT vend_id,count(*) AS num_prods FROM products
    WHERE prod_price >= 10;
    GROUP BY vend_id HAVING COUNT(*) >= 2;
```

## 子查询

一个表中的查询结果要作为数据在另一个表中进行查询时，要使用**子查询**

```sql
/*首先在所有订单物品中查询产品id为1001的订单号
再从订单表中查询得到指定订单号的顾客id*/
SELECT cust_id FROM orders
    WHERE order_num IN (SELECT order_num FROM orderitems
                                            WHERE prod_id='1001');
```

## 联结表

定义 products 与 vendors 两张表，这样每个 product 数据中只需要定义一个 vendor_id 而不用定义 vendor_name，将 vendor 的具体信息都定义在另外一张表 vendors 中这样不会造成数据的重复空间浪费且在修改生产厂家信息时不需要管 products 的内容

```sql
/*使用WHERE限定，否则返回两张表的笛卡儿积，多出不必要的错误数据*/
SELECT vend_name,prod_name,prod_price
FROM vendors,products
WHERE vendors.vend_id = products.vend_id
ORDER BY vend_name,prod_price DESC;

/*使用内联结*/
SELECT vend_name,prod_name,prod_price
FROM vendors INNER JOIN products
ON vendors.vend_id = products.vend_id
ORDER BY vend_name,prod_price DESC;
```

## 高级联结（还没有太理解）

```sql
/*表别名，仅在查询时使用，并不能像列别名一样返回到客户端*/
SELECT cust_name,cust_contact
    FROM customers AS c, order AS o, orderitems as oi
    WHERE c.cust_id = o.cust_id
        AND oi.order_num = o.order_num
        AND prod_id=1001;

/*自联结 使用子查询*/
SELECT prod_id,prod_name
    FROM products
    WHERE vend_id = (SELECT vend_id FROM products WHERE prod_id='1001');
/*自联结 使用联结，定义了同一个表的两个实例，使用WHERE通过匹配两个表的vend_id将两个表联结
再按照第二个表的prod_id进行过滤，结果用于对第一个完整表的查询*/
SELECT p1.prod_id,p1.prod_name
    FROM products AS p1,products AS p2
    WHERE p1.vend_id = p2.vend_id
        AND p2.prod_id='1001';

/*自然联结 排除多次出现，使每个列只返回一次：在所有订单中查询订单产品编号为1001的
所有订单信息以及其顾客信息*/
SELECT c.*,o.order_num,o.order_date,oi.prod_id,oi.quantity,oi.item_price
    FROM customers AS c, orders AS o, orderitems AS oi
    WHERE c.cust_id = o.cust_id
        AND oi.order_num=o.order_num
        AND prod_id='1001'

/*使用内部联结检索所有客户*/
SELECT customers.cust_id, orders.order_num
    FROM customers INNER JOIN orders
        ON customers.cust_id = orders.cust_id;

/*外部联结 将一个表中的行与另一个表中的行为相关联*/
SELECT customers.cust_id, orders.order_num
    FROM customers LEFT OUTER JOIN orders
        ON customers.cust_id = orders.cust_id;
```

## 组合查询

使用 `UNION` 操作符将多条 select 语句组合成一个结果集，使用 `UNION` 联结的两条 select 语句必须包含相同的列、表达式、和聚集函数，次序不做规定。列的数据必须兼容。

```sql
/*直接使用UNION将两条查询语句联结，下面的查询先当与在WHERE中使用OR
在使用UNION时会自动排除相同的行，如两个查询同时满足
若要包含那些重复的行，使用UNION ALL*/
SELECT vend_id, prod_id, prod_price
    FROM products
    WHERE prod_price <= 5
UNION
SELECT vend_id, prod_id, prod_price
    FROM products
    WHERE vend_id IN (1001,1002);
```

## 全文搜索

在创建表时，使用 FULLTEXT 对指定的列进行索引。全文搜索不区分大小写。InnoDB 引擎不支持全文检索。

```sql
/*在指定索引之后，使用两个函数，Match指定被搜索的列，Against指定搜索表达式*/
SELECT note_text
    FROM productnotes
    WHERE MATCH(note_text) AGAINST('rabbit');

/*虽然也可以用like完成，但是使用全文搜索得到的结果是按照文本匹配的良好程度排序的*/
SELECT note_text
    FROM productnotes
    WHERE note_text LIKE '%rabbit%';

/*rank表示匹配的良好程度*/
SELECT note_text ,MATCH(note_text) AGAINST('rabbit') AS rank
FROM productnotes

/*使用查询扩展，返回的结果中可能没有指定的搜索关键词
但是可能与匹配到关键词的结果有一些关系。使用查询扩展能够返回更多数据
但是同时也可能返回更多不希望的数据*/
SELECT note_text
FROM productnotes
WHERE MATCH(note_text) AGAINST('anvils' WITH QUERY EXPANSION);

/*使用布尔模式。指定包含heavy但是排除rope，-表示不存在*/
SELECT note_text
FROM productnotes
WHERE MATCH(note_text) AGAINST('heavy -rope' IN BOOLEAN MODE);
```
