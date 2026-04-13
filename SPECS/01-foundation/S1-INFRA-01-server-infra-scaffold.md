# Implementation Spec: S1-INFRA-01 — Server Project Scaffold

## 🆔 Task ID
`S1-INFRA-01` (server-infra-scaffold)

## 🎯 Objective
Initialize the `spacemud-server` project with a modern Bun-based environment. This includes setting up Fastify, WebSockets, TypeScript, and a clean directory structure.

## 📁 File Location
Root: `spacemud-server/`

## 📋 Steps
1.  **Init**: `bun init -y` in `spacemud-server/`.
2.  **Install Dependencies**:
    - `fastify`, `@fastify/websocket`, `drizzle-orm`, `pg`, `ioredis`, `jsonwebtoken`, `bcrypt`, `dotenv`, `zod`.
    - Dev: `drizzle-kit`, `@types/pg`, `@types/jsonwebtoken`, `@types/bcrypt`.
3.  **Directory Structure**:
    - `src/routes/`: HTTP endpoints.
    - `src/game/`: Core game logic.
    - `src/db/`: Drizzle schema and migrations.
    - `src/tick/`: The game loop logic.
    - `src/types/`: TypeScript definitions.
4.  **Entry Point**: `src/index.ts` should start a Fastify server on port 3000 with the WebSocket plugin registered.

## ✅ Acceptance Criteria
1.  `bun run dev` (or equivalent) starts the server without errors.
2.  `GET /health` returns `{ status: "ok" }`.
3.  `tsconfig.json` uses strict mode.
4.  A `.env.example` file is provided.

## 🧪 Verification
1.  `curl http://localhost:3000/health` → `200 OK`.
2.  Connect to `ws://localhost:3000/ws` using a tool like `wscat` or a simple script.
