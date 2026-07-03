import { Response, Request } from 'express'
import { sseManager } from '../lib/sseManager'
import { Router } from 'express'
import { verifyAccessToken } from '../lib/jwt'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const token = req.query.token as string

  if (!token) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  try {
    const payload = verifyAccessToken(token)
    const userId = payload.userId

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    sseManager.addConnection(userId, res)

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    req.on('close', () => {
      sseManager.removeConnection(userId)
    })

  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router