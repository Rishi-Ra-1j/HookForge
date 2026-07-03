'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, getRequests } from '@/lib/api'
import { getAccessToken, clearTokens } from '@/lib/auth'
import Link from 'next/link'

interface Request {
  id: string
  method: string
  sourceIp: string
  receivedAt: string
  explanation: { status: string }
}

export default function DashboardPage() {
  const router = useRouter()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Check if logged in
    if (!getAccessToken()) {
      router.push('/login')
      return
    }

    // Load initial data
    async function loadData() {
      try {
        const [me, requestsData] = await Promise.all([
          getMe(),
          getRequests()
        ])
        setWebhookUrl(me.webhookUrl)
        setRequests(requestsData.requests)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Open SSE connection
    const token = getAccessToken()
    const es = new EventSource(
      `http://localhost:3001/sse?token=${token}`
    )

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'new_request') {
        setRequests(prev => [
          {
            id: data.payload.id,
            method: data.payload.method,
            sourceIp: data.payload.sourceIp,
            receivedAt: data.payload.receivedAt,
            explanation: { status: 'pending' }
          },
          ...prev
        ])
      }

      if (data.type === 'explanation_ready') {
        setRequests(prev => prev.map(r =>
          r.id === data.payload.requestId
            ? { ...r, explanation: { status: 'completed' } }
            : r
        ))
      }
    }

    sseRef.current = es

    // Cleanup when component unmounts
    return () => {
      es.close()
    }
  }, [router])

  function handleLogout() {
    clearTokens()
    if (sseRef.current) sseRef.current.close()
    router.push('/login')
  }

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    alert('Copied!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">HookForge</h1>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white text-sm"
        >
          Logout
        </button>
      </div>

      {/* Webhook URL */}
      <div className="bg-gray-900 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-400 mb-2">Your webhook URL</p>
        <div className="flex items-center gap-3">
          <code className="text-blue-400 flex-1 break-all">{webhookUrl}</code>
          <button
            onClick={copyUrl}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Request List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Captured Requests ({requests.length})
        </h2>

        {requests.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
            <p>No requests yet.</p>
            <p className="text-sm mt-2">
              Send a POST request to your webhook URL to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(request => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className="block bg-gray-900 hover:bg-gray-800 rounded-lg p-4 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-xs px-2 py-1 rounded font-mono">
                      {request.method}
                    </span>
                    <span className="text-gray-300 text-sm">
                      {new Date(request.receivedAt).toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {request.sourceIp}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    request.explanation.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : request.explanation.status === 'failed'
                      ? 'bg-red-900 text-red-300'
                      : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {request.explanation.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}