import { Router, Request, Response } from 'express'
import { prisma } from '@hookforge/db'
import { sseManager } from '../lib/sseManager'
import { explanationQueue,jobOptions} from '@hookforge/queue'
const router = Router()

// POST /hooks/:slug
router.post('/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params as {slug : string}

  // Step 1 — find endpoint by slug
  const endpoint = await prisma.endpoint.findUnique({
    where: { slug }
  })

  if (!endpoint) {
    res.status(404).json({ error: 'Endpoint not found' })
    return
  }

  // Step 2 — save the request
  const captured = await prisma.request.create({
    data: {
      endpointId: endpoint.id,
      method: req.method,
      headers: req.headers as object,
      body: req.body || null,
      rawBody: req.body ? JSON.stringify(req.body) : null,
      sourceIp: req.ip || 'unknown',
    }
  })

  // Step 3 — create pending explanation
  await prisma.explanation.create({
    data: {
      requestId: captured.id,
      status: 'pending',
    }
  })

  // Step 4 — return 200 immediately
  res.status(200).json({ received: true })

  // Step 5 — push SSE event to dashboard
  sseManager.send(endpoint.userId, {
    type: 'new_request',
    payload: {
      id: captured.id,
      method: captured.method,
      receivedAt: captured.receivedAt,
      sourceIp: captured.sourceIp,
    }
  })

  // Step 5 - Enqueue AI job
  await explanationQueue.add('explain',{
    requestId : captured.id,
    userId : endpoint.userId,
    body : captured.rawBody || '',
  },jobOptions)
})

export default router