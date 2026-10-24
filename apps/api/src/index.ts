import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import webhooksRouter from './routes/webhooks'
import sseRouter from './routes/sse'
import requestsRouter from './routes/requests'
import { sseManager } from './lib/sseManager'
import { rateLimit } from './lib/rateLimit'

const app = express()
const PORT = process.env.PORT || 3001

// Behind a hosting proxy (Render etc.) so req.ip is the real client
app.set('trust proxy', 1)

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

// Keep the exact bytes of the body so webhook signatures can be verified later
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8')
  }
}))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', rateLimit({ windowMs: 60_000, max: 30 }), authRouter)
app.use('/hooks', rateLimit({ windowMs: 60_000, max: 300 }), webhooksRouter)
app.use('/sse', sseRouter)
app.use('/requests', requestsRouter)

// Called by the worker only — protected by a shared secret
app.post('/internal/explanation-ready', (req, res) => {
  const secret = process.env.INTERNAL_SECRET
  if (!secret || req.get('x-internal-secret') !== secret) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const { requestId, userId, content } = req.body
  sseManager.send(userId, {
    type: 'explanation_ready',
    payload: { requestId, content }
  })
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})

export default app
