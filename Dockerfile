# ==============================================================================
# HyperFrames Production Image for Railway Deployment
# ==============================================================================
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# ── 1. System Dependencies & Fonts ───────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    ffmpeg \
    chromium \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libcups2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    libgtk-3-0 \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-ui-core \
    fonts-freefont-ttf \
    fonts-dejavu-core \
    fontconfig \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && fc-cache -fv

# ── 2. Chrome Headless Shell (Deterministic BeginFrame rendering) ─────────────
RUN npx --yes @puppeteer/browsers install chrome-headless-shell@148.0.7778.167 \
      --path /opt/puppeteer \
    && CHS="$(find /opt/puppeteer/chrome-headless-shell -name chrome-headless-shell -type f | head -n1)" \
    && mkdir -p /opt/chrome \
    && ln -s "$CHS" /opt/chrome/chrome-headless-shell \
    && /opt/chrome/chrome-headless-shell --version

ENV HYPERFRAMES_CHROME_PATH=/opt/chrome/chrome-headless-shell
ENV PRODUCER_HEADLESS_SHELL_PATH=/opt/chrome/chrome-headless-shell
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CONTAINER=true

# ── 3. Install Bun ───────────────────────────────────────────────────────────
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL="/root/.bun" bash -s "bun-v1.3.13"
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# ── 4. Cache Monorepo Dependencies ───────────────────────────────────────────
COPY package.json bun.lock ./
COPY packages/aws-lambda/package.json packages/aws-lambda/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/gcp-cloud-run/package.json packages/gcp-cloud-run/package.json
COPY packages/lint/package.json packages/lint/package.json
COPY packages/parsers/package.json packages/parsers/package.json
COPY packages/player/package.json packages/player/package.json
COPY packages/producer/package.json packages/producer/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/sdk-playground/package.json packages/sdk-playground/package.json
COPY packages/shader-transitions/package.json packages/shader-transitions/package.json
COPY packages/studio/package.json packages/studio/package.json
COPY packages/studio-server/package.json packages/studio-server/package.json
COPY scripts/package-subpaths.mjs scripts/package-subpaths.mjs

RUN bun install --frozen-lockfile

# ── 5. Copy Monorepo Source ───────────────────────────────────────────────────
COPY . .

# ── 6. Build Workspace Packages ──────────────────────────────────────────────
RUN bun run --cwd packages/parsers build \
    && bun run --cwd packages/lint build \
    && bun run --cwd packages/studio-server build \
    && bun run --cwd packages/core build \
    && bun run --cwd packages/core build:hyperframes-runtime:modular \
    && bun run --cwd packages/sdk build \
    && bun run --cwd packages/sdk-playground build \
    && bun run --cwd packages/engine build \
    && (cd packages/producer && bunx tsx scripts/generate-font-data.ts) \
    && bun run --cwd packages/producer build \
    && bun run --cwd packages/studio build

# ── 7. Configure Permissions & Entrypoint ─────────────────────────────────────
RUN chmod +x docker-entrypoint.sh

ENV PORT=8080
ENV PRODUCER_PORT=8080
ENV HYPERFRAMES_PREVIEW_HOST=0.0.0.0
EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
