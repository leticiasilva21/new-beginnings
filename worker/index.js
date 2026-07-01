const STAYS_BASE = "https://rbm.stays.com.br/external/v1"
const STAYS_AUTH = "Basic MzZmOGJkYTk6NTllNjI3YjM="

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url = new URL(request.url)
    const staysUrl = `${STAYS_BASE}${url.pathname}${url.search}`
    const isGet = request.method === "GET" || request.method === "HEAD"

    const upstream = await fetch(staysUrl, {
      method: request.method,
      headers: {
        "Authorization": STAYS_AUTH,
        ...(isGet ? {} : { "Content-Type": "application/json" }),
      },
      body: isGet ? undefined : await request.text(),
    })

    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS,
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    })
  },
}
