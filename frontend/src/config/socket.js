import { io } from 'socket.io-client'

let socketInstance = null

const normalizeSocketUrl = (value = '') => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return undefined
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    const isLoopbackOrigin = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)

    if (import.meta.env.PROD && isLoopbackOrigin) {
      return undefined
    }

    return parsedUrl.origin
  } catch {
    return undefined
  }
}

const getSocketUrl = () =>
  normalizeSocketUrl(import.meta.env.VITE_SOCKET_URL || '') ||
  normalizeSocketUrl(import.meta.env.VITE_API_URL || '') ||
  undefined

export const initializeSocket = (projectId) => {
  if (socketInstance) {
    socketInstance.disconnect()
  }

  socketInstance = io(getSocketUrl(), {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: {
      token: localStorage.getItem('token'),
      projectId,
    },
  })

  return socketInstance
}

export const getSocket = () => socketInstance

export const subscribeToEvent = (eventName, callback) => {
  if (!socketInstance) {
    return () => {}
  }

  socketInstance.on(eventName, callback)

  return () => {
    socketInstance?.off(eventName, callback)
  }
}

export const emitWithAck = (eventName, payload) =>
  new Promise((resolve, reject) => {
    if (!socketInstance) {
      reject(new Error('Socket connection is not ready'))
      return
    }

    socketInstance.emit(eventName, payload, (response) => {
      if (response?.ok === false) {
        reject(new Error(response.error || 'Socket request failed'))
        return
      }

      resolve(response)
    })
  })

export const disconnectSocket = () => {
  if (!socketInstance) {
    return
  }

  socketInstance.removeAllListeners()
  socketInstance.disconnect()
  socketInstance = null
}
