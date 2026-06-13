export function createBubbleTemplateState() {
  return {
    phase: 'idle',
    bubbles: 0,
    score: 0,
    feedback: '按下开始模板二，点亮一颗泡泡。'
  }
}

export function startBubbleTemplate(state) {
  return {
    ...state,
    phase: 'active',
    bubbles: 0,
    score: 0,
    feedback: '泡泡站已经开启，点击泡泡完成模板链路。'
  }
}

export function popBubbleTemplate(state) {
  if (state.phase !== 'active') {
    return {
      ...state,
      feedback: '请先开始模板二。'
    }
  }

  return {
    phase: 'done',
    bubbles: state.bubbles + 1,
    score: 100,
    feedback: '模板二完成：同一套规范可以替换成不同视觉和反馈。'
  }
}

export function resetBubbleTemplate() {
  return createBubbleTemplateState()
}
