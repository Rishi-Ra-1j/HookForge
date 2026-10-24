import { Router, Request, Response } from 'express'
import { prisma } from '@hookforge/db'
import { sseManager } from '../lib/sseManager'
import { explanationQueue, jobOptions } from '@hookforge/queue'

const router = Router()

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
      // exact bytes as received (needed for signature verification); fall back to re-serialised body
      rawBody: (req as any).rawBody ?? (req.body ? JSON.stringify(req.body) : null),
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

  try {
    await explanationQueue.add('explain', {
      requestId: captured.id,
      userId: endpoint.userId,
      body: captured.rawBody || '',
    }, jobOptions)
  } catch (err) {
    console.error('Failed to enqueue explanation job:', err)
    await prisma.explanation.update({
      where: { requestId: captured.id },
      data: { status: 'failed' },
    }).catch(() => {})
  }
})

export default router