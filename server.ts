import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FASTAPI_HOST = '127.0.0.1';
const FASTAPI_PORT = Number(process.env.BACKEND_PORT || 8088);
const isProduction = process.env.NODE_ENV === 'production';

let fastapiProc: ChildProcess | null = null;

function isFastApiUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      { host: FASTAPI_HOST, port: FASTAPI_PORT, path: '/api/health', timeout: 800 },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureFastApiBackend(): Promise<void> {
  if (await isFastApiUp()) {
    console.log(`FastAPI backend already listening on http://${FASTAPI_HOST}:${FASTAPI_PORT}`);
    return;
  }

  const venvUvicorn = path.resolve(__dirname, 'backend/.venv/bin/uvicorn');
  const pythonBin = path.resolve(__dirname, 'backend/.venv/bin/python');
  const cmd = fs.existsSync(venvUvicorn)
    ? venvUvicorn
    : fs.existsSync(pythonBin)
      ? pythonBin
      : 'python3';

  const args =
    cmd === venvUvicorn
      ? ['app.main:app', '--app-dir', 'backend', '--host', FASTAPI_HOST, '--port', String(FASTAPI_PORT)]
      : ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', FASTAPI_HOST, '--port', String(FASTAPI_PORT)];

  fastapiProc = spawn(cmd, args, {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      BACKEND_HOST: FASTAPI_HOST,
      BACKEND_PORT: String(FASTAPI_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  fastapiProc.stdout?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.log(`[FastAPI] ${text}`);
  });
  fastapiProc.stderr?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[FastAPI] ${text}`);
  });
  fastapiProc.on('exit', (code) => {
    console.warn(`[FastAPI] exited with code ${code}`);
    fastapiProc = null;
  });

  for (let i = 0; i < 40; i++) {
    if (await isFastApiUp()) {
      console.log(`FastAPI backend ready at http://${FASTAPI_HOST}:${FASTAPI_PORT}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn('FastAPI backend did not respond before startup timeout; requests will retry proxy.');
}

function proxyApiRequest(req: Request, res: Response) {
  const targetPath = req.originalUrl;
  const headers: http.OutgoingHttpHeaders = {
    ...req.headers,
    host: `${FASTAPI_HOST}:${FASTAPI_PORT}`,
    'x-forwarded-host': req.headers.host || '',
    'x-forwarded-proto': (req.headers['x-forwarded-proto'] as string) || 'https',
  };

  const proxyReq = http.request(
    {
      hostname: FASTAPI_HOST,
      port: FASTAPI_PORT,
      path: targetPath,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.status(proxyRes.statusCode || 502);
      for (const [key, val] of Object.entries(proxyRes.headers)) {
        if (val !== undefined) {
          res.setHeader(key, val);
        }
      }
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(503).json({
        detail: `FastAPI backend unavailable (${err.message}).`,
      });
    }
  });

  req.pipe(proxyReq);
}

const shutdown = () => {
  if (fastapiProc && !fastapiProc.killed) {
    fastapiProc.kill('SIGTERM');
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function startServer() {
  await ensureFastApiBackend();

  const app = express();

  // Stream all /api/* requests directly to Python FastAPI (preserves multipart uploads, cookies, and OAuth callbacks)
  app.use('/api', proxyApiRequest);

  app.get('/firebase-applet-config.json', (_req, res) => {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    res.sendFile(configPath, (err) => {
      if (err) {
        res.status(404).json({ configured: false });
      }
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LIVING MEMORY server running on http://0.0.0.0:${PORT} (proxying /api -> ${FASTAPI_HOST}:${FASTAPI_PORT})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
