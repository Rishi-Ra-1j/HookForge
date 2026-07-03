import { Job } from '@hookforge/queue'
import { prisma } from '@hookforge/db'
import { ExplanationJobData } from '@hookforge/queue'

export async function processExplanationJob(job: Job<ExplanationJobData>) {
  const { requestId } = job.data

  try {
    // Step 1 — fetch the request body from DB
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { endpoint: true }
    })

    if (!request) throw new Error(`Request ${requestId} not found`)

    // Step 2 — call Gemini API
    const explanation = await callGemini(request.rawBody || JSON.stringify(request.body))

    // Step 3 — save explanation to DB
    await prisma.explanation.update({
      where: { requestId },
      data: {
        content: explanation,
        status: 'completed',
      }
    })

    // Step 4 — notify API to push SSE event
    await fetch(`http://localhost:${process.env.API_PORT || 3001}/internal/explanation-ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        userId: request.endpoint.userId,
        content: explanation
      })
    })

  } catch (err) {
    await prisma.explanation.update({
      where: { requestId },
      data: { status: 'failed' }
    })
    throw err
  }
}

async function callGemini(webhookBody: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const prompt = `You are a webhook payload analyzer. Explain this webhook payload in plain English.
Tell the developer:
1. What event happened
2. Which service likely sent it
3. What their code should do in response

Webhook payload:
${webhookBody}

Keep the explanation concise and practical.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} — ${error}`)
  }

  const data = await response.json() as any
  return data.candidates[0].content.parts[0].text
}