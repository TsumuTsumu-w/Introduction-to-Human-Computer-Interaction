export const games = [
  {
    id: 'reaction-wave',
    name: '手势反应挑战',
    status: 'official-gesture-game',
    theme: '单手骨骼反应摊',
    template: false,
    summary: '使用官方 MediaPipe Gesture Recognizer 识别手势，主屏只显示骨骼，副屏用隐私滤镜确认手部位置。'
  },
  {
    id: 'magic-block-builder',
    name: '自由积木乐园',
    status: 'freebuild-physics-game',
    theme: '自由积木玩具台',
    template: false,
    summary: '以手势为核心的全屏轻 3D 自由积木玩具：张开移动、闭合抓取、张开放下，按钮负责换块、按钮吹风和重置。'
  },
  {
    id: 'emotion-cipher-gate',
    name: '星语密门',
    status: 'expression-code-game',
    theme: '表情密钥厅',
    template: false,
    summary: '用摄像头识别微笑与吹气，依次点亮三道表情锁，再输入合成口令开启密门。'
  },
  {
    id: 'voice-gesture-radio',
    name: '手势星图导航',
    status: 'gesture-star-map-game',
    theme: '手势导航棋盘',
    template: false,
    summary: '用手势控制星图信标移动：张开手掌上移、握拳下移、V 左移、点赞右移，在倒计时内点亮目标星点。'
  },  {
    id: 'bell-template',
    name: '乐园敲敲钟',
    status: 'template',
    theme: '铃铛模板摊',
    template: true,
    summary: '模板一：最小小游戏链路，演示开始、完成、写入手账、同步后端。'
  },
  {
    id: 'bubble-template',
    name: '彩虹泡泡站',
    status: 'template',
    theme: '泡泡模板摊',
    template: true,
    summary: '模板二：另一种页面装扮，演示同一接入规范可以换视觉结构。'
  }
]

export function findGame(id) {
  return games.find((game) => game.id === id) || null
}

