# 星桥积木魔法屋 3D 自由搭建改版说明

本次改版只修改 frontend / backend / database 三个目录内的内容。

## 核心变化

- 新增 `frontend/src/views/BlockFreeBuildView.vue`，`/play/magic-block-builder` 进入全屏轻 3D 自由搭建场景。
- `magicBlockBuilderLogic.js` 改为自定义轻量物理引擎：重力、堆叠、支撑检测、抽底掉落、风力推动、稳定成就。
- 摄像头不直接铺满主屏，只放在右侧隐私副屏：强模糊，仅确认手部区域。
- 视角采用固定预设：广场视角、近景视角、俯视辅助；不做自由旋转，避免幼儿操作混乱。
- 手势仍是核心：张开移动，方块上方张开到闭合抓取，闭合到张开放下。
- 表情只保留两个轻彩蛋：微笑触发阳光和彩虹，吹气触发真实风力。
- 语音作为辅助：开始、重来、清空、换一个、放下、吹一下、切视角、红色/蓝色/黄色/绿色。

## 检查情况

已在当前环境完成静态检查：

- `node --check frontend/src/games/magicBlockBuilderLogic.js`
- `node --check frontend/src/utils/sensory/simpleFaceExpressionEngine.js`
- `node --check frontend/src/router/index.js`
- `node --check frontend/src/data/games.js`
- `node --check backend/src/data/games.js`
- `node backend/src/self-test.js`
- Vue 文件标签数量检查：`BlockFreeBuildView.vue` 与 `PlayStageView.vue` 的 template/script/style 成对。

当前压缩包不包含 `node_modules`，因此未在本环境执行完整 Vite build；在本地项目原有依赖环境中可继续执行 `cd frontend && npm run build` 验证。
