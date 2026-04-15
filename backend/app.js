import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import morgan from 'morgan'
import userRoutes from './routes/user.routes.js'
import projectRoutes from './routes/project.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { corsOptions } from './utils/cors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist')
const frontendIndexPath = path.join(frontendDistPath, 'index.html')
const hasFrontendBuild = fs.existsSync(frontendIndexPath)

const sendFrontendIndex = (res) => {
  res.set('Cache-Control', 'no-store')
  res.sendFile(frontendIndexPath)
}

const app = express()

app.disable('x-powered-by')
app.use(cors(corsOptions))
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/users', userRoutes)
app.use('/projects', projectRoutes)

app.get('/', (req, res) => {
  if (hasFrontendBuild) {
    sendFrontendIndex(res)
    return
  }

  res.json({
    name: 'Torqussions API',
    status: 'ready',
  })
})

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

if (hasFrontendBuild) {
  app.use(
    express.static(frontendDistPath, {
      setHeaders: (res, filePath) => {
        if (filePath === frontendIndexPath) {
          res.setHeader('Cache-Control', 'no-store')
          return
        }

        res.setHeader('Cache-Control', 'no-cache')
      },
    }),
  )

  app.use((req, res, next) => {
    const isApiRequest =
      req.path.startsWith('/users') ||
      req.path.startsWith('/projects') ||
      req.path === '/health'

    if (req.path.startsWith('/assets/')) {
      res.status(404).json({
        error: `Asset ${req.path} was not found`,
      })
      return
    }

    if (req.method !== 'GET' || isApiRequest) {
      next()
      return
    }

    sendFrontendIndex(res)
  })
}

app.use((req, res) => {
  if (hasFrontendBuild && req.method === 'GET') {
    sendFrontendIndex(res)
    return
  }

  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} was not found`,
  })
})

export default app
