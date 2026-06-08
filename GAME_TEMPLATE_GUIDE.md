# GestureFlow 新增小游戏强规范

当前项目里有三个小游戏，三者都遵守同一套入口、规则、游玩场、手账、后端统计规范。

---

## 1. 手势反应挑战

- 类型：正式单手摄像头手势游戏
- 路由：/play/reaction-wave
- 前端配置：frontend/src/data/games.js
- 游戏逻辑：frontend/src/games/reactionWaveLogic.js
- 手势引擎：frontend/src/utils/gesture/mediapipeGestureEngine.js
- 后端 id：reaction-wave

特点：

1. 使用官方 @mediapipe/tasks-vision GestureRecognizer。
2. 单手模式，只追踪当前最清晰的一只手。
3. 主屏只显示骨骼，不显示人脸和原始画面。
4. 副屏使用强隐私滤镜，只放大手部区域用于确认。
5. 静态手势由官方 Gesture Recognizer 判定。
6. 移动动作由手部 landmarks 的中心位移判定。
7. 左右按用户自己的左右判定。
8. 一局 8 题，完成后写入手账并调用后端 POST /api/records。

---

## 2. 乐园敲敲钟

- 类型：占位模板 1
- 路由：/play/bell-template
- 逻辑文件：frontend/src/games/bellTemplateLogic.js
- 后端 id：bell-template

用途：最小模板结构，演示开始、完成、写入手账、同步后端。

---

## 3. 彩虹泡泡站

- 类型：占位模板 2
- 路由：/play/bubble-template
- 逻辑文件：frontend/src/games/bubbleTemplateLogic.js
- 后端 id：bubble-template

用途：另一种视觉模板结构，演示同一接入规范可以换不同玩法反馈。

---

## 核心信息架构

游戏庭 = 所有小游戏列表。
游玩票 = 单个小游戏说明页。
游玩场 = 从某个小游戏进入后的 /play/:id 页面，不是全局固定导航。
规则牌 = 所有小游戏规则。
手账 = 所有小游戏记录。
工具箱 = 壳子级轻量设置。

---

## 新增小游戏时的最低要求

每个小游戏都应至少有：

1. frontend/src/data/games.js 中的配置。
2. backend/src/data/games.js 中的后端注册。
3. 一个逻辑文件，例如 frontend/src/games/xxxLogic.js。
4. 规则牌 steps。
5. 游玩场 route。
6. 手账记录 action/stamp。
7. 后端 stats/records 支持。

---

## 什么时候需要单独拆页面

普通小游戏可以继续复用 PlayStageView.vue。
如果某个游戏需要大量专属 UI、复杂摄像头、骨骼识别、多阶段状态机，可以再单独拆页面。

---

## 边界

首页、游戏庭、规则牌、手账、工具箱是乐园壳子。
具体输入方式、动作判断、摄像头、键盘、骨骼识别，只属于对应小游戏本体逻辑。
