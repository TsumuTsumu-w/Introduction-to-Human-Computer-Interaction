const EMOTION_POOL = [
  {
    id: 'smile',
    label: '微笑',
    hint: '嘴角抬起来，稳一点。',
    icon: '☺',
    code: 'S'
  },
  {
    id: 'blow',
    label: '吹气',
    hint: '像轻轻吹一张纸条。',
    icon: '〰',
    code: 'B'
  }
]

function pickLock(seed, index) {
  const offset = Math.abs(Math.floor(seed / 1000)) % EMOTION_POOL.length
  return EMOTION_POOL[(offset + index) % EMOTION_POOL.length]
}

export function buildEmotionCipherLocks(seed = Date.now()) {
  const first = pickLock(seed, 0)
  const second = pickLock(seed, 1)
  const third = pickLock(seed, 2)

  return [first, second, third].map((lock, index) => ({
    ...lock,
    index: index + 1
  }))
}

export function createEmotionCipherState(seed = Date.now()) {
  const locks = buildEmotionCipherLocks(seed)

  return {
    phase: 'idle',
    locks,
    completedLocks: [],
    currentIndex: 0,
    expectedCode: locks.map((lock) => lock.code).join(''),
    codeHint: locks.map((lock) => lock.icon).join(' · '),
    score: 0,
    feedback: '先申请摄像头，或直接点击开启密门进入手动模式。',
    recognizedExpression: '',
    typedCode: '',
    roundStartedAt: 0,
    completedAt: 0,
    recorded: false
  }
}

export function startEmotionCipherState(state, seed = Date.now()) {
  return startEmotionCipherGame(state, seed)
}

export function startEmotionCipherGame(state, seed = Date.now()) {
  const locks = buildEmotionCipherLocks(seed)

  return {
    ...state,
    phase: 'active',
    locks,
    completedLocks: [],
    currentIndex: 0,
    expectedCode: locks.map((lock) => lock.code).join(''),
    codeHint: locks.map((lock) => lock.icon).join(' · '),
    score: 0,
    feedback: `三道表情锁已启动：${locks.map((lock) => lock.label).join(' / ')}。`,
    recognizedExpression: '',
    typedCode: '',
    roundStartedAt: seed,
    completedAt: 0,
    recorded: false
  }
}

export function applyEmotionCipherExpression(state, expression = {}, now = Date.now()) {
  const detected = expression.smile ? 'smile' : expression.blow ? 'blow' : ''
  const next = {
    ...state,
    recognizedExpression: detected || state.recognizedExpression
  }

  if (next.phase !== 'active') {
    return next
  }

  if (!detected) {
    return {
      ...next,
      feedback: '没有识别到清晰表情，再靠近一点镜头。'
    }
  }

  const currentLock = next.locks[next.currentIndex]
  if (!currentLock) {
    return next
  }

  if (detected !== currentLock.id) {
    return {
      ...next,
      feedback: `当前需要 ${currentLock.label}，不是 ${detected === 'smile' ? '微笑' : '吹气'}。`
    }
  }

  const completedLocks = [...next.completedLocks, currentLock]
  const completedCount = completedLocks.length

  if (completedCount >= next.locks.length) {
    return {
      ...next,
      phase: 'typing',
      completedLocks,
      currentIndex: next.locks.length,
      feedback: `三道表情锁都亮了。请输入合成口令，长度 ${next.expectedCode.length} 位。`
    }
  }

  const nextLock = next.locks[completedCount]
  return {
    ...next,
    completedLocks,
    currentIndex: completedCount,
    feedback: `第 ${completedCount} 道门已亮。下一道：${nextLock.label}。`
  }
}

export function submitEmotionCipherCode(state, value, now = Date.now()) {
  if (state.phase !== 'typing') {
    return {
      ...state,
      typedCode: String(value || ''),
      feedback: '先完成三道表情锁，再输入口令。'
    }
  }

  const typedCode = normalizeEmotionCipherCode(value)
  const expectedCode = normalizeEmotionCipherCode(state.expectedCode)

  if (!typedCode) {
    return {
      ...state,
      typedCode: String(value || ''),
      feedback: '请输入合成口令。'
    }
  }

  if (typedCode !== expectedCode) {
    return {
      ...state,
      typedCode: String(value || ''),
      feedback: '口令不对，再检查三道表情锁的顺序。'
    }
  }

  return {
    ...state,
    phase: 'done',
    typedCode: String(value || ''),
    score: 120 + state.completedLocks.length * 20,
    completedAt: now,
    feedback: `密门已开启：${state.expectedCode}`
  }
}

export function resetEmotionCipherState(cameraReady = false) {
  return {
    ...createEmotionCipherState(),
    feedback: cameraReady ? '已重置。可以重新开启密门。' : '先申请摄像头。'
  }
}

export function normalizeEmotionCipherCode(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .toUpperCase()
}
