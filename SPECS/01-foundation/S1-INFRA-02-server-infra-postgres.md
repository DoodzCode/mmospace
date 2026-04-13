# Implementation Spec: S1-INFRA-02 — PostgreSQL Connection & Drizzle Config

## 🆔 Task ID
`S1-INFRA-02` (server-infra-postgres)

## 🎯 Objective
Configure the database connection using Drizzle ORM and PostgreSQL. Set up migration handling so that the schema can evolve easily.

## 📁 File Location
`spacemud-server/src/db/`

## 📋 Steps
1.  **Drizzle Config**: Create `drizzle.config.ts` in the `spacemud-server/` root.
2.  **Client Connection**: Create `src/db/client.ts` which exports a `db` instance using `node-postgres` or `postgres.js` with Drizzle.
3.  **Schema Definition**: Create an initial `src/db/schema.ts` file with a simple `health_check` table (id, timestamp).
4.  **Migration Script**: Add `"db:generate": "drizzle-kit generate"` and `"db:migrate": "drizzle-kit migrate"` to `package.json`.

## ✅ Acceptance Criteria
1.  `DATABASE_URL` is read from `.env`.
2.  `bun run db:generate` produces a migration file.
3.  `bun run db:migrate` successfully applies migrations to a local Postgres instance.
4.  The server correctly exports a typed `db` object for use in other modules.

## 🧪 Verification
1.  Successfully run a test query like `db.select().from(healthCheck).execute()`.
2.  Verify a `.drizzle` folder is created with valid SQL migrations.
