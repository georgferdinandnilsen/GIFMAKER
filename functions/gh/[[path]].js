const ALLOW = [
  { method: 'POST', re: /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/fetch-video\.yml\/dispatches$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/fetch-video\.yml\/runs$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/runs\/\d+\/artifacts$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/artifacts\/\d+\/zip$/ },
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').replace(/\/+$/, '');
  const selfOrigin = url.origin;
  const okOrigin = !origin || origin === selfOrigin || (allowed && origin === allowed);

  const cors = {};
  if (origin) {
    cors['Access-Control-Allow-Origin'] = origin;
    cors['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    cors['Access-Control-Allow-Headers'] = 'Content-Type';
    cors['Access-Control-Max-Age'] = '86400';
    cors['Vary'] = 'Origin';
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!okOrigin) return new Response('Forbidden origin', { status: 403, headers: cors });
  if (!env.GH_TOKEN) return new Response('GH_TOKEN mangler', { status: 500, headers: cors });

  const path = url.pathname.replace(/^\/gh/, '');
  const permitted = ALLOW.some(a => a.method === request.method && a.re.test(path));
  if (!permitted) return new Response('Endpoint ikke tillatt', { status: 403, headers: cors });

  const init = {
    method: request.method,
    headers: {
      'Authorization': 'Bearer ' + env.GH_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gifmaker-pages-fn',
    },
  };
  if (request.method === 'POST') {
    init.body = await request.text();
    init.headers['Content-Type'] = 'application/json';
  }

  const ghRes = await fetch('https://api.github.com' + path + url.search, init);
  const headers = new Headers(cors);
  const ct = ghRes.headers.get('Content-Type');
  if (ct) headers.set('Content-Type', ct);
  return new Response(ghRes.body, { status: ghRes.status, headers });
}
