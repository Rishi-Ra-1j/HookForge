import 'dotenv/config'
import { Worker, connection } from '@hookforge/queue'
import { processExplanationJob } from './processor'

console.log('Worker starting...')

const worker = new Worker(
  'explanations',
  processExplanationJob,
  { connection }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

console.log('Worker listening for jobs...')