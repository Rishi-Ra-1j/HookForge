import { Queue, Worker, Job } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

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