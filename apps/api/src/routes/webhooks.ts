import { Router, Request, Response } from 'express'
import { prisma } from '@hookforge/db'
import { sseManager } from '../lib/sseManager'
import { Queue } from 'bullmq'

const router = Router()

// Create queue with explicit connection from environment
const explanationQueue = new Queue('explanations', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
})

const jobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  }
}

// POST /hooks/:slug
router.post('/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string }

  const endpoint = await prisma.endpoint.findUnique({
    where: { slug }
  })

  if (!endpoint) {
    res.status(404).json({ error: 'Endpoint not found' })
    return
  }

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

  await prisma.explanation.create({
    data: {
      requestId: captured.id,
      status: 'pending',
    }
  })

  res.status(200).json({ received: true })

  sseManager.send(endpoint.userId, {
    type: 'new_request',
    payload: {
      id: captured.id,
      method: captured.method,
      receivedAt: captured.receivedAt,
      sourceIp: captured.sourceIp,
    }
  })

  await explanationQueue.add('explain', {
    requestId: captured.id,
    userId: endpoint.userId,
    body: captured.rawBody || '',
  }, jobOptions)
})

export default router