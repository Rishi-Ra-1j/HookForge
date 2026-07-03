'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getRequest, replayRequest } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import Link from 'next/link'

export default function RequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [targetUrl, setTargetUrl] = useState('')
  const [replayResult, setReplayResult] = useState<any>(null)
  const [replaying, setReplaying] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login')
      return
    }

    async function loadRequest() {
      try {
        const data = await getRequest(id)
        setRequest(data)
      } catch (err) {
        console.error('Failed to load request:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRequest()
  }, [id, router])

  async function handleReplay() {
    if (!targetUrl) return
    setReplaying(true)
    try {
      const result = await replayRequest(id, targetUrl)
      setReplayResult(result)
    } catch (err) {
      console.error('Replay failed:', err)
    } finally {
      setReplaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Request not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="bg-blue-600 px-3 py-1 rounded font-mono">
          {request.method}
        </span>
        <span className="text-gray-400 text-sm">
          {new Date(request.receivedAt).toLocaleString()}
        </span>
        <span className="text-gray-500 text-sm">
          from {request.sourceIp}
        </span>
      </div>

      {/* AI Explanation */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">AI Explanation</h2>
        {request.explanation?.status === 'completed' ? (
          <p className="text-gray-300 whitespace-pre-wrap">
            {request.explanation.content}
          </p>
        ) : request.explanation?.status === 'failed' ? (
          <p className="text-red-400">AI explanation failed.</p>
        ) : (
          <p className="text-yellow-400">Generating explanation...</p>
        )}
      </div>

      {/* Headers */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Headers</h2>
        <pre className="text-sm text-gray-300 overflow-auto">
          {JSON.stringify(request.headers, null, 2)}
        </pre>
      </div>

      {/* Body */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Body</h2>
        <pre className="text-sm text-gray-300 overflow-auto">
          {JSON.stringify(request.body, null, 2)}
        </pre>
      </div>

      {/* Replay */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Replay</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="url"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 bg-gray-800 rounded px-3 py-2 text-white"
          />
          <button
            onClick={handleReplay}
            disabled={replaying || !targetUrl}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
          >
            {replaying ? 'Replaying...' : 'Replay'}
          </button>
        </div>

        {replayResult && (
          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-2">
              Status: <span className="text-white">{replayResult.status}</span>
              {' · '}
              Latency: <span className="text-white">{replayResult.latency}ms</span>
            </p>
            <pre className="text-sm text-gray-300 overflow-auto">
              {replayResult.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}