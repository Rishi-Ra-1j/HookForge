import { Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { sseManager } from '../lib/sseManager'
import { Router } from 'express'

const router = Router()

// GET /sse
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.userId!

  // Step 1 — set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Step 2 — register this connection
  sseManager.addConnection(userId, res)

  // Step 3 — send initial ping so browser knows connection is alive
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  // Step 4 — clean up when browser disconnects
  req.on('close', () => {
    sseManager.removeConnection(userId)
  })
})

export default router