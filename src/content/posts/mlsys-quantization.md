---
title: "量化"
description: "关于神经网络量化、低精度推理与量化感知训练的课程笔记。"
slug: "mlsys-quantization"
publishedAt: 2026-07-25T09:01:00+08:00
category: "MLSys"
tags: ["MLSys", "Model Compression", "Quantization", "Low Precision"]
status: published
draft: false
---

# 量化

- ### 数值数据类型

- ### 量化方法

  - K-Means量化
  - 霍夫曼编码
  - 线性量化
  - 线性量化矩阵乘法
  
- ### 后训练量化

  - 量化粒度
  - 动态范围裁剪
  - 舍入
  - 量化感知训练
  - 三元量化
  - 混合精度量化

### 数据数值类型

<img src="/images/mlsys/lec5-6/image-20250411225658781.png" alt="image-20250411225658781" style="zoom:50%;" />

### 量化方法

- K-Means量化

<img src="/images/mlsys/lec5-6/image-20250411231500826.png" alt="image-20250411231500826" style="zoom:50%;" />

将相近的权重分组映射到低精度编码，在使用权重时根据码本还原原精度权重，训练时把相同颜色的梯度进行规约操作，更新权重。

- 霍夫曼编码

对频繁使用的权重使用低精度

对不常使用的权重使用高精度

- 线性量化

![image-20250411234006443](/images/mlsys/lec5-6/image-20250411234006443.png)
$$
q_{min}=-2^{N-1},q_{max}=2^{N-1}-1
$$
其中
$$
N=bit位数
$$

$$
S=\frac{r_{max}-r_{min}}{q_{max}-q_{min}}
$$

$$
Z=round(q_{min}-\frac{r_{min}}{S})
$$

- 线性量化矩阵乘法

![image-20250412131754035](/images/mlsys/lec5-6/image-20250412131754035.png)

略过简单的推导过程，直接考虑计算方法。

由于$Z_{W}$服从正态分布，且均值为0，因此直接忽略带$Z_{W}$的项。
$$
q_{Y}=\frac{S_{W}S_{X}}{S_{Y}}(q_{W}q_{X}-Z_{X}q_{W})+Z_{Y}
$$


$\frac{S_{W}S_{X}}{S_{Y}}$根据已有的研究表明，可以表示为$2^{-n}M_{0}$, where  $M_{0}\in [0.5,1]$。这可以通过定点数和位移操作计算，开销很小。

$Z_{X}q_{W}$这部分都可以预先进行计算，因此没有运行时开销。

$Z_{Y}$是低精度整数加法。

$q_{W}q_{X}$是整数乘法。

### 后训练量化

#### 量化粒度

- 张量维度量化

在每个张量上使用独立的S来量化。不同输出通道的权重范围差异很大（可能超过100倍），这会导致异常权重（outlier weight）的出现。这种大范围的差异使得使用单一缩放因子进行量化时，难以同时保持所有权重的准确性。

- 通道维度量化

<img src="/images/mlsys/lec5-6/image-20250412141819011.png" alt="image-20250412141819011" style="zoom:67%;" />

- 分组量化

  将数据以向量分组，在张量/通道维度量化(粗粒度)的基础上对每一个向量乘上一个独立的向量缩放因子(细粒度)。

  <img src="/images/mlsys/lec5-6/image-20250412143844904.png" alt="image-20250412143844904" style="zoom:67%;" />

#### 用于激活量化的动态范围裁剪

之前的$r_{max}, r_{min}$受到极端值影响很大，如果数据分布如下图，

<img src="/images/mlsys/lec5-6/image-20250412144459600.png" alt="image-20250412144459600" style="zoom:67%;" />

大部分数据的近似都将有很大误差。因此我们使用以下方法去除噪声。

- 训练时使用指数移动平均(EMA)

$$
\hat{r}^{(t)}_{max,min}=\alpha\cdot r^{(t)}_{max,min}+(1-\alpha)\cdot \hat{r}^{(t-1)}_{max,min}
$$

$\alpha$越大我们就越倾向于使用最近的动态范围。如果模型不是我们训练的，就不能使用这个方法。

- 通过在训练好的浮点32位（FP32）模型上运行一些样本来进行校准
  - 基于拉普拉斯分布

如果输入严格遵循拉普拉斯分布，
$$
min_{|r|_{\text{max}}} \mathbb{E} \left[ (X - Q(X))^2\right]
$$
拉普拉斯分布(0,b)，对于2、3、4位量化，最优的 $|r|_{\text{max}} $ 分别为 $2.83b, 3.89b, 5.03b $，参数 *b* 可以通过校准输入数据的分布来估计。

- - 基于KL散度

信息损失是通过KL散度来表征的，类似交叉熵损失。
$$
D_{KL}(P||Q)=\sum_{N}^{L}P(x_{i})log\frac{P(x_{i})}{Q_(x_{i})}
$$

- - 基于Newton-Raphson方法最小化均方误差(MSE)

MSE:
$$
E(\theta) = \frac{1}{n} \sum_{i=1}^{n} (y_i - f(x_i; \theta))^2
$$
Newton-Raphson方法:
$$
\theta_{k+1} = \theta_k - H_k^{-1} \nabla E(\theta_k)
$$
$\nabla E$:
$$
\nabla E(\theta) = -\frac{2}{n} \sum_{i=1}^{n} (y_i - f(x_i; \theta)) \nabla f(x_i; \theta)
$$
$H$:
$$
\nabla^2 E(\theta) = \frac{2}{n} \sum_{i=1}^{n} \left( \nabla f(x_i; \theta) \nabla f(x_i; \theta)^T + (y_i - f(x_i; \theta)) \nabla^2 f(x_i; \theta) \right)
$$

### 舍入

四舍五入并不是最佳选择，每个权重的最佳舍入并不是整个张量的最佳舍入，我们采用基于学习的方法。
$$
\text{argmin}_V \|Wx - [[W] + h(V)]x\|_F^2 + \lambda f_{\text{reg}}(V)
$$
$h()$是类似sigmoid的映射到(0,1)的函数

$V$是与矩阵形状相同的随机变量

最后一项是正则化项，用来鼓励$h(V)$在(0,1)取二值

这样在四舍五入时加入一些随机性很有帮助。

### 量化感知训练

<img src="/images/mlsys/lec5-6/image-20250412155224836.png" alt="image-20250412155224836" style="zoom:67%;" />
$$
Y\rarr S_{Y}(q_{Y}- Z_{Y})=Q(Y)
$$
其中 $Q(Y)$ 是量化的输出矩阵

又称为模拟/伪量化，这是为了模拟量化环境，得到适应量化环境的模型。

在整个训练过程，我们一直维护一个原精度权重副本。这样我们就可以累积小梯度，提高模型精度。

但是$Q()$实际上是一个阶跃函数，

<img src="/images/mlsys/lec5-6/image-20250412160215073.png" alt="image-20250412160215073" style="zoom:50%;" />

在反向传播的时候梯度全为0。因此我们要使用直通估计器(STE)。

<img src="/images/mlsys/lec5-6/image-20250412160401894.png" alt="image-20250412160401894" style="zoom:50%;" />
$$
g_{W}=\frac{\partial L}{\partial W}=\frac{\partial L}{\partial Q(W)}
$$
![image-20250412160839755](/images/mlsys/lec5-6/image-20250412160839755.png)

也就是直接对$Q(W)$求梯度，作用在原矩阵上。

### 三元量化

![image-20250412183136444](/images/mlsys/lec5-6/image-20250412183136444.png)

按照之前在量化中增加随机性的经验，我们根据r确定量化为1/-1的概率。

又根据之前的经验，我们使用$\alpha W^{B}$来让矩阵所有元素的和与原矩阵相等。其中$\alpha=\frac{1}{n}||W||$。

如果激活和权重全是二值化的，计算方法如下

![image-20250412184957518](/images/mlsys/lec5-6/image-20250412184957518.png)

计算公式在图右上角。原理就是先假设符号全不相同，因为每有一个相同就差2，因此找出有几个相同再×2。这样计算开销极低。

<img src="/images/mlsys/lec5-6/image-20250412192404367.png" alt="image-20250412192404367" style="zoom:50%;" />

- TWN

<img src="/images/mlsys/lec5-6/image-20250412195042070.png" alt="image-20250412195042070" style="zoom:50%;" />

- TTQ

<img src="/images/mlsys/lec5-6/image-20250412195128112.png" alt="image-20250412195128112" style="zoom: 50%;" /> $w_{p},w_{n}$是可学习的

### 混合精度量化

混合的搜索空间极大，所以也使用强化学习自动搜索。

