export const games = [
  {
      id: 'reaction-wave',
      name: '手势反应创造',
      shortName: '反应创造',
      navName: '反应',
      tag: '正式游戏',
      theme: '单手骨骼反应摊',
      route: '/play/reaction-wave',
      detailRoute: '/games/reaction-wave',
      summary: '使用官方 MediaPipe Gesture Recognizer 识别手势，主屏只显示骨骼，副屏用隐私滤镜确认手部位置。',
      coverLine: '这是正式小游戏示例：单手模式、官方手势识别、骨骼主屏、隐私副屏、移动与静态手势混合创造。',
      steps: ['申请摄像头权限', '点击开始后 5 秒内伸手', '按动作牌移动或摆手势', '完成后留下反应创造章'],
      stamp: '反应创造章',
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
        activeTitle: '按动作牌完成创造',
        doneTitle: '创造完成',
        idleHint: '先申请摄像头权限，再点击开始创造。',
        activeHint: '跟随动作牌完成移动或手势。',
        doneHint: '这一轮已经写入手账，并尝试同步到后端。',
        startLabel: '开始创造',
        finishLabel: '完成动作',
        resetLabel: '重来'
      }
    },
  {
      id: 'magic-block-builder',
      name: '可调视角体素积木园',
      shortName: '体素积木',
      navName: '体素',
      tag: '正式游戏',
      theme: '第一视角体素建造摊',
      route: '/play/magic-block-builder',
      detailRoute: '/games/magic-block-builder',
      summary: '全屏可调视角体素建造沙盒：一指水平移动，两指横向旋转，三指调俯仰角，四指升降高度，握拳放置，捏合删除。',
      coverLine: '第二个正式小游戏：儿童版创造模式，没有固定任务；使用强排斥评分式手势识别，一指移动、两指旋转、三指俯仰、四指升降，握拳放置，捏合删除。',
      steps: ['申请摄像头权限', '5 秒内伸手进入画面', '一指移动，两指横向旋转，三指俯仰，四指升降', '握拳放置方块，捏合删除方块'],
      stamp: '体素创造章',
      template: false,
      templateOrder: 0,
      pageRole: 'adjustable-perspective-voxel-game',
      backendId: 'magic-block-builder',
      tone: 'sky',
      spec: {
        level: 'mature-camera-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true,
        requiresCameraPermission: true,
        requiresOfficialGestureRecognizer: true,
        requiresHandSkeleton: false,
        usesNaturalHandActions: true,
        usesVoiceCommands: false,
        usesFaceExpressionAsOptionalBonus: true,
        noKeyboardCoreInput: true
      },
      play: {
        kicker: 'Adjustable Perspective Voxel Game',
        intro: '强排斥评分式识别：一指水平移动，两指横向旋转，三指调 0°~89° 俯仰角，四指升降高度，握拳放置 1×1×1 方块，捏合删除准星选中的方块。',
        idleTitle: '等待摄像头',
        activeTitle: '自由建造中',
        doneTitle: '体素建造完成',
        idleHint: '先申请摄像头权限，再点击开始创造。',
        activeHint: '看中央准星：握拳放置、捏合删除；一指移动，两指旋转，三指调俯仰，四指升降。',
        doneHint: '这一轮已经写入手账。',
        startLabel: '开始创造',
        finishLabel: '完成建造',
        resetLabel: '重来'
      }
    },
  {
      id: 'emotion-cipher-gate',
      name: '星语密门',
      shortName: '密门',
      navName: '表情',
      tag: '正式游戏',
      theme: '表情密钥厅',
      route: '/play/emotion-cipher-gate',
      detailRoute: '/games/emotion-cipher-gate',
      pageFile: 'frontend/src/views/games/EmotionCipherGateGame.vue',
      summary: '用摄像头识别微笑与吹气，依次点亮三道表情锁，再输入合成口令开启密门。',
      coverLine: '这是一局表情与文字联动的密室小游戏：先让表情点亮门锁，再把门锁合成的口令输入进去。',
      steps: ['申请摄像头权限', '对着镜头微笑和吹气', '观察三道门锁的提示', '输入合成口令完成通关'],
      stamp: '密门通行章',
      template: false,
      templateOrder: 0,
      pageRole: 'expression-code-game',
      backendId: 'emotion-cipher-gate',
      tone: 'gold',
      spec: {
        level: 'expression-code-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true,
        requiresCameraPermission: true,
        usesFaceExpressionAsPrimaryInput: true,
        usesTextInput: true,
        noKeyboardCoreInput: true
      },
      play: {
        kicker: 'Expression Code Game',
        intro: '微笑和吹气会依次点亮三道表情锁，全部点亮后再输入系统生成的合成口令。',
        idleTitle: '等待摄像头',
        activeTitle: '表情锁运行中',
        doneTitle: '密门开启',
        idleHint: '先申请摄像头，或直接点开启密门进入手动模式。',
        activeHint: '跟着提示对镜头微笑或轻轻吹气，三道锁亮起后再输入口令。',
        doneHint: '这一轮已经写入手账，可以重新开始再开一次门。',
        startLabel: '开启密门',
        finishLabel: '提交密钥',
        resetLabel: '重来'
      }
    },
  {
      id: 'voice-gesture-radio',
      name: '手势星图导航',
      shortName: '星图',
      navName: '星图',
      tag: '正式游戏',
      theme: '手势导航棋盘',
      route: '/play/voice-gesture-radio',
      detailRoute: '/games/voice-gesture-radio',
      pageFile: 'frontend/src/views/games/VoiceGestureRadioGame.vue',
      summary: '用手势控制星图信标移动：张开手掌上移、握拳下移、V 左移、点赞右移，在倒计时内点亮目标星点。',
      coverLine: '这是一个纯手势导航小游戏：不是跟读口令，也不是照着做单个动作，而是用手势当方向键在星图棋盘里规划路线。',
      steps: ['申请摄像头权限', '用四种手势控制信标方向', '按顺序收集星图目标', '在倒计时内完成三张星图'],
      stamp: '手势星图导航章',
      template: false,
      templateOrder: 0,
      pageRole: 'gesture-star-map-game',
      backendId: 'voice-gesture-radio',
      tone: 'sky',
      spec: {
        level: 'gesture-star-map-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true,
        requiresCameraPermission: true,
        requiresOfficialGestureRecognizer: true,
        usesVoiceCommands: false,
        usesTextInput: false,
        noKeyboardCoreInput: true
      },
      play: {
        kicker: 'Gesture Star Map',
        intro: '把手势当成方向键：张开手掌上移，握拳下移，比 V 左移，点赞右移，按顺序点亮星图目标。',
        idleTitle: '等待星图启动',
        activeTitle: '星图导航中',
        doneTitle: '星图完成',
        idleHint: '先申请摄像头，再开始星图导航。',
        activeHint: '看准目标坐标，用手势移动信标。',
        doneHint: '三张星图完成后会自动写入记录。',
        startLabel: '开始星图',
        finishLabel: '点亮星点',
        resetLabel: '重来'
      }
    },
  {
      id: 'color-paper-synth',
      name: '彩纸合成器',
      shortName: '彩纸琴',
      navName: '彩纸',
      tag: '正式游戏',
      theme: '纸面音乐厅',
      route: '/play/color-paper-synth',
      detailRoute: '/games/color-paper-synth',
      pageFile: 'frontend/src/views/games/ColorPaperSynthGame.vue',
      summary: '用选色笔把纸面色块绑定为钢琴音和低音鼓，随后用食指进入固定色块框来触发声音。',
      coverLine: '这是一间把现实纸面变成乐器的音乐厅：先给 C 大调音阶和低音鼓绑定彩色色块，再用手指进入画面中的固定色块框进行演奏。',
      steps: ['申请摄像头权限', '选择音色绑定色块', '点击色块演奏音乐'],
      stamp: '彩纸合成器章',
      template: false,
      templateOrder: 0,
      pageRole: 'paper-synth-game',
      backendId: 'color-paper-synth',
      tone: 'gold',
      spec: {
        level: 'paper-synth-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true,
        requiresCameraPermission: true,
        requiresOfficialGestureRecognizer: true,
        requiresHandSkeleton: true,
        usesColorSampling: true,
        usesAudioSynthesis: true,
        noKeyboardCoreInput: true
      },
      play: {
        kicker: 'Paper Synth Game',
        intro: '用选色笔把纸面色块绑定为电子琴音和低音鼓，随后用食指进入固定色块框来演奏声音。',
        idleTitle: '等待摄像头',
        activeTitle: '纸面音乐厅演奏中',
        doneTitle: '演奏已盖章',
        idleHint: '先申请摄像头权限，再选择一个音色并点击纸面色块完成绑定。',
        activeHint: '选择音色绑定色块，食指进入半透明矩形框时会触发对应声音。',
        doneHint: '这次纸面演奏已经写入手账，可以继续演奏或重新绑定色块。',
        startLabel: '开启音乐厅',
        finishLabel: '手账盖章',
        resetLabel: '重置绑定'
      }
    },
  {
      id: 'dinosaur-run',
      name: '恐龙奔袭',
      shortName: '恐龙',
      navName: '恐龙',
      tag: '正式游戏',
      theme: '手势荒原跑道',
      route: '/play/dinosaur-run',
      detailRoute: '/games/dinosaur-run',
      pageFile: 'frontend/src/views/games/DinosaurRunGame.vue',
      summary: '把经典小恐龙奔跑游戏改造成手势输入：握拳跳跃、比 V 俯身，躲开仙人掌和飞鸟。',
      coverLine: '这是一条只靠手势奔跑的荒原跑道：握拳让恐龙开始、跳跃或重新开始，比 V 让恐龙俯身，别让它撞上障碍物。',
      steps: ['申请摄像头权限', '恐龙跳跃开始游戏', '手势控制恐龙动作', '别让恐龙撞到障碍物'],
      stamp: '恐龙奔袭章',
      template: false,
      templateOrder: 0,
      pageRole: 'gesture-dino-run-game',
      backendId: 'dinosaur-run',
      tone: 'mint',
      spec: {
        level: 'gesture-dino-run-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true,
        requiresCameraPermission: true,
        requiresOfficialGestureRecognizer: true,
        requiresHandSkeleton: true,
        usesGestureAsGameControls: true,
        noKeyboardCoreInput: true
      },
      play: {
        kicker: 'Gesture Dino Runner',
        intro: '经典小恐龙奔跑玩法，输入改为手势：握拳开始、跳跃或重新开始，比 V 让恐龙俯身躲避飞鸟。',
        idleTitle: '等待摄像头',
        activeTitle: '恐龙奔袭中',
        doneTitle: '奔袭结束',
        idleHint: '先申请摄像头权限，再握拳开始奔跑。',
        activeHint: '握拳跳跃，比 V 俯身，躲开荒原上的障碍物。',
        doneHint: '撞到障碍物后会自动写入手账，握拳可以重新开始。',
        startLabel: '申请摄像头',
        finishLabel: '手账记录',
        resetLabel: '重新开始'
      }
    },
  {
      id: 'bell-template',
      name: '乐园敲敲钟',
      shortName: '敲敲钟',
      navName: '铃铛',
      tag: '特别小游戏',
      theme: '铃铛挑战摊',
      route: '/play/bell-template',
      detailRoute: '/games/bell-template',
      summary: '一个轻量铃铛小游戏，点击小铃铛完成挑战，并把结果写入手账。',
      coverLine: '这是保留在乐园里的特别小游戏：流程简单、反馈清楚，适合快速体验完整游玩闭环。',
      steps: ['进入铃铛小屋', '点击开始', '敲响小铃铛', '留下乐园铃铛章'],
      stamp: '铃铛挑战章',
      template: true,
      templateOrder: 1,
      pageRole: 'special-mini-game',
      backendId: 'bell-template',
      tone: 'mint',
      spec: {
        level: 'special-mini-game',
        requiresOwnEntry: true,
        requiresRuleBoard: true,
        requiresPlayStage: true,
        requiresRecord: true,
        requiresBackendStats: true
      },
      play: {
        kicker: 'Special Mini Game',
        intro: '轻量铃铛挑战：点击开始后敲响小铃铛，完成一次简短互动并写入手账。',
        idleTitle: '等你开始',
        activeTitle: '小铃铛亮了',
        doneTitle: '铃铛已敲响',
        idleHint: '按下开始，准备敲响小铃铛。',
        activeHint: '点击小铃铛完成挑战。',
        doneHint: '这次铃铛挑战已经写入手账。',
        startLabel: '开始敲钟',
        finishLabel: '敲一下',
        resetLabel: '重来'
      }
    },

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
  return games.find((game) => game.id === id) || activeGame || null
}

export function visibleGames() {
  return games
}

export function gameShortName(id) {
  const game = findGame(id)
  return game?.shortName || game?.navName || game?.name || 'GF'
}

export default games

