export function createBellTemplateState() {
  return {
    phase: 'idle',
    taps: 0,
    score: 0,
    feedback: '按下开始模板一，点亮小铃铛。'
  }
}

export function startBellTemplate(state) {
  return {
    ...state,
    phase: 'active',
    taps: 0,
    score: 0,
    feedback: '小铃铛已经亮起，点击一次完成模板链路。'
  }
}

export function hitBellTemplate(state) {
  if (state.phase !== 'active') {
    return {
      ...state,
      feedback: '请先开始模板一。'
    }
  }

  return {
    phase: 'done',
    taps: state.taps + 1,
    score: 100,
    feedback: '模板一完成：入口、游玩场、手账、后端记录链路都已走通。'
  }
}

export function resetBellTemplate() {
  return createBellTemplateState()
}
