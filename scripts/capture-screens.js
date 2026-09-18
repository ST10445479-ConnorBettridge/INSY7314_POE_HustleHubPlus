// Captures web UI screenshots of the running HustleHub+ app via the Edge/Chrome
// DevTools Protocol and saves them into docs/screenshots/.
//
// Prerequisites:
//   1. Start backend + seed:  cd backend && npm start; npm run seed
//   2. Launch Edge with remote debugging AND --ignore-certificate-errors:
//        msedge --remote-debugging-port=9222 --user-data-dir=%TEMP%\edge-profile \
//               --ignore-certificate-errors --no-first-run --start-maximized about:blank
//   3. Run:  node scripts/capture-screens.js
//
// Output 1280x900 PNGs: web_01_home .. web_09_404 (see docs/screenshots/README.md).

const fs = require('fs');
const path = require('path');

const PORT = process.env.CDP_PORT || 9222;
const BASE = process.env.BASE_URL || 'https://localhost:3443';
const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const DEMO_PASS = 'DemoPass1!';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findPageWs() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const targets = await res.json();
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('edge://'));
  if (!page) throw new Error('No page target found on CDP port ' + PORT);
  return page.webSocketDebuggerUrl;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.onopen = () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const msgId = ++id;
          const timer = setTimeout(() => {
            pending.delete(msgId);
            rej(new Error('CDP timeout waiting for ' + method));
          }, 20000);
          pending.set(msgId, {
            res: (v) => { clearTimeout(timer); res(v); },
            rej: (e) => { clearTimeout(timer); rej(e); },
          });
          try {
            ws.send(JSON.stringify({ id: msgId, method, params }));
          } catch (e) {
            clearTimeout(timer);
            pending.delete(msgId);
            rej(e);
          }
        });
      },
      close: () => ws.close(),
    });
    ws.onerror = () => reject(new Error('ws error'));
    ws.onclose = () => {
      for (const { rej } of pending.values()) rej(new Error('ws closed'));
      pending.clear();
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
  });
}

let ws;
async function withConn(fn) {
  const run = async () => {
    ws = await connect(await findPageWs());
    await ws.send('Page.enable');
    await ws.send('Runtime.enable');
    await ws.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    return fn();
  };
  try {
    return await run();
  } catch (e) {
    console.log('retrying after: ' + e.message);
    await sleep(1000);
    try { ws && ws.close(); } catch (_) {}
    return run();
  }
}

async function capture(ws, file) {
  const { data } = await ws.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
  console.log('saved', file);
}

async function navigate(ws, url) {
  await ws.send('Page.navigate', { url });
  await sleep(1800);
}

async function evalJs(ws, expression) {
  const r = await ws.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails));
  return r.result && r.result.value;
}

async function login(ws, email) {
  return evalJs(ws, `(async () => {
    const res = await fetch('${BASE}/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '${email}', password: '${DEMO_PASS}' }),
    });
    const j = await res.json();
    if (!j.data || !j.data.token) return 'LOGIN_FAILED ' + JSON.stringify(j);
    localStorage.setItem('hustlehub_token', j.data.token);
    localStorage.setItem('hustlehub_user', JSON.stringify(j.data.user));
    return 'ok';
  })()`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await withConn(async () => {
    const gotoAndClear = async () => {
      await navigate(ws, BASE + '/');
      await evalJs(ws, '(() => { localStorage.clear(); location.reload(); return "ok"; })()');
      await sleep(1600);
    };

    const gigId = await evalJs(ws, `(async () => {
      const res = await fetch('${BASE}/api/gigs');
      const j = await res.json();
      const gigs = (j.data && j.data.gigs) || [];
      return gigs.length ? gigs[0].id : null;
    })()`);
    if (!gigId) throw new Error('Could not fetch a gig id — is the server seeded?');
    console.log('first gig id', gigId);

    await gotoAndClear();
    await capture(ws, 'web_01_home.png');

    await navigate(ws, BASE + '/login');
    await capture(ws, 'web_02_login.png');

    await navigate(ws, BASE + '/register');
    await capture(ws, 'web_03_register.png');

    await navigate(ws, BASE + '/gigs/' + gigId);
    await capture(ws, 'web_04_gig_detail.png');

    await navigate(ws, BASE + '/does-not-exist');
    await capture(ws, 'web_09_404.png');

    await navigate(ws, BASE + '/');
    const alex = await login(ws, 'alex@hustlehub.demo');
    if (alex !== 'ok') throw new Error('alex login: ' + alex);
    await navigate(ws, BASE + '/dashboard');
    await capture(ws, 'web_05_client_dashboard.png');

    await navigate(ws, BASE + '/');
    const zane = await login(ws, 'zane@hustlehub.demo');
    if (zane !== 'ok') throw new Error('zane login: ' + zane);
    await navigate(ws, BASE + '/dashboard/freelancer');
    await capture(ws, 'web_06_freelancer_dashboard.png');

    await navigate(ws, BASE + '/dashboard/new-gig');
    await capture(ws, 'web_07_gig_form.png');

    await navigate(ws, BASE + '/dashboard/income');
    await capture(ws, 'web_08_income.png');

    await navigate(ws, BASE + '/');
    await evalJs(ws, `(() => {
      const input = document.querySelector('.search-box input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'seo');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return 'ok';
    })()`);
    await sleep(1400);
    await capture(ws, 'web_10_search.png');

    ws.close();
    console.log('DONE');
  });
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });