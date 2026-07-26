---
title: "TVM Function objects and registration implementation"
description: "梳理 TVM PackedFunc、全局函数注册表以及函数注册与查找机制。"
slug: "tvm-function-objects-and-registration"
publishedAt: 2025-01-28T00:00:00+08:00
updatedAt: 2025-02-07T16:41:10+08:00
category: "编译器"
tags: ["TVM"]
status: published
draft: false
---

首先给出TVM中注册自定义函数和调用自定义函数的方法
```cpp
// 注册函数
TVM_REGISTER_GLOBAL("add").set_body([](TVMArgs args, TVMRetValue* ret) {
    int a = args[0];
    int b = args[1];
    *ret = a + b;
});

// 调用函数
PackedFunc add = runtime::Registry::Get("add");
int result = add(3, 5);  // 返回 8
```
TVM实现注册Lambda函数的`set_body`函数是一个指向`PackedFunc`类型的指针.

`TVM_REGISTER_GLOBAL`的实现如下：
```cpp
#define REGISTER_GLOBAL(name, func) \
  tvm::runtime::FRegistry::Register(name, tvm::runtime::PackedFunc(func))
```

使用全局哈希表`FRegistry`注册函数。通过宏`REGISTER_GLOBAL("func_name", MyFunction)`将函数与名称绑定，后续通过`GetPackedFunc("func_name")`查找.

使用`REGISTER_GLOBAL`宏将函数与名称绑定。这个宏会调用`FRegistry::Register`方法，将函数存储到全局哈希表中。

`PackedFunc`类型继承自`ObjectRef`基类，实现了运算符重载，又用`make_object`函数创建一个`PackedFuncSubObj`类型对象，这个对象可以储存可调用对象.

`PackedFuncSubObj`继承自`PackedFuncObj`, 这是`Object`的子类，`Object`实现了引用计数和类型检查，`PackedFunObj`对函数指针、参数和返回值指针进行了打包。

`PackedFuncSubObj`类型用`std::remove_reference`和`std::remove_cv`进行了类型擦除，对`const`、`volatile`和引用进行去壳，移除我们不需要的特性.

`PackedFuncSubObj`中定义了`Extractor`提取器结构，提取器内部的`Call`函数是一个指针，用来调用可调用对象。

接下来解释一下参数和返回值的数据结构。

分别是`TVMArgs`和`TVMRetValue`,都使用了联合体`TVMValue`对数据进行打包并进行了运算符重载和用于数据传递的基本方法。

以上所有的实现基本都在`include/tvm/runtime/packed_func.h`、`include/tvm/runtime/registry.h`和`src/runtime/registry.cc`

`Python`封装了`ctypes`库，能够通过`name`查找全局注册的C++函数并获得函数句柄，调用后得到传回的返回值。
其中对数据类型的包装也是TVM实现任意语言互相调用的关键.
