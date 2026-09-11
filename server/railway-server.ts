import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createProducerApp } from "../packages/producer/src/server.ts";

const app = new Hono();

// Global Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);

// Health check endpoint (Railway uses this for deployment healthchecks)
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "HyperFrames Cloud Renderer (Railway)",
    chrome: process.env.PRODUCER_HEADLESS_SHELL_PATH ? "ready" : "unconfigured",
  });
});

// Interactive Web Console & API Documentation on GET /
app.get("/", (c) => {
  const host = c.req.header("host") || "your-app.up.railway.app";
  const protocol = c.req.header("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HyperFrames — Cloud Video Renderer</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --border: #1e293b;
      --accent: #38bdf8;
      --accent-hover: #0ea5e9;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: #060911;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 32px 16px;
    }
    .container { max-width: 960px; margin: 0 auto; }
    header {
      margin-bottom: 36px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge::before {
      content: "";
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      display: inline-block;
    }
    h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    p.subtitle { color: var(--text-muted); font-size: 15px; margin-top: 4px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    h2 { font-size: 18px; margin-bottom: 16px; color: var(--accent); }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }
    textarea {
      width: 100%;
      height: 160px;
      background: var(--code-bg);
      border: 1px solid var(--border);
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      padding: 12px;
      border-radius: 8px;
      resize: vertical;
      margin-bottom: 16px;
    }
    .options { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .option-group { flex: 1; min-width: 140px; }
    select, input[type="number"] {
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }
    button {
      background: var(--accent);
      color: #0b0f19;
      font-weight: 700;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
      transition: background 0.2s;
    }
    button:hover { background: var(--accent-hover); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #resultBox { display: none; margin-top: 20px; }
    video { width: 100%; max-height: 420px; border-radius: 8px; background: #000; margin-top: 12px; }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .api-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .endpoint-item {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }
    .endpoint-method {
      display: inline-block;
      font-weight: 700;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 6px;
    }
    .method-get { background: #0284c7; color: #fff; }
    .method-post { background: #16a34a; color: #fff; }
    .endpoint-path { font-family: monospace; font-weight: 600; font-size: 14px; }
    .endpoint-desc { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>HyperFrames Render Server</h1>
        <p class="subtitle">Cloud HTML-to-Video Rendering Engine deployed on Railway</p>
      </div>
      <div class="badge">Railway Online</div>
    </header>

    <div class="card">
      <h2>🎬 Test Live Render</h2>
      <p style="font-size:14px; color:var(--text-muted); margin-bottom:14px;">
        Submit HTML to test deterministic video rendering directly from this deployed Railway service:
      </p>

      <label for="htmlInput">Composition HTML</label>
      <textarea id="htmlInput">&lt;div id="stage" data-composition-id="demo" data-start="0" data-duration="4" data-width="1280" data-height="720" style="background:#0f172a;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;"&gt;
  &lt;h1 style="color:#38bdf8;font-family:sans-serif;font-size:56px;margin-bottom:16px;"&gt;HyperFrames&lt;/h1&gt;
  &lt;p style="color:#94a3b8;font-family:sans-serif;font-size:24px;"&gt;Rendered with Railway &amp; Chrome BeginFrame&lt;/p&gt;
&lt;/div&gt;</textarea>

      <div class="options">
        <div class="option-group">
          <label>FPS</label>
          <input type="number" id="fpsInput" value="30" min="1" max="60">
        </div>
        <div class="option-group">
          <label>Quality</label>
          <select id="qualityInput">
            <option value="draft">draft (fast)</option>
            <option value="standard" selected>standard</option>
            <option value="high">high</option>
          </select>
        </div>
        <div class="option-group">
          <label>Format</label>
          <select id="formatInput">
            <option value="mp4" selected>mp4</option>
            <option value="webm">webm</option>
          </select>
        </div>
      </div>

      <button id="renderBtn" onclick="triggerRender()">Render Video</button>
      <div id="renderStatus" style="display:none; margin-top:14px; font-size:14px; color:var(--accent);"></div>

      <div id="resultBox">
        <h3 style="margin-top:16px; font-size:16px;">Rendered Output</h3>
        <video id="videoPlayer" controls autoplay loop></video>
        <p style="margin-top:8px;">
          <a id="downloadLink" href="#" style="color:var(--accent); font-weight:600; text-decoration:none;" download="rendered.mp4">⬇ Download Video</a>
        </p>
      </div>
    </div>

    <div class="card">
      <h2>📡 API Endpoints</h2>
      <div class="api-grid">
        <div class="endpoint-item">
          <span class="endpoint-method method-get">GET</span>
          <span class="endpoint-path">/health</span>
          <div class="endpoint-desc">Healthcheck endpoint used by Railway and monitoring tools.</div>
        </div>
        <div class="endpoint-item">
          <span class="endpoint-method method-post">POST</span>
          <span class="endpoint-path">/render</span>
          <div class="endpoint-desc">Render HTML composition to MP4/WebM video. Returns JSON with output URL.</div>
        </div>
        <div class="endpoint-item">
          <span class="endpoint-method method-post">POST</span>
          <span class="endpoint-path">/render/stream</span>
          <div class="endpoint-desc">Render with Server-Sent Events (SSE) progress updates.</div>
        </div>
        <div class="endpoint-item">
          <span class="endpoint-method method-get">GET</span>
          <span class="endpoint-path">/render/queue</span>
          <div class="endpoint-desc">Current queue status and worker capacity.</div>
        </div>
        <div class="endpoint-item">
          <span class="endpoint-method method-post">POST</span>
          <span class="endpoint-path">/lint</span>
          <div class="endpoint-desc">Validate and lint HyperFrames HTML without rendering.</div>
        </div>
        <div class="endpoint-item">
          <span class="endpoint-method method-get">GET</span>
          <span class="endpoint-path">/outputs/:token</span>
          <div class="endpoint-desc">Stream and download the rendered video file.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>💻 Programmatic Usage (cURL)</h2>
      <pre><code>curl -X POST ${baseUrl}/render \\
  -H "Content-Type: application/json" \\
  -d '{
    "html": "&lt;div id=\\"stage\\" data-composition-id=\\"hero\\" data-start=\\"0\\" data-duration=\\"3\\" data-width=\\"1280\\" data-height=\\"720\\"&gt;&lt;h1&gt;Hello Railway&lt;/h1&gt;&lt;/div&gt;",
    "fps": 30,
    "quality": "standard",
    "format": "mp4"
  }'</code></pre>
    </div>
  </div>

  <script>
    async function triggerRender() {
      const btn = document.getElementById("renderBtn");
      const status = document.getElementById("renderStatus");
      const resultBox = document.getElementById("resultBox");
      const videoPlayer = document.getElementById("videoPlayer");
      const downloadLink = document.getElementById("downloadLink");

      const html = document.getElementById("htmlInput").value;
      const fps = parseInt(document.getElementById("fpsInput").value, 10);
      const quality = document.getElementById("qualityInput").value;
      const format = document.getElementById("formatInput").value;

      btn.disabled = true;
      status.style.display = "block";
      status.textContent = "⏳ Rendering video in headless Chrome... please wait...";
      resultBox.style.display = "none";

      try {
        const response = await fetch("/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html, fps, quality, format })
        });

        const data = await response.json();

        if (data.success && data.outputUrl) {
          status.textContent = "✅ Render completed in " + (data.durationMs / 1000).toFixed(2) + "s (" + (data.fileSize / 1024).toFixed(1) + " KB)!";
          videoPlayer.src = data.outputUrl;
          downloadLink.href = data.outputUrl;
          downloadLink.download = "render." + format;
          resultBox.style.display = "block";
        } else {
          status.textContent = "❌ Error: " + (data.error || "Render failed");
        }
      } catch (err) {
        status.textContent = "❌ Network Error: " + err.message;
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;

  return c.html(html);
});

// Mount the standard Producer Application
const producerApp = createProducerApp({
  rendersDir: process.env.PRODUCER_RENDERS_DIR || "/tmp/hyperframes-renders",
  maxConcurrentRenders: parseInt(process.env.MAX_CONCURRENT_RENDERS || "2", 10),
});

app.route("/", producerApp);

const port = parseInt(process.env.PORT || process.env.PRODUCER_PORT || "8080", 10);

console.log(`Starting HyperFrames Railway Server on port ${port}...`);

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(`🚀 HyperFrames Server is running at http://0.0.0.0:${info.port}`);
  }
);

server.setTimeout(0);
(server as unknown as import("node:http").Server).requestTimeout = 0;
(server as unknown as import("node:http").Server).keepAliveTimeout = 0;

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down server...`);
  try {
    const { drainBrowserPool } = await import("@hyperframes/engine");
    await drainBrowserPool().catch(() => {});
  } catch {}

  server.close(() => {
    console.log("Server stopped successfully.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after 30s timeout.");
    process.exit(1);
  }, 30000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
