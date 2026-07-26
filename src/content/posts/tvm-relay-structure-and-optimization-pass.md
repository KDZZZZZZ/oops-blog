---
title: "TVM代码库解析：Relay层结构与优化Pass"
description: "梳理 TVM Relay 表达式体系中的对象、引用、节点继承关系与优化 Pass。"
slug: "tvm-relay-structure-and-optimization-pass"
publishedAt: 2025-01-28T00:00:00+08:00
updatedAt: 2025-02-07T16:41:10+08:00
category: "编译器"
tags: ["TVM", "Compiler", "Deep Learning"]
status: published
draft: false
---

relay层主要由数据结构类(如Constant)和节点类(如ConstantNode)组成。
下面梳理一下他们的继承链。

ObjectRef &rarr; BaseExpr &rarr; RelayExpr &rarr; Constant

Object &rarr; BaseExprNode &rarr; RelayExprNode &rarr; ConstantNode

> 源代码库中使用了`using ExprNode = tvm::RelayExprNode;`

这里先赘述一下上面每个类的的功能：

#### **(1) `Object` (include/tvm/runtime/object.h)**
- **功能**：
  - TVM **所有对象的基类**，提供 **引用计数** 和 **类型系统** 支持
  - 实现 `RefCount` 机制（通过 `use_count` 成员）
  - 提供 `type_index` 用于运行时类型识别（RTTI）
- **关键方法**：
  ```cpp
  virtual uint32_t type_index() const; // 类型标识
  void IncRef();  // 增加引用计数
  void DecRef();  // 减少引用计数
  ```

#### **(2) `ObjectRef` (include/tvm/runtime/object.h)**
- **功能**：
  - 所有 **对象引用** 的基类模板（如 `Constant` 本质是 `ObjectRef<ConstantNode>`）
  - 通过智能指针 (`ObjectPtr`) **管理 Object 子类的生命周期**
  - 提供 **类型安全转换接口**（如 `as<T>()`）
- **关键行为**：
  ```cpp
  template<typename T>
  const T* as() const; // 安全类型转换
  operator bool() const; // 检查是否非空
  ```

#### **(3) `BaseExprNode` (include/tvm/ir/expr.h)**
- **继承关系**：`Object` → `BaseExprNode`
- **功能**：
  - 所有 **表达式节点** 的抽象基类
  - 定义表达式通用接口：
    - 数据类型 (`dtype`)
    - 源码位置 (`span`)
    - 虚函数 `SEqualReduce`（用于结构相等性比较）
- **关键成员**：
  ```cpp
  runtime::DataType dtype; // 数据类型（如 float32）
  Span span;               // 源码位置信息（用于调试）
  ```

#### **(4) `BaseExpr` (include/tvm/ir/expr.h)**
- **继承关系**：`ObjectRef` → `BaseExpr`
- **功能**：
  - 所有 **表达式引用** 的基类（如 `Constant`、`Var` 等）
  - 提供对 `BaseExprNode` 的通用访问接口
  - 重载运算符（如 `operator==`）实现表达式比较


  
#### **(5) `RelayExprNode` (include/tvm/ir/expr.h)**
- **继承关系**：`BaseExprNode` → `RelayExprNode`
- **功能**：
  - **Relay 表达式体系的节点基类**，定义所有高层计算图节点的通用行为
  - 存储 Relay 特有的元数据：
    - **类型信息** (`checked_type_`): 类型推断后的结果（如 `TensorType(shape=[1,3], dtype=float32)`）
    - **源码位置** (`span`): 用于调试和错误定位
  - 实现 **结构等价性检查** (`SEqualReduce`) 和 **哈希生成** (`SHashReduce`) 的虚函数
  - 支持 **递归遍历子节点** 的接口（用于优化 Pass 或分析）
- **关键成员**：
  ```cpp
  mutable Type checked_type_;  // 类型推断结果（可缓存）
  Span span;                   // 源码位置信息
  ```
- **典型子类**：
  - `ConstantNode`（常量）
  - `VarNode`（变量）
  - `CallNode`（函数调用）
  - `FunctionNode`（函数定义）



#### **(6) `RelayExpr` (include/tvm/ir/expr.h)**
- **继承关系**：`BaseExpr` → `RelayExpr`
- **功能**：
  - 通过`TVM_DEFINE_OBJECT_REF_METHODS`宏定义了对象引用管理、类型转换和节点访问的功能



#### **(7) `ConstantNode` (include/tvm/relay/expr.h)**
- **继承关系**：`RelayExprNode` → `ConstantNode`
- **功能**：
  - **存储常量数据的节点**（具体实现）
  - 持有 `runtime::NDArray` 表示常量值
  - 实现 `SEqualReduce` 比较常量值是否相等
  - 实现 `SHashReduce` 生成哈希值
- **关键成员**：
  ```cpp
  runtime::NDArray data; // 常量数据（可以是标量或张量）
  ```

#### **(8) `Constant` (include/tvm/relay/expr.h)**
- **继承关系**：`RelayExpr` → `Constant`
- **功能**：
  - **用户直接使用的常量包装类**
  - 构造函数封装 `ConstantNode` 的创建
  - 提供对 `data` 的安全访问方法
  - 示例用法：
    ```cpp
    NDArray arr = ...;
    Constant c = Constant(arr);  // 创建常量
    Expr expr = c;               // 可隐式转换为基类
    ```

有了对基类的功能认识，我们只需要继续了解类似`Constant`和`ConstantNode`类的其他主要类实现。

### **2. 数据节点：常量与变量**
#### **(1) `ConstantNode`**
- **继承关系**: `RelayExprNode` → `ConstantNode`
- **功能**: 存储计算图中的常量数据（如模型权重）
- **成员变量**:
  ```cpp
  runtime::NDArray data; // 数据载体（支持标量、向量、张量）
  ```
- **方法**:
  - `SEqualReduce`: 比较两个 NDArray 是否逐元素相等
  - `SHashReduce`: 基于 NDArray 数据生成哈希
- **包装类**: `Constant`
  ```cpp
  class Constant : public RelayExpr {
   public:
    explicit Constant(runtime::NDArray data);
    const ConstantNode* operator->() const;
  };
  ```

#### **(2) `VarNode`**
- **继承关系**: `RelayExprNode` → `VarNode`
- **功能**: 表示计算图中的变量（输入/中间变量）
- **成员变量**:
  ```cpp
  Id vid;                  // 变量唯一标识符（如 %x）
  Type type_annotation;    // 显式类型注解（可选）
  ```
- **包装类**: `Var`
  ```cpp
  class Var : public RelayExpr {
   public:
    Var(Id vid, Type type_annotation = Type(nullptr));
    static Var Create(Id vid, Type type_annotation); // 工厂方法
  };
  ```

---

### **3. 计算节点：算子与流程控制**
#### **(1) `CallNode`**
- **继承关系**: `RelayExprNode` → `CallNode`
- **功能**: 表示函数或算子的调用
- **成员变量**:
  ```cpp
  RelayExpr op;             // 被调用的函数/算子（可以是Var或Function）
  Array<RelayExpr> args;    // 调用参数列表
  Attrs attrs;              // 算子属性（如卷积的stride、padding）
  ```
- **包装类**: `Call`
  ```cpp
  class Call : public RelayExpr {
   public:
    Call(RelayExpr op, Array<RelayExpr> args, Attrs attrs = Attrs());
  };
  ```

#### **(2) `FunctionNode`**
- **继承关系**: `RelayExprNode` → `FunctionNode`
- **功能**: 定义 Relay 函数（类似 Lambda 表达式）
- **成员变量**:
  ```cpp
  Array<Var> params;      // 函数参数列表
  RelayExpr body;         // 函数体表达式
  Type ret_type;          // 显式声明的返回类型
  ```
- **包装类**: `Function`
  ```cpp
  class Function : public RelayExpr {
   public:
    Function(Array<Var> params, RelayExpr body, Type ret_type);
  };
  ```

#### **(3) `IfNode`**
- **继承关系**: `RelayExprNode` → `IfNode`
- **功能**: 条件分支控制流
- **成员变量**:
  ```cpp
  RelayExpr cond;         // 条件表达式（需为布尔标量）
  RelayExpr true_branch;  // 条件为真时执行的表达式
  RelayExpr false_branch; // 条件为假时执行的表达式
  ```
- **包装类**: `If`
  ```cpp
  class If : public RelayExpr {
   public:
    If(RelayExpr cond, RelayExpr true_branch, RelayExpr false_branch);
  };
  ```

---

### **4. 复合结构节点**
#### **(1) `TupleNode`**
- **继承关系**: `RelayExprNode` → `TupleNode`
- **功能**: 存储多个表达式的元组
- **成员变量**:
  ```cpp
  Array<RelayExpr> fields; // 元组中的元素列表
  ```
- **包装类**: `Tuple`
  ```cpp
  class Tuple : public RelayExpr {
   public:
    explicit Tuple(Array<RelayExpr> fields);
  };
  ```

#### **(2) `TupleGetItemNode`**
- **继承关系**: `RelayExprNode` → `TupleGetItemNode`
- **功能**: 从元组中按索引取值
- **成员变量**:
  ```cpp
  RelayExpr tuple;        // 目标元组
  int index;              // 索引值（从0开始）
  ```
- **包装类**: `TupleGetItem`
  ```cpp
  class TupleGetItem : public RelayExpr {
   public:
    TupleGetItem(RelayExpr tuple, int index);
  };
  ```

#### **(3) `LetNode`**
- **继承关系**: `RelayExprNode` → `LetNode`
- **功能**: 绑定局部变量（类似 let-in 表达式）
- **成员变量**:
  ```cpp
  Var var;                // 绑定的变量
  RelayExpr value;        // 变量的值
  RelayExpr body;         // 变量作用域内的表达式
  ```
- **包装类**: `Let`
  ```cpp
  class Let : public RelayExpr {
   public:
    Let(Var var, RelayExpr value, RelayExpr body);
  };
  ```

---
#### 节点连接方式
```cpp
class CallNode : public RelayExprNode {
 public:
  RelayExpr op;          // 被调用的算子（ObjectRef<RelayExprNode>）
  Array<RelayExpr> args; // 参数列表（ObjectRef 的容器）
};
```
这里的`Array`用来储存上面的一切包装类(如Constant，用来引用节点)。
`Array`的结构是`vector<ObjectRef>`.
#### AST示例
```cpp
// 构建表达式：add(mul(x, 2), y)
relay::Var x = relay::Var("x", TensorType({1}, DataType::Float(32)));
relay::Var y = relay::Var("y", TensorType({1}, DataType::Float(32)));
relay::Constant two = relay::Constant(runtime::NDArray::Scalar(2.0f));

// 节点连接关系：
// add_op -> CallNode
//   ├── op    : FunctionRef (指向加法算子)
//   │   ├── op    : FunctionRef (指向乘法算子)
//   │   ├── args[0]: VarNode (x)
//   │   └── args[1]: ConstantNode (2)
//   └── args[1]: VarNode (y)
relay::Call mul = relay::Call(mul_op, {x, two});
relay::Call add = relay::Call(add_op, {mul, y});
```
#### Pass
Pass的结构和继承关系也分为节点类和引用类两支。

使用`PassRegistry`全局注册表来管理 Pass。下面依次叙述一下各个类的功能。

`Pass`继承自`ObjectRef`是所有引用类的基类

`PassNode`继承自`Object`是所有节点类的基类

`PassContext`储存了上下文信息，如优化级别、依赖的Pass、配置等。

`PassInfo`储存了Pass的名称、描述、依赖关系等信息。

`Sequential`引用类

`SequentialNode`储存`PassInfo`和`Array<Pass>`，实现了遍历、执行、解析依赖的功能。
在`include/tvm/ir/transform.h`中定义。

`CreateFunctionPass`定义了函数级优化Pass
`CreateModulePass`定义了模块级优化Pass
