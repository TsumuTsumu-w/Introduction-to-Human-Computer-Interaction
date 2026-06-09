import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import { games, findGame } from './data/games.js'

function readEnv() {
  return {
    port: Number(process.env.PORT || 3000),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: Number(process.env.DB_PORT || 3306),
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD || 'password',
    dbName: process.env.DB_NAME || 'gestureflow_hci',
    defaultAdmin: process.env.DEFAULT_ADMIN || 'admin',
    defaultPassword: process.env.DEFAULT_PASSWORD || 'admin123456'
  }
}

const config = readEnv()
const memoryRecords = []
let pool = null
let dbReady = false
let dbMessage = '数据库尚未初始化'

async function connectServer() {
  return mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    multipleStatements: true
  })
}

async function prepareDatabase() {
  const connection = await connectServer()
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.end()

  pool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    waitForConnections: true,
    connectionLimit: 8
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL UNIQUE,
      password VARCHAR(128) NOT NULL,
      display_name VARCHAR(128) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query('DELETE FROM users WHERE username = ?', [config.defaultAdmin])
  await pool.query(
    'INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)',
    [config.defaultAdmin, config.defaultPassword, '本地游客']
  )

  dbReady = true
  dbMessage = `数据库已准备好：${config.dbName}`
}

function gameStats(gameId) {
  const game = findGame(gameId)
  const related = memoryRecords.filter((record) => record.gameId === gameId || record.game === game?.name)
  const scored = related.filter((record) => typeof record.score === 'number')
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, record) => sum + record.score, 0) / scored.length)
    : null

  return {
    gameId,
    totalRounds: related.length,
    averageScore,
    bestScore: scored.length ? Math.max(...scored.map((record) => record.score)) : null,
    latestRecord: related[0] || null
  }
}

function normalizeRecord(body) {
  const gameId = String(body?.gameId || '')
  const game = findGame(gameId)

  return {
    id: String(body?.id || Date.now()),
    gameId: game?.id || gameId || 'reaction-wave',
    game: String(body?.game || game?.name || '小游戏'),
    action: String(body?.action || '完成一局'),
    score: typeof body?.score === 'number' ? body.score : null,
    rounds: typeof body?.rounds === 'number' ? body.rounds : null,
    durationMs: typeof body?.durationMs === 'number' ? body.durationMs : null,
    result: String(body?.result || 'complete'),
    createdAt: String(body?.createdAt || new Date().toLocaleString())
  }
}

function createApp() {
  const app = express()
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ ready: true, service: 'GestureFlow Park backend' })
  })

  app.get('/api/runtime', (_req, res) => {
    res.json({
      ready: dbReady,
      message: dbMessage,
      games: games.length
    })
  })

  app.get('/api/games', (_req, res) => {
    res.json({ items: games })
  })

  app.get('/api/games/:id/stats', (req, res) => {
    const game = findGame(req.params.id)
    if (!game) {
      return res.status(404).json({ message: '没有找到这个小游戏。' })
    }
    res.json({ game, stats: gameStats(game.id) })
  })

  app.get('/api/stats', (_req, res) => {
    res.json({
      games: games.map((game) => ({
        game,
        stats: gameStats(game.id)
      }))
    })
  })

  app.get('/api/records', (_req, res) => {
    res.json({ items: memoryRecords })
  })

  app.post('/api/records', (req, res) => {
    const record = normalizeRecord(req.body)
    memoryRecords.unshift(record)
    res.json({ record, stats: gameStats(record.gameId) })
  })

  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')

    if (!username || !password) {
      return res.status(400).json({ message: '请输入票号和通行口令。' })
    }

    if (!pool) {
      return res.status(503).json({ message: '数据库还没有准备好。' })
    }

    const [rows] = await pool.query(
      'SELECT id, username, display_name FROM users WHERE username = ? AND password = ? LIMIT 1',
      [username, password]
    )

    if (!rows.length) {
      return res.status(401).json({ message: '票号或口令不对，请重新确认。' })
    }

    res.json({
      user: {
        id: rows[0].id,
        username: rows[0].username,
        displayName: rows[0].display_name
      }
    })
  })

  app.use((error, _req, res, _next) => {
    console.error(error)
    res.status(500).json({ message: error.message || '服务暂时不可用。' })
  })

  return app
}

async function main() {
  try {
    await prepareDatabase()
    console.log(`GestureFlow Park database ready: ${config.dbName}`)
  } catch (error) {
    dbReady = false
    dbMessage = `数据库未连接：${error.message}`
    console.warn(dbMessage)
  }

  const app = createApp()
  app.listen(config.port, () => {
    console.log(`GestureFlow Park backend running at http://localhost:${config.port}`)
  })
}

main()
