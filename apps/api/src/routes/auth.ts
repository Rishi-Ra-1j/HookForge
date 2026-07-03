import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { prisma} from '@hookforge/db'
import { generateAccessToken, generateRefreshToken } from '../lib/jwt'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { verifyRefreshToken } from '../lib/jwt'
const router = Router()

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body

  // Step 1 — validate input
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  // Step 2 — check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(400).json({ error: 'Email already in use' })
    return
  }

  // Step 3 — hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Step 4 — create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    }
  })

  // Step 5 — generate slug and create endpoint
  const slug = nanoid(8)
  await prisma.endpoint.create({
    data: {
      slug,
      userId: user.id,
    }
  })

  // Step 6 — generate tokens
  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  // Step 7 — return response
  res.status(201).json({
    accessToken,
    refreshToken,
    webhookUrl: `https://hookforge.com/hooks/${slug}`,
    user: {
      id: user.id,
      email: user.email,
    }
  })
})
// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  // Step 1 — validate input
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  // Step 2 — find user by email
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  // Step 3 — verify password
  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  // Step 4 — generate tokens
  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  // Step 5 — return tokens
  res.json({ accessToken, refreshToken })
})

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' })
    return
  }

  try {
    const payload = verifyRefreshToken(refreshToken)
    const accessToken = generateAccessToken(payload.userId)
    res.json({ accessToken })
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

// GET /me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { endpoint: true }
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({
    id: user.id,
    email: user.email,
    webhookUrl: `https://hookforge.com/hooks/${user.endpoint?.slug}`
  })
})

export default router