addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const GITHUB_TOKEN = 'your_token_here' // 在 Cloudflare 环境变量中设置
  
  // 添加 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // 处理请求
  const url = new URL(request.url)
  const githubUrl = `https://api.github.com${url.pathname}${url.search}`
  
  const response = await fetch(githubUrl, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  })

  const newResponse = new Response(response.body, response)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })

  return newResponse
} 