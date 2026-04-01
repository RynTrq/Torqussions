import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendDirectory = path.join(rootDirectory, 'frontend')
const backendDirectory = path.join(rootDirectory, 'backend')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const children = []

const spawnProcess = (label, command, args, cwd) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      shutdown(signal)
      return
    }

    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`)
      shutdown()
      process.exitCode = code
    }
  })

  children.push(child)
  return child
}

const shutdown = (signal = 'SIGTERM') => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown('SIGTERM')
  process.exit(0)
})

spawnProcess('frontend', npmCommand, ['run', 'dev'], frontendDirectory)
spawnProcess('backend', npxCommand, ['nodemon', 'server.js'], backendDirectory)
