import 'dotenv/config'
import { Worker } from '@hookforge/queue'
import { processExplanationJob } from './processor'

console.log('Worker starting...')

const worker = new Worker(
  'explanations',
  processExplanationJob,
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }
  }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

console.log('Worker listening for jobs...')