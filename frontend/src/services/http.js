const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.message || `请求失败：${response.status}`)
  }

  return data
}

export const api = {
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  runtime() {
    return request('/runtime')
  },
  games() {
    return request('/games')
  },
  records() {
    return request('/records')
  },
  saveRecord(payload) {
    return request('/records', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}
