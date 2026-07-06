// Cloudflare Worker – proxy mellom GIF-maker-siden og GitHub API.
//
// Poenget: GitHub-nøkkelen ligger som en hemmelighet i Cloudflare (GH_TOKEN),
// aldri i nettleseren eller i den offentlige koden. Siden kaller denne Worker-en,
// og Worker-en snakker med GitHub på vegne av deg.
//
// Oppsett (se README): opprett Worker, lim inn denne koden, og legg til to
// variabler under Settings → Variables:
//   GH_TOKEN        (Secret)  – din fine-grained GitHub-nøkkel (Actions: R/W)
//   ALLOWED_ORIGIN  (Text)    – f.eks. https://georgferdinandnilsen.github.io
//
// Kun de fire endepunktene siden trenger er tillatt, og dispatch er låst til
// akkurat workflowen fetch-video.yml – så nøkkelen kan ikke misbrukes til annet.

const ALLOW = [
  { method: 'POST', re: /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/fetch-video\.yml\/dispatches$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/fetch-video\.yml\/runs$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/runs\/\d+\/artifacts$/ },
  { method: 'GET',  re: /^\/repos\/[^/]+\/[^/]+\/actions\/artifacts\/\d+\/zip$/ },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '*').replace(/\/+$/, '');
    const originOk = allowed === '*' || origin === allowed;
    const corsOrigin = allowed === '*' ? (origin || '*') : allowed;

    const cors = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!originOk) {
      return new Response('Forbidden origin', { status: 403, headers: cors });
    }
    if (!env.GH_TOKEN) {
      return new Response('GH_TOKEN mangler i Worker-en', { status: 500, headers: cors });
    }

    const path = url.pathname;
    const permitted = ALLOW.some(a => a.method === request.method && a.re.test(path));
    if (!permitted) {
      return new Response('Endpoint ikke tillatt', { status: 403, headers: cors });
    }

    const init = {
      method: request.method,
      headers: {
        'Authorization': 'Bearer ' + env.GH_TOKEN,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'gifmaker-worker',
      },
    };
    if (request.method === 'POST') {
      init.body = await request.text();
      init.headers['Content-Type'] = 'application/json';
    }

    const ghRes = await fetch('https://api.github.com' + path + url.search, init);

    // Send svaret videre med CORS-headere (JSON for API-kall, zip-binær for artefakt).
    const headers = new Headers(cors);
    const ct = ghRes.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);
    return new Response(ghRes.body, { status: ghRes.status, headers });
  },
};
