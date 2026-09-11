# Panduan Deploy HyperFrames ke Railway

Dokumen ini menjelaskan langkah-langkah untuk mendeploy **HyperFrames** ke platform [Railway](https://railway.app/).

---

## 📁 File yang Telah Disiapkan

1. [`Dockerfile`](./Dockerfile)
   - Image berbasis `node:22-bookworm-slim`.
   - Menginstall Chromium ABI deps, FFmpeg, fonts (Liberation, Noto, FreeFont, DejaVu), dan `tini`.
   - Menginstall **`chrome-headless-shell@148.0.7778.167`** untuk fitur deterministic `BeginFrame` capture.
   - Menginstall **Bun** sebagai runtime dan package manager monorepo.
   - Membangun seluruh paket workspace yang dibutuhkan (`core`, `engine`, `producer`, `studio`, dll.).

2. [`railway.json`](./railway.json)
   - Konfigurasi Railway untuk membangun container menggunakan `Dockerfile`.
   - Konfigurasi health check ke endpoint `/health`.
   - Kebijakan restart otomatis saat kegagalan (`ON_FAILURE`).

3. [`docker-entrypoint.sh`](./docker-entrypoint.sh)
   - Script startup container yang otomatis mendeteksi variabel `PORT` dari Railway.
   - Mendukung 2 mode operasi:
     - **Mode API Render Server** (default)
     - **Mode Studio Web UI** (`MODE=studio`)

4. [`server/railway-server.ts`](./server/railway-server.ts)
   - Server HTTP mandiri berbasis Hono dengan CORS aktif.
   - Menyediakan Interactive Web Console & Playground di `GET /`.
   - Menyediakan API rendering lengkap (`/render`, `/render/stream`, `/health`, `/queue`, `/outputs/:token`).

5. [`.dockerignore`](./.dockerignore)
   - Mengabaikan file log, cache, dan folder besar lokal agar proses upload & build Docker di Railway cepat dan bersih.

---

## 🚀 Cara Deploy ke Railway

### Cara 1: Deploy Melalui GitHub (Paling Direkomendasikan)

1. **Buat Repository Baru di GitHub**:
   - Buka [GitHub](https://github.com/new) dan buat repo baru (misal: `my-hyperframes`).
2. **Push folder `D:\Hyperframe` ke GitHub**:
   ```bash
   cd D:\Hyperframe
   git add .
   git commit -m "feat: add Railway deployment configuration"
   git remote add origin https://github.com/<username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
3. **Deploy di Dashboard Railway**:
   - Buka [Railway Dashboard](https://railway.app/dashboard).
   - Klik **"+ New Project"** → Pilih **"Deploy from GitHub repo"**.
   - Pilih repository Anda.
   - Railway akan otomatis mendeteksi `railway.json` dan `Dockerfile` serta memulai proses build!
4. **Generate Domain Publik**:
   - Setelah deployment berhasil, buka menu **Settings** pada service Anda.
   - Di bagian **Networking**, klik **"Generate Domain"** (misal: `hyperframes-production.up.railway.app`).

---

### Cara 2: Deploy Menggunakan Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
2. Login ke akun Railway:
   ```bash
   railway login
   ```
3. Inisialisasi dan Deploy dari folder:
   ```bash
   cd D:\Hyperframe
   railway init
   railway up
   ```

---

## ⚙️ Environment Variables (Variabel Lingkungan)

Anda dapat mengatur variabel berikut di tab **Variables** pada Railway Dashboard:

| Variabel | Default | Keterangan |
|---|---|---|
| `MODE` | `api` | Mode yang dijalankan. Gunakan `api` untuk Render API Server, atau `studio` untuk menjalankan HyperFrames Studio Web UI. |
| `PORT` | Diisi otomatis oleh Railway (8080) | Port HTTP server. |
| `MAX_CONCURRENT_RENDERS` | `2` | Jumlah maksimum render video yang dapat diproses bersamaan. |
| `PRODUCER_RENDERS_DIR` | `/tmp/hyperframes-renders` | Folder penyimpanan sementara video yang selesai dirender. |

---

## 🧪 Menguji & Menggunakan Layanan

### 1. Membuka Web Console di Browser
Buka URL domain publik Railway Anda:
```
https://<domain-anda>.up.railway.app
```
Anda akan melihat tampilan konsol visual interaktif untuk mengetes rendering langsung dari browser serta melihat dokumentasi endpoint API.

### 2. Rendering Video via HTTP POST (cURL / API)

Kirim request `POST /render` dengan payload HTML:
```bash
curl -X POST https://<domain-anda>.up.railway.app/render \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div id=\"stage\" data-composition-id=\"hero\" data-start=\"0\" data-duration=\"3\" data-width=\"1280\" data-height=\"720\" style=\"background:#0f172a;display:flex;justify-content:center;align-items:center;height:100%;\"><h1 style=\"color:#38bdf8;font-family:sans-serif;font-size:48px;\">Halo dari Railway!</h1></div>",
    "fps": 30,
    "quality": "standard",
    "format": "mp4"
  }'
```

Response JSON:
```json
{
  "success": true,
  "requestId": "...",
  "outputUrl": "/outputs/abc123token",
  "fileSize": 384920,
  "durationMs": 2410,
  "videoDurationSeconds": 3
}
```

Video dapat langsung diunduh di:
```
https://<domain-anda>.up.railway.app/outputs/abc123token
```
