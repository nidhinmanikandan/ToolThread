# ToolThread

> Discover modern tools. Understand what they do. Learn how to use them.

ToolThread is a personalized tool discovery and learning platform that continuously discovers modern tools from multiple sources, validates and enriches their information, and recommends relevant tools based on a user's interests and goals.

Instead of relying entirely on AI to generate a list of tools, ToolThread builds a continuously growing tool database from real-world sources such as GitHub, Reddit, Hacker News, npm, and PyPI.

AI is then used where it adds the most value — generating structured learning roadmaps for the tools users choose.

---

## ✨ What Problem Does ToolThread Solve?

The modern technology ecosystem changes extremely quickly.

New AI tools, developer tools, design tools, frameworks, libraries, and platforms appear every day. Finding useful tools usually means searching through:

- GitHub
- Reddit
- Hacker News
- Product websites
- Blogs
- YouTube
- Documentation
- Social media

This makes tool discovery fragmented and difficult.

ToolThread aims to bring this process into one platform.

```text
Discover → Validate → Enrich → Recommend → Learn
```

## Local Meilisearch

Meilisearch is self-hosted for local search development. MongoDB remains the source of truth; the backend connects to Meilisearch using server-side environment variables.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MEILI_MASTER_KEY` to a generated secret and set `MEILI_API_KEY` to the same value for local development. For deployment, use a restricted API key for the backend rather than the master key.
3. From the repository root, start Meilisearch:

   ```sh
   docker compose --env-file backend/.env up -d meilisearch
   ```

   The service listens on `http://localhost:7700` and stores its data in a named Docker volume.
4. Start the backend from `backend/` with `npm start`. Check the service at `http://localhost:5000/api/health/meilisearch`; it returns `503` while Meilisearch is not configured or unavailable.

To safely rebuild the Meilisearch tools index from approved MongoDB `Tool` records, run `npm run search:reindex` from `backend/`. The command builds a staging index and swaps it into place only after indexing succeeds; it does not modify MongoDB records.

Stop the service with `docker compose --env-file backend/.env down`. Keep `backend/.env` private; neither the Meilisearch master key nor the backend API key belongs in frontend configuration.
