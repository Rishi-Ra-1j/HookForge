import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'

export interface AuthRequest extends Request {
  userId?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.userId
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}