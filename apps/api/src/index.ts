import 'dotenv/config'
import express from 'express'
import authRouter from './routes/auth'
import webhooksRouter from './routes/webhooks'
import sseRouter from './routes/sse'
import requestsRouter from './routes/requests'
import { sseManager } from './lib/sseManager'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)
app.use('/hooks',webhooksRouter)
app.use('/sse',sseRouter)
app.use('/requests',requestsRouter)
app.post('/internal/explanation-ready',express.json(),(req,res)=>{
  const {requestId, userId, content}=req.body
  sseManager.send(userId,{
    type: 'explanation_ready',
    payload : {requestId, content}
  })
  res.json({ok:true})
})
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
})


export default app