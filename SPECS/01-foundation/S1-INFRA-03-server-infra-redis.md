# Implementation Spec: S1-INFRA-03 — Redis Connection & Key Patterns

## 🆔 Task ID
`S1-INFRA-03` (server-infra-redis)

## 🎯 Objective
Set up the Redis connection and define a standard set of key-naming patterns to be used throughout the game's life-cycle for caching and real-time state storage.

## 📁 File Location
`spacemud-server/src/redis/`

## 📋 Steps
1.  **Client Connection**: Create `src/redis/client.ts` using `ioredis` (standard) or `Bun.connect` (if using Bun-native features).
2.  **Key Patterns**: Create `src/redis/keys.ts` with constants for common key patterns:
    - `system:{id}:objects`
    - `player:{id}:session`
    - `player:{id}:ship`
3.  **Startup Check**: The server should ping Redis on startup and log success or fail with a clear message.

## ✅ Acceptance Criteria
1.  `REDIS_URL` is read from `.env`.
2.  The `redis` client is exportable and usable by other server modules.
3.  The `ping()` check passes during server initialization.

## 🧪 Verification
1.  Connect and `set("test", "ping")`, then `get("test")`.
2.  Test behavior when `REDIS_URL` is invalid (the server should fail to start with a clear error).
