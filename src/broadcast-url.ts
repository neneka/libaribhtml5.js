export const DEFAULT_BROADCAST_BASE_PATH = '/data-broadcast/'

/** Compare authorities without merging opaque URL origins into the string null. */
export function sameUrlOrigin(left: string | URL, right: string | URL): boolean {
  const a = new URL(left)
  const b = new URL(right)
  return a.hostname !== '' && a.protocol === b.protocol &&
    a.hostname === b.hostname && a.port === b.port
}


export function normalizeBroadcastBaseUrl(
  value: string | URL | undefined,
  documentUrl: string | URL,
  broadcastSchemes: readonly string[] = [],
): URL {
  const base = new URL(value ?? DEFAULT_BROADCAST_BASE_PATH, documentUrl)
  const scheme = base.protocol.slice(0, -1)
  const customTransport = broadcastSchemes.includes(scheme) &&
    /^[a-z][a-z0-9+.-]*$/.test(scheme) &&
    !['about', 'blob', 'data', 'file', 'ftp', 'javascript', 'ws', 'wss'].includes(scheme) &&
    base.hostname !== '' && base.username === '' && base.password === ''
  if (!/^https?:$/.test(base.protocol) && !customTransport) {
    throw new TypeError(`Broadcast base URL must use HTTP(S): ${base.href}`)
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/'
  base.search = ''
  base.hash = ''
  return base
}

/**
 * Derive the current carousel mount from a served document URL.
 * `/data-broadcast/<mount>/...` maps broadcast-root paths below `<mount>`.
 */
export function deriveBroadcastRootUrl(
  documentUrl: string | URL,
  base: URL,
): URL {
  const document = new URL(documentUrl, base)
  if (!sameUrlOrigin(document, base) || !document.pathname.startsWith(base.pathname)) {
    return new URL(base.href)
  }
  const relativePath = document.pathname.slice(base.pathname.length).replace(/^\/+/, '')
  const separator = relativePath.indexOf('/')
  if (separator <= 0) return new URL(base.href)
  const root = new URL(base.href)
  root.pathname = `${base.pathname}${relativePath.slice(0, separator)}/`
  root.search = ''
  root.hash = ''
  return root
}

/** Map a receiver-visible broadcast path into its isolated broadcast namespace. */
export function resolveBroadcastUrl(
  value: string | URL,
  base: URL,
  broadcastRoot: URL = base,
): URL {
  const resolved = new URL(value, base)
  if (!sameUrlOrigin(resolved, base)) return resolved
  if (!resolved.pathname.startsWith(base.pathname)) {
    const requestedPath = resolved.pathname.replace(/^\/+/, '')
    const mountPath = broadcastRoot.pathname.startsWith(base.pathname)
      ? broadcastRoot.pathname.slice(base.pathname.length).replace(/^\/+|\/+$/g, '')
      : ''
    const alreadyMounted = mountPath && (
      requestedPath === mountPath || requestedPath.startsWith(`${mountPath}/`)
    )
    resolved.pathname = `${alreadyMounted ? base.pathname : broadcastRoot.pathname}${requestedPath}`
  }
  return resolved
}
