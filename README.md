# GestureFlow Park

本版本把项目整理成一个只开放一局小游戏的乐园壳子。

当前内容：

- 登录页：保留最终锁定的售票处页面
- 登录后：首页、游戏庭、规则牌、手账、工具箱等页面全部围绕一个小游戏
- 当前唯一小游戏：手势反应挑战
- 数据库：仍只负责本地登录账号
- 页面外壳：不写摄像头、键盘、骨骼识别等具体交互逻辑
- 具体小游戏：后续每个游戏自己的输入和交互逻辑只写在游戏本体里

默认票：

```text
admin
admin123456
```

启动后端：

```powershell
cd D:\project\gestureflow_hci_project_v4\backend
npm install --registry=https://registry.npmmirror.com/
npm run dev
```

启动前端：

```powershell
cd D:\project\gestureflow_hci_project_v4\frontend
npm install --registry=https://registry.npmmirror.com/
npm run dev
```
