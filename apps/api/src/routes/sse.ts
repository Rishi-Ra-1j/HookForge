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
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    sseManager.addConnection(userId, res)

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    // Comment line every 25s so proxies don't drop the idle connection
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000)

    req.on('close', () => {
      clearInterval(heartbeat)
      sseManager.removeConnection(userId, res)
    })

  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router