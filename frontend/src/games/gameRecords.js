import { api } from '../services/http'

const STORAGE_KEY = 'gestureflow-park-records'

export function readGameRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function writeGameRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)))
}

export async function saveGameRecord(game, extra = {}) {
  const record = {
    id: `${game.id}-${Date.now()}`,
    gameId: game.id,
    game: game.name,
    action: extra.action || game.stamp || '完成一局',
    score: typeof extra.score === 'number' ? extra.score : null,
    rounds: typeof extra.rounds === 'number' ? extra.rounds : null,
    durationMs: typeof extra.durationMs === 'number' ? extra.durationMs : null,
    result: extra.result || 'complete',
    createdAt: new Date().toLocaleString()
  }

  const records = readGameRecords()
  records.unshift(record)
  writeGameRecords(records)

  try {
    await api.saveRecord(record)
  } catch {
    // 本地手账已经保存；后端临时不可用时不打断当前游戏流程。
  }

  return record
}
