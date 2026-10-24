import { Response } from 'express'

// Store open connections — one per user
const connections = new Map<string, Response>()

export const sseManager = {
  // Register a new browser connection
  addConnection(userId: string, res: Response) {
    connections.set(userId, res)
  },

  // Remove connection when browser disconnects
  // (only if it's still the same connection — a newer tab may have replaced it)
  removeConnection(userId: string, res?: Response) {
    if (!res || connections.get(userId) === res) connections.delete(userId)
  },

  // Push an event to a specific user
  send(userId: string, event: { type: string; payload: object }) {
    const res = connections.get(userId)
    if (res) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
  }
}
