import { lookup } from 'node:dns/promises'
import net from 'node:net'

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip)
  const v6 = ip.toLowerCase()
  if (v6 === '::1' || v6 === '::') return true
  if (v6.startsWith('::ffff:')) {
    const v4 = v6.slice(7)
    return net.isIPv4(v4) ? isPrivateV4(v4) : true
  }
  return /^(fc|fd|fe[89ab])/.test(v6)
}

// Validates a user-supplied replay target. Set allowPrivate=true only for local dev.
export async function assertSafeTarget(raw: unknown, allowPrivate = false): Promise<URL> {
  if (typeof raw !== 'string') throw new Error('targetUrl must be a string')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  if (allowPrivate) return url

  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (addrs.length === 0 || addrs.some(a => isPrivateIp(a.address))) {
    throw new Error('Target must be a public address')
  }
  return url
}
