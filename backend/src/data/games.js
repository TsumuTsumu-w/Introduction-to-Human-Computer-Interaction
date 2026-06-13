export const games = [
  {
      id: 'reaction-wave',
      name: '手势反应创造',
      status: 'official-gesture-game',
      theme: '单手骨骼反应摊',
      template: false,
      summary: '使用官方 MediaPipe Gesture Recognizer 识别手势，主屏只显示骨骼，副屏用隐私滤镜确认手部位置。'
    },
  {
      id: 'magic-block-builder',
      name: '可调视角体素积木园',
      status: 'adjustable-perspective-voxel-game',
      theme: '第一视角体素建造摊',
      template: false,
      summary: '全屏可调视角体素建造沙盒：一指水平移动，两指横向旋转，三指调俯仰角，四指升降高度，握拳放置，捏合删除。'
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
    },
  {
      id: 'color-paper-synth',
      name: '彩纸合成器',
      status: 'paper-synth-game',
      theme: '纸面音乐厅',
      template: false,
      summary: '用选色笔把纸面色块绑定为电子琴音和低音鼓，随后用食指进入固定色块框来触发声音。'
    },
  {
      id: 'dinosaur-run',
      name: '恐龙奔袭',
      status: 'gesture-dino-run-game',
      theme: '手势荒原跑道',
      template: false,
      summary: '把经典小恐龙奔跑游戏改造成手势输入：握拳跳跃、比 V 俯身，躲开仙人掌和飞鸟。'
    },
  {
      id: 'bell-template',
      name: '乐园敲敲钟',
      status: 'special',
      theme: '铃铛挑战摊',
      template: true,
      summary: '一个轻量铃铛小游戏，点击小铃铛完成挑战，并把结果写入手账。'
    },

]

export const activeGame = games[0]

export function findGame(id) {
  return games.find((game) => game.id === id) || null
}

export function visibleGames() {
  return games
}

export default games

