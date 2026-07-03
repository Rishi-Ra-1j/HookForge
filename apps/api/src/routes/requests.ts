import { Router, Response } from 'express'
import { prisma } from '@hookforge/db'
import { authenticate, AuthRequest } from '../middleware/authenticate'

const router = Router()

// All routes here require auth
router.use(authenticate)

// GET /requests — paginated list
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const skip = (page - 1) * limit

  // Find user's endpoint first
  const endpoint = await prisma.endpoint.findUnique({
    where: { userId: req.userId }
  })

  if (!endpoint) {
    res.status(404).json({ error: 'No endpoint found' })
    return
  }

  // Fetch requests with pagination
  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where: { endpointId: endpoint.id },
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        method: true,
        sourceIp: true,
        receivedAt: true,
        explanation: {
          select: {
            status: true
          }
        }
      }
    }),
    prisma.request.count({
      where: { endpointId: endpoint.id }
    })
  ])

  res.json({
    requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  })
})

// GET /requests/:id — full detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const endpoint = await prisma.endpoint.findUnique({
    where: { userId: req.userId }
  })

  if (!endpoint) {
    res.status(404).json({ error: 'No endpoint found' })
    return
  }

  const request = await prisma.request.findFirst({
    where: {
      id: req.params.id,
      endpointId: endpoint.id
    },
    include: {
      explanation: true
    }
  })

  if (!request) {
    res.status(404).json({ error: 'Request not found' })
    return
  }

  res.json(request)
})

// POST /requests/:id/replay
router.post('/:id/replay', async (req: AuthRequest, res: Response) => {
  const { targetUrl } = req.body

  if (!targetUrl) {
    res.status(400).json({ error: 'targetUrl is required' })
    return
  }

  // Step 1 — find user's endpoint
  const endpoint = await prisma.endpoint.findUnique({
    where: { userId: req.userId }
  })

  if (!endpoint) {
    res.status(404).json({ error: 'No endpoint found' })
    return
  }

  // Step 2 — fetch stored request (scoped to this user)
  const stored = await prisma.request.findFirst({
    where: {
      id: req.params.id,
      endpointId: endpoint.id
    }
  })

  if (!stored) {
    res.status(404).json({ error: 'Request not found' })
    return
  }

  // Step 3 — replay it
  const startTime = Date.now()

  try {
    const response = await fetch(targetUrl, {
      method: stored.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Replayed-By': 'HookForge',
      },
      body: stored.rawBody || undefined,
    })

    const latency = Date.now() - startTime
    const responseBody = await response.text()

    res.json({
      status: response.status,
      latency,
      body: responseBody,
    })

  } catch (err) {
    res.status(502).json({
      error: 'Could not reach target URL',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
})

export default router