# Render Deployment: IELTS Coach

This project can run as one Render Web Service. Render will give it a stable URL like:

```text
https://ielts-coach.onrender.com
```

## Create the service

1. Push this repository to GitHub.
2. Open Render.
3. Create a new Web Service from the GitHub repository.
4. Use these settings:

```text
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm run start
Health Check Path: /api/health
```

## Environment variables

Add these in Render:

```text
NODE_VERSION=24
JWT_SECRET=<Render can generate this>
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=<your preferred model>
LISTENING_TTS_PROVIDER=edge
```

Do not commit real API keys.

## Data persistence

The free Render plan gives a stable public URL, but local files created while the app runs are not guaranteed to survive restarts or redeploys.

IELTS Coach stores user accounts, attempts, vocabulary, imported reading/listening files, and audio assets under:

```text
/opt/render/project/src/data
```

For durable learning history, use a paid Render service with a persistent disk mounted at that path. Without a persistent disk, the public URL is still stable, but practice data can reset after redeploys or restarts.
