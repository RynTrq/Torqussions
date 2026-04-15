import '../env.js'
import mongoose from 'mongoose'
import Redis from 'ioredis'

const requiredKeys = ['MONGO_URI', 'JWT_SECRET']
const recommendedKeys = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'XAI_API_KEY']

const statusLines = []
let hasFailure = false

const addStatus = (level, message) => {
  statusLines.push(`${level.toUpperCase()}: ${message}`)
  if (level === 'error') {
    hasFailure = true
  }
}

for (const key of requiredKeys) {
  if (!process.env[key]?.trim()) {
    addStatus('error', `${key} is missing`)
  } else {
    addStatus('ok', `${key} is present`)
  }
}

for (const key of recommendedKeys) {
  if (!process.env[key]?.trim()) {
    addStatus('warn', `${key} is not set`)
  } else {
    addStatus('ok', `${key} is present`)
  }
}

if (process.env.CLIENT_URL?.trim()) {
  addStatus('ok', 'CLIENT_URL is present')
} else {
  addStatus('warn', 'CLIENT_URL is not set')
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length < 16) {
  addStatus('warn', 'JWT_SECRET is present but shorter than 16 characters')
}

const configuredOrigins = (
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  process.env.APP_URL ||
  ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (configuredOrigins.length) {
  for (const origin of configuredOrigins) {
    try {
      new URL(origin)
      addStatus('ok', `Allowed origin is valid: ${origin}`)
    } catch {
      addStatus('error', `Allowed origin is invalid: ${origin}`)
    }
  }
} else {
  addStatus('warn', 'No production frontend origin is configured')
}

if (process.env.MONGO_URI?.trim()) {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    addStatus('ok', 'MongoDB connection succeeded')
  } catch (error) {
    addStatus('error', `MongoDB connection failed: ${error.message}`)
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }
}

if (process.env.REDIS_HOST?.trim() && process.env.REDIS_PORT?.trim()) {
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 4000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  redis.on('error', () => {})

  try {
    await redis.connect()
    await redis.ping()
    addStatus('ok', 'Redis connection succeeded')
  } catch (error) {
    addStatus('warn', `Redis connection failed: ${error.message}`)
  } finally {
    redis.disconnect()
  }
} else {
  addStatus('warn', 'Redis connection skipped because REDIS_HOST/REDIS_PORT are not fully set')
}

for (const line of statusLines) {
  console.log(line)
}

if (hasFailure) {
  process.exitCode = 1
}
