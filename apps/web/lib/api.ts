const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Get token from localStorage
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

// Base fetch function with auth header
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  return response
}

// Auth
export async function login(email: string, password: string) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function register(email: string, password: string) {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function getMe() {
  const res = await apiFetch('/auth/me')
  return res.json()
}

// Requests
export async function getRequests(page = 1) {
  const res = await apiFetch(`/requests?page=${page}`)
  return res.json()
}

export async function getRequest(id: string) {
  const res = await apiFetch(`/requests/${id}`)
  return res.json()
}

export async function replayRequest(id: string, targetUrl: string) {
  const res = await apiFetch(`/requests/${id}/replay`, {
    method: 'POST',
    body: JSON.stringify({ targetUrl }),
  })
  return res.json()
}