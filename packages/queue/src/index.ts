import 'dotenv/config'
import { Queue, Worker, Job } from 'bullmq'

// Supports a single REDIS_URL (hosted Redis) or REDIS_HOST/REDIS_PORT (local compose)
function buildConnection() {
  const url = process.env.REDIS_URL
  if (url) {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
}

export const connection = buildConnection()

// The queue — API adds jobs here
export const explanationQueue = new Queue('explanations', { connection })

export const jobOptions={
    attempts : 3,
    backoff:{
        type: 'exponential' as const,
        delay: 2000,
    }
}

// Job data type
export interface ExplanationJobData {
  requestId: string
  userId: string
  body: string
}

export { Worker, Job }