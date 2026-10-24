import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { prisma} from '@hookforge/db'
import { generateAccessToken, generateRefreshToken } from '../lib/jwt'
import { authenticate, AuthRequest } from '../middleware/authenticate'
import { verifyRefreshToken } from '../lib/jwt'
const router = Router()

const publicBase = () => (process.env.PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(400).json({ error: 'Email already in use' })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    }
  })

  const slug = nanoid(8)
  await prisma.endpoint.create({
    data: {
      slug,
      userId: user.id,
    }
  })

  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  res.status(201).json({
    accessToken,
    refreshToken,
    webhookUrl: `${publicBase()}/hooks/${slug}`,
    user: {
      id: user.id,
      email: user.email,
    }
  })
})
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  res.json({ accessToken, refreshToken })
})

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
    webhookUrl: `${publicBase()}/hooks/${user.endpoint?.slug}`
  })
})

export default router