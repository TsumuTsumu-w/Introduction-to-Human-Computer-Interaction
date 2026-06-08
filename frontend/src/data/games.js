export const games = [
  {
    id: 'reaction-wave',
    name: '手势反应挑战',
    shortName: '反应挑战',
    navName: '反应',
    tag: '正式游戏',
    theme: '单手骨骼反应摊',
    route: '/play/reaction-wave',
    detailRoute: '/games/reaction-wave',
    summary: '使用官方 MediaPipe Gesture Recognizer 识别手势，主屏只显示骨骼，副屏用隐私滤镜确认手部位置。',
    coverLine: '这是正式小游戏示例：单手模式、官方手势识别、骨骼主屏、隐私副屏、移动与静态手势混合挑战。',
    steps: ['申请摄像头权限', '点击开始后 5 秒内伸手', '按动作牌移动或摆手势', '完成后留下反应挑战章'],
    stamp: '反应挑战章',
    template: false,
    templateOrder: 0,
    pageRole: 'mature-camera-game',
    backendId: 'reaction-wave',
    tone: 'gold',
    spec: {
      level: 'mature-camera-game',
      requiresOwnEntry: true,
      requiresRuleBoard: true,
      requiresPlayStage: true,
      requiresRecord: true,
      requiresBackendStats: true,
      requiresCameraPermission: true,
      requiresOfficialGestureRecognizer: true,
      requiresHandSkeleton: true,
      requiresLargeMotion: true,
      usesSingleHandMode: true,
      usesUserLeftRight: true
    },
    play: {
      kicker: 'Official Gesture Game',
      intro: '单手模式。点击开始后会给 5 秒找手窗口，识别到完整手部骨骼后自动进入倒计时。',
      idleTitle: '等待摄像头',
      activeTitle: '按动作牌完成挑战',
      doneTitle: '挑战完成',
      idleHint: '先申请摄像头权限，再点击开始挑战。',
      activeHint: '跟随动作牌完成移动或手势。',
      doneHint: '这一轮已经写入手账，并尝试同步到后端。',
      startLabel: '开始挑战',
      finishLabel: '完成动作',
      resetLabel: '重来'
    }
  },
  {
    id: 'magic-block-builder',
    name: '自由积木乐园',
    shortName: '积木乐园',
    navName: '积木',
    tag: '正式游戏',
    theme: '星桥搭建摊',
    route: '/play/magic-block-builder',
    detailRoute: '/games/magic-block-builder',
    summary: '以手势为核心的全屏轻 3D 自由搭建玩具：张开手移动，闭合抓取，张开放下，抽底、堆叠和吹风都有物理反馈。',
    coverLine: '第二个正式小游戏：只保留自由搭建，没有固定关卡；主屏是全屏轻 3D 物理积木舞台，换块和吹风都走页面按钮。',
    steps: ['申请摄像头权限', '5 秒内伸手进入画面', '张开移动，闭合抓取，张开放下', '用按钮换块、按钮吹风或重置舞台'],
    stamp: '自由积木章',
    template: false,
    templateOrder: 0,
    pageRole: 'freebuild-physics-game',
    backendId: 'magic-block-builder',
    tone: 'sky',
    spec: {
      level: 'freebuild-physics-game',
      requiresOwnEntry: true,
      requiresRuleBoard: true,
      requiresPlayStage: true,
      requiresRecord: true,
      requiresBackendStats: true,
      requiresCameraPermission: true,
      requiresOfficialGestureRecognizer: true,
      requiresHandSkeleton: true,
      usesNaturalHandActions: true,
      usesVoiceCommands: false,
      usesFaceExpressionAsOptionalBonus: true,
      noKeyboardCoreInput: true
    },
    play: {
      kicker: 'Free Build Physics Game',
      intro: '手势是核心：张开手只移动，方块上方由张开变闭合才抓取；抓住后张开才放下。页面按钮负责换块、按钮吹风和重置。',
      idleTitle: '等待摄像头',
      activeTitle: '自由搭建中',
      doneTitle: '自由搭建完成',
      idleHint: '先申请摄像头权限，再点击开始自由搭建。',
      activeHint: '用手势抓取、移动和放下积木；换块、吹风和重置使用页面按钮。',
      doneHint: '这一轮已经写入手账。',
      startLabel: '开始自由搭建',
      finishLabel: '放下积木',
      resetLabel: '重来'
    }
  },
  {
    id: 'bell-template',
    name: '乐园敲敲钟',
    shortName: '敲敲钟',
    navName: '铃铛',
    tag: '模板 1',
    theme: '铃铛模板摊',
    route: '/play/bell-template',
    detailRoute: '/games/bell-template',
    summary: '模板一：最小小游戏链路，演示开始、完成、写入手账、同步后端。',
    coverLine: '这个页面是以后新增小游戏的第一种参考结构：一个清晰按钮、一个反馈面板、一条记录链路。',
    steps: ['拿到模板票', '进入小游戏页', '点一下小铃铛', '写入手账记录'],
    stamp: '铃铛模板章',
    template: true,
    templateOrder: 1,
    pageRole: 'template-game',
    backendId: 'bell-template',
    tone: 'mint',
    spec: {
      level: 'placeholder-template',
      requiresOwnEntry: true,
      requiresRuleBoard: true,
      requiresPlayStage: true,
      requiresRecord: true,
      requiresBackendStats: true
    },
    play: {
      kicker: 'Template Game 1',
      intro: '模板一用于演示最小小游戏结构：自己的入口、自己的规则、自己的游玩场、自己的记录字段和后端统计路径。',
      idleTitle: '等你开始',
      activeTitle: '小铃铛亮了',
      doneTitle: '模板一完成',
      idleHint: '按下开始模板一。',
      activeHint: '点击小铃铛，写入一条模板记录。',
      doneHint: '模板一已经完成记录链路。',
      startLabel: '开始模板一',
      finishLabel: '敲一下',
      resetLabel: '重来'
    }
  },
  {
    id: 'bubble-template',
    name: '彩虹泡泡站',
    shortName: '泡泡站',
    navName: '泡泡',
    tag: '模板 2',
    theme: '泡泡模板摊',
    route: '/play/bubble-template',
    detailRoute: '/games/bubble-template',
    summary: '模板二：稍微活泼一点的小游戏链路，演示不同页面装扮也可以复用同一套接入规范。',
    coverLine: '这个页面展示另一种模板结构：更重视场景反馈，但仍然遵守入口、规则、手账、后端统计四件套。',
    steps: ['选择泡泡票', '进入泡泡站', '点亮一颗泡泡', '留下泡泡小章'],
    stamp: '泡泡模板章',
    template: true,
    templateOrder: 2,
    pageRole: 'template-game',
    backendId: 'bubble-template',
    tone: 'sky',
    spec: {
      level: 'placeholder-template',
      requiresOwnEntry: true,
      requiresRuleBoard: true,
      requiresPlayStage: true,
      requiresRecord: true,
      requiresBackendStats: true
    },
    play: {
      kicker: 'Template Game 2',
      intro: '模板二用于演示另一种页面装扮。以后不同游戏可以有不同视觉，但必须保留入口、规则、游玩场、记录、后端统计这条链。',
      idleTitle: '等你开始',
      activeTitle: '泡泡亮起来了',
      doneTitle: '模板二完成',
      idleHint: '按下开始模板二。',
      activeHint: '点击泡泡，写入一条模板记录。',
      doneHint: '模板二已经完成记录链路。',
      startLabel: '开始模板二',
      finishLabel: '点亮泡泡',
      resetLabel: '重来'
    }
  }
]

export const activeGame = games[0]
export const templateGames = games.filter((game) => game.template)

export const shellNavItems = [
  { label: '游戏庭', hint: '选择小游戏', to: '/games', symbol: '✦' },
  { label: '规则牌', hint: '三步看玩法', to: '/rules', symbol: '☞' },
  { label: '手账', hint: '盖章记录', to: '/records', symbol: '≋' },
  { label: '园区小路', hint: '查看路线', to: '/map', symbol: '◇' },
  { label: '工具箱', hint: '轻量设置', to: '/toolbox', symbol: '⚙' }
]

export const parkRouteStops = [
  { label: '游戏庭', hint: '先选一局', to: '/games' },
  { label: '规则牌', hint: '看玩法', to: '/rules' },
  { label: '手账', hint: '完成后盖章', to: '/records' },
  { label: '工具箱', hint: '轻量设置', to: '/toolbox' }
]

export function findGame(id) {
  return games.find((game) => game.id === id) || activeGame
}

export function visibleGames() {
  return games
}

export function gameShortName(id) {
  return findGame(id)?.shortName || 'GF'
}

