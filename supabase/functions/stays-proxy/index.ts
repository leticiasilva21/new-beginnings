const STAYS_BASE = "https://rbm.stays.com.br/external/v1"
const STAYS_AUTH = "Basic MzZmOGJkYTk6NTllNjI3YjM="

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(req.url)
  // Supabase routes /functions/v1/stays-proxy/... → pathname is /stays-proxy/...
  const staysPath = url.pathname.replace(/^\/stays-proxy/, "") || "/"
  const staysUrl = `${STAYS_BASE}${staysPath}${url.search}`

  const isGet = req.method === "GET" || req.method === "HEAD"

  const forwardHeaders: Record<string, string> = {
    "Authorization": STAYS_AUTH,
  }
  if (!isGet) {
    forwardHeaders["Content-Type"] = "application/json"
  }

  const body = isGet ? undefined : await req.text()

  const upstream = await fetch(staysUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: body || undefined,
  })

  const responseBody = await upstream.text()

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      ...CORS,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  })
})
