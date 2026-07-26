---
title: "知识蒸馏（Knowledge Distillation）"
description: "关于知识蒸馏、自蒸馏、在线蒸馏与网络增强的课程笔记。"
slug: "mlsys-knowledge-distillation"
publishedAt: 2026-07-25T09:02:00+08:00
category: "MLSys"
tags: ["MLSys", "Model Compression", "Knowledge Distillation", "NetAug"]
status: published
draft: false
---

# 知识蒸馏 (Knowledge Distillation)

## 知识蒸馏概览

- 知识蒸馏简介
  - 什么是知识蒸馏
  - 为什么微型模型难以训练
  - 蒸馏的基本原理（Logits 与 Temperature）
- 蒸馏内容的抉择（What to match）
  - 输出 Logits
  - 中间层权重（Intermediate Weights）
  - 中间层特征（Intermediate Features）
  - 关系信息（Relational Information）
- 自蒸馏与在线蒸馏
  - Born-Again Neural Networks
  - Deep Mutual Learning（在线蒸馏）
  - Be Your Own Teacher（自蒸馏）
- 不同任务中的蒸馏
  - 目标检测（Object Detection）
  - 语义分割（Semantic Segmentation）
  - GANs 与 NLP
- 网络增强（Network Augmentation）
  - 传统数据增强在微型模型上的局限
  - NetAug 训练流程

## 知识蒸馏简介

### 背景与挑战

微型模型（Tiny Models）由于参数量少，往往存在欠拟合（Underfitting）现象。从训练曲线可以看出，微型模型在训练集上的准确率也较低，这说明模型容量不足以拟合数据。知识蒸馏的核心思想是：利用一个训练好的大型教师网络（Teacher Network）来指导学生网络（Student Network）的训练。

## 核心机制：Logits 与温度（Temperature）

不仅要学习由 Softmax 生成的最终硬标签（Hard Label，如 `[0, 1, 0]`），还要学习教师网络输出的软标签（Soft Label）。软标签包含了类间的相似性信息，例如虽然是“猫”，但它长得有点像“狗”。

引入温度参数 $T$ 来平滑概率分布：

$$
p(z_i, T) = \frac{\exp(z_i/T)}{\sum_j \exp(z_j/T)}
$$

- $z_i$：Logits 输出。
- $T$：温度参数。$T=1$ 为标准 Softmax；$T$ 越大，分布越平滑，包含的“暗知识”越多。

## 蒸馏内容的抉择（What to match）

除了输出层的 Logits，我们还可以匹配教师和学生的中间层信息。

### 1. 匹配输出 Logits

这是最基础的蒸馏方式。损失函数通常包含两部分：

1. 分类损失（Cross Entropy with true labels）。
2. 蒸馏损失（KL Divergence or MSE with teacher's soft labels）。

### 2. 匹配中间权重（Intermediate Weights）

由 FitNets 提出。由于教师和学生的层维度可能不同，通常需要引入一个线性映射层（如 $1 \times 1$ 卷积或全连接层）将学生的特征映射到教师的维度，然后计算 $L_2$ 损失。

$$
W_{\mathrm{Guided}} = \operatorname*{arg\,min}_{W_{\mathrm{Guided}}} \mathcal{L}_{HT}(W_{\mathrm{Guided}}, W_r)
$$

### 3. 匹配中间特征（Intermediate Features）

- **Attention Maps**：并不是匹配具体的像素值，而是匹配特征图的梯度或注意力分布。
- **Sparsity Patterns**：匹配 ReLU 激活后的稀疏模式，即哪些神经元被激活了。

### 4. 匹配关系信息（Relational Information）

不仅关注单个样本的特征，还关注样本之间或层之间的关系。

- **Point-to-Point**：传统 KD。
- **Structure-to-Structure**：计算一个 Batch 内样本间的距离矩阵（Gram Matrix 或 Euclidean Distance），让学生网络学习这种样本间的结构关系。

## 自蒸馏与在线蒸馏

### 传统蒸馏的局限

传统 KD 需要一个预训练好的、固定的、庞大的教师网络。这在某些场景下不可行。

### Born-Again Neural Networks（自蒸馏）

教师网络和学生网络结构相同（$T=S$）。

1. 训练网络 A。
2. 用训练好的网络 A 作为教师，蒸馏一个新的网络 A'。
3. 迭代此过程。最终可以集成多个阶段的网络以获得更好性能。

### Deep Mutual Learning（在线蒸馏）

没有预训练的教师。两个（或多个）网络从头开始同时训练，互相作为对方的教师。损失函数包含：

1. 自身的分类损失。
2. 与另一个网络预测分布的 KL 散度。

结果证明，两个网络都能比独立训练时表现更好。

### Be Your Own Teacher

利用网络自身的深层特征来指导浅层特征的学习。在网络内部添加多个分类头（Classifier），深层的分类头指导浅层的分类头。

## 不同任务中的蒸馏

### 目标检测（Object Detection）

- **特征模拟**：针对检测任务的前景和背景不平衡，可以使用加权交叉熵损失，或只在前景区域计算损失。
- **边界框蒸馏**：将边界框回归（Regression）问题转化为分类问题（将坐标轴离散化为 Bin），然后利用 KD 匹配概率分布（Localization Distillation）。

### 语义分割（Semantic Segmentation）

除了像素级（Pixel-wise）损失，还引入对抗训练（GAN）：

- 引入鉴别器（Discriminator）来判断分割图是来自学生还是教师。
- 强制学生生成的特征图和分割图在整体结构上与教师相似。

### GANs

- **压缩 GAN**：学生生成器学习模仿教师生成器的像素输出，同时保持更小的计算量（MACs）。

### NLP（BERT 蒸馏）

- **MobileBERT**：不仅蒸馏预测结果，还进行注意力转移（Attention Transfer），让学生 Transformer 的 Attention Map 模仿教师。

## 网络增强（Network Augmentation）

### 传统数据增强的困境

对于大型网络（如 ResNet50），强力的数据增强（Mixup、AutoAugment、Cutout）能防止过拟合、提升精度。但对于微型网络（如 MobileNetV2-Tiny），这些增强技术反而会导致欠拟合、降低精度，因为微型模型本身容量就小，难以学习被严重扭曲的数据。

### NetAug 原理

既然不能增强数据，那就增强网络。在训练过程中，构建一个增强版的模型（Augmented Model），作为辅助监督。

### 训练流程

1. 定义基础小模型 $g_{\mathrm{base}}$。
2. 构建增强模型 $g_{\mathrm{aug}}$（例如增加宽度、深度），使其包含 $g_{\mathrm{base}}$ 的权重。
3. 强迫 $g_{\mathrm{base}}$ 和 $g_{\mathrm{aug}}$ 共享权重。
4. 损失函数结合基础监督和辅助监督：

$$
\mathcal{L}_{\mathrm{aug}} = \mathcal{L}(W_{\mathrm{base}}) + \alpha\mathcal{L}([W_{\mathrm{base}}, W_{\mathrm{aug}}])
$$

训练结束后，只保留 $g_{\mathrm{base}}$ 进行推理。这相当于在训练时获得额外的“虚拟”大模型监督，提升了微型模型的性能而不增加推理开销。

