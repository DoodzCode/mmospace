# Space MUD — Development Plan

> Generated from `PROPOSAL.md`. Handed directly to Claude Code agent-teams.
> Stack: Bun/TypeScript (server) · Rust (client) · PostgreSQL + Redis

---

# Deliverable 1: Development Outline

## ID Scheme
`[workstream]-[system]-[component]`  
Workstreams: `shared` · `server` · `client`

---

## Workstream: SHARED

### System: wire

#### `shared-wire-schema` — Wire Protocol Schema Document
- **Description**: A single versioned JSON/Markdown schema file committing every server→client and client→server message type, field names, and example payloads. Both repos import or reference this document as the authoritative contract.
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design decisions from proposal. Out: `wire-protocol.md` + optional JSON Schema files in a shared location (e.g. `spacemud-shared/` or a gist both repos pin).
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. All 8 server→client message types are documented with every field typed.
  2. The single client→server `command` message is documented.
  3. Both devs have reviewed and signed off (git commit on shared repo/file).
  4. No implementation code exists that contradicts the schema.
- **Test scenarios**:
  1. Generate a `tick_update` example payload; validate it matches schema field-by-field.
  2. Generate a `command` payload with each supported command string; confirm no undocumented fields.
  3. A breaking schema change (rename a field) triggers a version bump and review.

#### `shared-wire-ts-types` — TypeScript Wire Type Definitions
- **Description**: TypeScript interfaces/types for every wire message, generated from or hand-authored against `shared-wire-schema`. Imported by the server for send/receive type safety.
- **Owner**: shared (used by server)
- **Dependencies**: `shared-wire-schema`
- **Inputs/Outputs**: In: wire schema doc. Out: `types/wire.ts` exportable by server.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. TypeScript compiler accepts all wire message types with no `any`.
  2. Adding a new message type to the schema requires a corresponding type update (enforced by `tsc --strict`).
  3. Server can import and use these types without casting.
- **Test scenarios**:
  1. Compile server with strict mode; no type errors on wire message construction.
  2. Attempt to construct a `tick_update` with a missing required field; tsc errors.
  3. JSON.parse of a valid server payload can be asserted as the typed interface.

#### `shared-wire-rs-types` — Rust Wire Serde Structs
- **Description**: Rust structs with `#[derive(Serialize, Deserialize)]` for every wire message, authored against `shared-wire-schema`. Used by client to parse server messages and serialize commands.
- **Owner**: shared (used by client)
- **Dependencies**: `shared-wire-schema`
- **Inputs/Outputs**: In: wire schema. Out: `src/wire/types.rs`.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `cargo build` passes with no warnings on the types module.
  2. `serde_json::from_str` of a valid `tick_update` JSON string produces the correct Rust struct.
  3. All optional fields use `Option<T>`; no silent field drops.
- **Test scenarios**:
  1. Deserialize a full `tick_update` example payload; assert all fields populated.
  2. Deserialize a `ship_status` with missing optional field; `Option` field is `None`, no panic.
  3. Serialize a `command` struct to JSON; output matches expected schema.

---

## Workstream: SERVER

### System: infra

#### `server-infra-scaffold` — Server Project Scaffold
- **Description**: Initialize the `spacemud-server` repo with Bun, Fastify, ws, and Drizzle. Includes a working `bun run dev` hot-reload entry point, `tsconfig.json`, linting, and directory structure.
- **Owner**: server
- **Dependencies**: none
- **Inputs/Outputs**: In: nothing. Out: runnable empty server on `localhost:3000`.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `bun run dev` starts without errors.
  2. `GET /health` returns `200 OK`.
  3. WebSocket upgrade on `/ws` accepts a connection.
  4. Directory structure separates `src/routes`, `src/game`, `src/db`, `src/tick`.
- **Test scenarios**:
  1. Fresh clone → `bun install` → `bun run dev` → health check passes.
  2. WebSocket client connects to `/ws`; server logs connection without crash.
  3. Killing the process and restarting completes within 2 seconds.

#### `server-infra-postgres` — PostgreSQL Connection & Drizzle Config
- **Description**: Configure Drizzle ORM with a PostgreSQL connection string. Includes migration runner script (`bun run db:migrate`) and seed script skeleton.
- **Owner**: server
- **Dependencies**: `server-infra-scaffold`
- **Inputs/Outputs**: In: `DATABASE_URL` env var. Out: `db` Drizzle instance importable by game modules.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `bun run db:migrate` runs against a local/Supabase PostgreSQL without error.
  2. Drizzle `db` instance is importable and executes a `SELECT 1` without throwing.
  3. Missing `DATABASE_URL` causes a startup error with a clear message.
- **Test scenarios**:
  1. Run migrations on empty DB; all tables created.
  2. Run migrations twice; idempotent (no duplicate-column error).
  3. Provide invalid connection string; server exits with actionable error, not a cryptic crash.

#### `server-infra-redis` — Redis Connection & Key Patterns
- **Description**: Configure Redis client (ioredis or Bun-native). Document key-naming conventions (e.g. `system:{id}:objects`, `session:{playerId}`). Exports `redis` client.
- **Owner**: server
- **Dependencies**: `server-infra-scaffold`
- **Inputs/Outputs**: In: `REDIS_URL` env var. Out: `redis` client + key-pattern constants file.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `redis.ping()` returns `PONG` at startup.
  2. Key-pattern constants file enumerates every Redis key used in the project.
  3. Missing `REDIS_URL` causes a clear startup error.
- **Test scenarios**:
  1. Write a value with a key-pattern constant; read it back correctly.
  2. Simulate Redis down; server startup fails with actionable message.
  3. Key-pattern helper function generates correct key strings for given IDs.

---

### System: db

#### `server-db-accounts` — Accounts Table Schema
- **Description**: Drizzle schema for the `accounts` table: `id`, `username`, `password_hash`, `created_at`, `last_login`. Includes unique constraint on `username`.
- **Owner**: server
- **Dependencies**: `server-infra-postgres`
- **Inputs/Outputs**: In: migration runner. Out: `accounts` table in PostgreSQL.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Migration creates table with all specified columns and correct types.
  2. Unique constraint on `username` enforced at DB level.
  3. Drizzle typed query for insert/select compiles without `any`.
- **Test scenarios**:
  1. Insert two accounts with same username; second insert throws unique violation.
  2. Insert account; query by username returns exactly that row.
  3. `password_hash` column never stores plaintext (enforced by review, not DB).

#### `server-db-ships` — Ships & Modules Tables Schema
- **Description**: Drizzle schema for `ships` (id, account_id FK, hull_hp, shield_hp, credits, position, system_id, home_station_id) and `ship_modules` (id, ship_id FK, slot, type, tier, active).
- **Owner**: server
- **Dependencies**: `server-infra-postgres`, `server-db-accounts`
- **Inputs/Outputs**: In: migration runner. Out: `ships`, `ship_modules`, `ship_cargo` tables.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. FK from `ships.account_id` → `accounts.id` with CASCADE DELETE.
  2. `ship_modules` supports up to 6 module slots per ship.
  3. `ship_cargo` tracks resource type + quantity with composite unique key (ship_id, resource_type).
- **Test scenarios**:
  1. Create account + ship; delete account; ship record cascades.
  2. Insert duplicate cargo row for same (ship, resource); upsert increments quantity correctly.
  3. Ship with 6 module slots inserts all 6 rows without error.

#### `server-db-systems` — Star Systems & Objects Tables Schema
- **Description**: Drizzle schema for `star_systems` (id, name, archetype, hyper_lanes JSONB, generated_at) and `system_objects` (id, system_id FK, type, x, y, z, properties JSONB).
- **Owner**: server
- **Dependencies**: `server-infra-postgres`
- **Inputs/Outputs**: In: migration runner. Out: `star_systems`, `system_objects` tables.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `hyper_lanes` JSONB column stores array of `{target_system_id, distance}` objects.
  2. `system_objects.properties` JSONB stores type-specific fields (resources, faction, etc.).
  3. Index on `system_objects.system_id` for fast per-system queries.
- **Test scenarios**:
  1. Insert starting system with 20 objects; query all objects by system_id returns 20 rows.
  2. Update hyper_lanes JSON for a system; re-read confirms update.
  3. Query objects by type (`asteroid`) within a system returns correct subset.

#### `server-db-economy` — Economy & Station Inventory Schema
- **Description**: Drizzle schema for `station_inventory` (station_id, resource_type, quantity, price_override) and `trade_log` (id, player_id, station_id, type, resource, quantity, credits, timestamp).
- **Owner**: server
- **Dependencies**: `server-infra-postgres`, `server-db-systems`
- **Inputs/Outputs**: In: migration runner. Out: `station_inventory`, `trade_log` tables.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Station inventory tracks current stock of fuel and ammo separately.
  2. Trade log records every buy/sell transaction with timestamp.
  3. FK from `station_inventory.station_id` → `system_objects.id`.
- **Test scenarios**:
  1. Record 3 sell trades; query trade_log for player returns 3 rows in order.
  2. Station inventory fuel quantity decrements on buy; never goes below 0.
  3. Price override null falls back to base value calculation in application code.

#### `server-db-starchart` — Player Star Chart Schema
- **Description**: Drizzle schema for `player_starchart` (player_id FK, system_id FK, visited_at, scanned_objects JSONB) — tracks each player's personal galaxy knowledge.
- **Owner**: server
- **Dependencies**: `server-infra-postgres`, `server-db-accounts`, `server-db-systems`
- **Inputs/Outputs**: In: migration runner. Out: `player_starchart` table.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Composite PK on (player_id, system_id) prevents duplicate chart entries.
  2. `scanned_objects` JSONB stores array of object IDs the player has scanned.
  3. Upsert on re-visit updates `visited_at` and merges `scanned_objects`.
- **Test scenarios**:
  1. Player visits system; chart entry created.
  2. Player scans 3 objects; IDs appear in `scanned_objects`.
  3. Player revisits; upsert doesn't duplicate entry.

---

### System: auth

#### `server-auth-register` — Registration Endpoint
- **Description**: `POST /auth/register` — accepts `{username, password}`, validates uniqueness, hashes password with bcrypt, inserts account row, returns `{accountId}`.
- **Owner**: server
- **Dependencies**: `server-infra-scaffold`, `server-db-accounts`
- **Inputs/Outputs**: In: `{username: string, password: string}`. Out: `{accountId: string}` or error.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Duplicate username returns 409 with clear message.
  2. Password is never stored in plaintext (bcrypt rounds ≥ 10).
  3. Missing fields return 400 with field-level validation errors.
- **Test scenarios**:
  1. Register new user; login with same credentials succeeds.
  2. Register duplicate username; 409 response, no second DB row.
  3. Register with empty password; 400 validation error.

#### `server-auth-login` — Login & JWT Endpoint
- **Description**: `POST /auth/login` — validates credentials, issues a signed JWT (24h expiry) containing `accountId`. Stores session in Redis with TTL.
- **Owner**: server
- **Dependencies**: `server-auth-register`, `server-infra-redis`
- **Inputs/Outputs**: In: `{username, password}`. Out: `{token: string}` or 401.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Valid credentials return a JWT decodable to `{accountId, exp}`.
  2. Wrong password returns 401, not 500.
  3. JWT secret is env-var driven; missing `JWT_SECRET` causes startup failure.
- **Test scenarios**:
  1. Login with correct credentials; decode JWT; `accountId` matches registered user.
  2. Login with wrong password; response is 401.
  3. Use expired JWT on WebSocket; connection rejected.

#### `server-auth-ws-handshake` — WebSocket Auth Handshake
- **Description**: On WebSocket connect, server expects first message `{type: "auth", token: "<jwt>"}` within 5 seconds. Validates JWT, loads player session, associates socket with `accountId`. Rejects unauthenticated sockets.
- **Owner**: server
- **Dependencies**: `server-auth-login`, `server-infra-scaffold`
- **Inputs/Outputs**: In: `AuthMessage` wire type. Out: `{type: "auth_ok"}` or closes socket with code 4001.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Valid JWT within 5s receives `auth_ok` response.
  2. No auth message within 5s closes socket with code 4001.
  3. Invalid/expired JWT closes socket with code 4001 and log entry.
  4. Authenticated player is tracked in server's active-connection map.
- **Test scenarios**:
  1. Connect + send valid token; receive `auth_ok`; player added to connection map.
  2. Connect but send no auth; after 5s, socket closed with 4001.
  3. Connect + send expired token; socket closed with 4001 immediately.

---

### System: tick

#### `server-tick-loop` — Tick Loop Driver
- **Description**: `setInterval`-based 3-second tick loop. Calls each tick-phase function in order, measures tick duration, logs if a tick exceeds 2500ms (yellow) or 3000ms (red). Exports `startTick()` and `stopTick()`.
- **Owner**: server
- **Dependencies**: `server-infra-scaffold`
- **Inputs/Outputs**: In: system list from Redis. Out: triggers all tick phases.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Tick fires every 3000ms ± 50ms under no load.
  2. Tick overrun (>2500ms) logs a warning with duration.
  3. `stopTick()` cleanly cancels the interval with no pending callbacks.
- **Test scenarios**:
  1. Start tick loop; measure 10 consecutive ticks; all within ±50ms of 3000ms.
  2. Simulate slow phase (sleep 2600ms); warning log fires.
  3. Stop tick loop; confirm no further tick callbacks fire.

#### `server-tick-movement` — Movement Tick Phase
- **Description**: Iterates all objects with non-idle movement mode in a system. Updates position toward nav target (approaching) or recalculates orbit position. Clamps speed to thruster power scaling.
- **Owner**: server
- **Dependencies**: `server-tick-loop`, `server-world-coordinate`, `server-ship-movement`
- **Inputs/Outputs**: In: system object list from Redis. Out: updated positions written back to Redis.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Ship in `approaching` mode moves toward target each tick at correct speed.
  2. Ship in `orbiting` mode stays within ±2 units of target orbit distance.
  3. Ship reaches stop distance and switches to `idle` automatically.
- **Test scenarios**:
  1. Ship at (0,0,0), target at (100,0,0), approach speed 10u/tick; after 10 ticks, ship at (100,0,0).
  2. Ship orbiting at 50u; tick advances; distance from target stays 48–52u.
  3. Ship approaches to within stop distance; movement mode becomes `idle`.

#### `server-tick-combat` — Combat Resolution Tick Phase
- **Description**: Iterates all active projectiles. Advances each projectile position by its velocity. Checks distance to target ship. On hit (≤5 units), applies damage and removes projectile.
- **Owner**: server
- **Dependencies**: `server-tick-loop`, `server-combat-projectile`, `server-combat-damage`
- **Inputs/Outputs**: In: projectile list + ship positions from Redis. Out: updated projectile list + ship HP updates.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Projectile moves at 50 units/tick toward target.
  2. Projectile within ≤5 units of target triggers damage application.
  3. Destroyed projectile is removed from Redis on the same tick it hits.
- **Test scenarios**:
  1. Projectile at (0,0,0) targeting ship at (40,0,0) at 50u/s; hits on tick 1.
  2. Projectile misses (target moved); projectile continues for max-range ticks, then despawns.
  3. Two simultaneous projectiles hit same ship; damage applied twice correctly.

#### `server-tick-drones` — Drone Operations Tick Phase
- **Description**: For each ship with active drone modules, validates ptarget range, then executes drone action: harvest drones extract resources from target object; combat drones create projectiles if fire-rate cooldown has elapsed.
- **Owner**: server
- **Dependencies**: `server-tick-loop`, `server-drone-starter`, `server-drone-gun`, `server-resource-harvest-tick`
- **Inputs/Outputs**: In: active drone states + ship positions. Out: cargo additions, new projectiles, cooldown updates.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Harvest drone within ≤20 units of resource object extracts resources each tick.
  2. Combat drone fires once every 2 ticks (respects fire-rate cooldown).
  3. Drone with ptarget out of range deactivates and sends event to player.
- **Test scenarios**:
  1. Starter drone targeting asteroid within 15u; cargo increases by expected amount each tick.
  2. Gun drone fires at tick 1; no projectile at tick 2; projectile at tick 3.
  3. Drone targeting object beyond range limit; auto-deactivates, event message sent.

#### `server-tick-npc` — NPC AI Tick Phase
- **Description**: Iterates all NPC entities (pirates) in active systems. Checks aggro range (≤100u from any player). Pursues or patrols. Handles NPC respawn timer countdown.
- **Owner**: server
- **Dependencies**: `server-tick-loop`, `server-npc-pirate-ai`
- **Inputs/Outputs**: In: NPC states + player positions from Redis. Out: updated NPC positions + aggro flags.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Pirate within 100u of player enters pursuit mode and moves toward player.
  2. Pirate further than 150u from last-aggro player returns to patrol.
  3. Dead pirate respawn timer decrements each tick; spawns at original position when expired.
- **Test scenarios**:
  1. Player enters 90u of pirate; pirate pursues on next tick.
  2. Player jumps out of system; pirate returns to patrol after 2 ticks.
  3. Pirate dies; respawn timer set; after N ticks, pirate entity recreated.

#### `server-tick-broadcast` — State Broadcast Tick Phase
- **Description**: After all game phases complete, serializes current system state into `tick_update` message and sends to all authenticated WebSocket clients in that system. Also sends `ship_status` to each player.
- **Owner**: server
- **Dependencies**: `server-tick-loop`, `shared-wire-ts-types`, `server-auth-ws-handshake`
- **Inputs/Outputs**: In: Redis world state + connected player map. Out: `tick_update` + `ship_status` JSON messages sent over WebSocket.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Every connected player receives `tick_update` within 100ms of tick completion.
  2. `tick_update` contains only objects in the player's current system.
  3. Players in different systems receive different `tick_update` payloads.
- **Test scenarios**:
  1. 2 players in same system; both receive identical `tick_update`.
  2. Player disconnects mid-tick; broadcast skips them without throwing.
  3. `ship_status` sent to player contains their current hull, shield, cargo values.

---

### System: world

#### `server-world-coordinate` — 3D Coordinate Math
- **Description**: Utility module for 3D vector math: `distance(a, b)`, `normalize(v)`, `moveToward(pos, target, speed)`, `orbitPosition(center, radius, angle)`. All positions are `{x, y, z}` floats.
- **Owner**: server
- **Dependencies**: none
- **Inputs/Outputs**: In: position objects. Out: computed positions/scalars.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `distance((0,0,0), (3,4,0))` returns `5.0` (Euclidean).
  2. `moveToward` with speed > remaining distance returns exactly the target position.
  3. All functions are pure (no side effects, no DB/Redis calls).
- **Test scenarios**:
  1. Distance between two identical points returns 0.
  2. `moveToward` with speed 10 and distance 5; result equals target.
  3. `orbitPosition` at angle 0 and radius 50 returns position exactly 50 units from center.

#### `server-world-objects` — Object Entity Model
- **Description**: TypeScript types and factory functions for each world object type: `Star`, `Planet`, `Asteroid`, `GasCloud`, `Station`, `NpcShip`, `PlayerShip`, `Projectile`. Each has `id`, `type`, `position`, `properties`.
- **Owner**: server
- **Dependencies**: `server-world-coordinate`
- **Inputs/Outputs**: In: raw DB/generation data. Out: typed world object instances.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Each object type has a factory function with typed required fields.
  2. `Asteroid` properties include `resources: Record<ResourceType, number>`.
  3. TypeScript strict mode accepts all factory calls without casting.
- **Test scenarios**:
  1. Create asteroid with H=100, He=50; properties accessible as typed fields.
  2. Attempt to create object without required field; TypeScript compile error.
  3. Factory serializes to valid JSON matching `tick_update` schema.

#### `server-world-starting-system` — Starting System Generator
- **Description**: Creates the fixed, hand-tuned starting system: 1 star at origin, 3–5 planets, 5–10 asteroids/gas clouds with H/He/Li/B resources, 1 trade station orbiting a planet. Persists to PostgreSQL + Redis on first server start.
- **Owner**: server
- **Dependencies**: `server-world-objects`, `server-db-systems`, `server-infra-redis`
- **Inputs/Outputs**: In: nothing (fixed values). Out: starting system row + objects in DB and Redis.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Starting system generated once; re-running seed does not duplicate it.
  2. All 4 MVP resources (H, He, Li, B) appear on at least one object.
  3. Trade station object present with `HAS_TRADE: true` in properties.
- **Test scenarios**:
  1. Run seed; query system_objects; count matches expected range (10–16 objects).
  2. Run seed twice; only one starting system row exists.
  3. Trade station is within docking range of its parent planet (≤500u).

#### `server-world-redis-state` — Redis World State Store
- **Description**: Functions to serialize/deserialize system object positions and velocities to/from Redis. Keys: `system:{id}:objects` (hash). Provides `getSystemState(id)`, `setSystemState(id, objects)`, `updateObjectPosition(systemId, objectId, pos)`.
- **Owner**: server
- **Dependencies**: `server-infra-redis`, `server-world-objects`
- **Inputs/Outputs**: In: typed world objects. Out: Redis hash entries; reverse on read.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Round-trip: write objects to Redis, read back, positions match to 4 decimal places.
  2. `updateObjectPosition` updates a single object without overwriting others.
  3. Missing system key returns empty array, not null/undefined.
- **Test scenarios**:
  1. Write 20 objects; read back; all 20 present with correct types.
  2. Update one object's position; re-read only that object; others unchanged.
  3. Read non-existent system; returns `[]`.

---

### System: ship

#### `server-ship-entity` — Ship Entity Model
- **Description**: TypeScript type and DB-to-memory loader for a ship: hull_hp, shield_hp, credits, position, system_id, home_station_id, module slots array, cargo map. Provides `loadShip(accountId)` and `saveShip(ship)`.
- **Owner**: server
- **Dependencies**: `server-db-ships`, `server-world-coordinate`
- **Inputs/Outputs**: In: DB rows. Out: in-memory `Ship` object.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. New account gets a starter ship with default stats (hull 100, shield 50, cargo 0).
  2. Starter ship has 1 Power Capacitor (100 PU), Thrusters, Jump Drive, Shields, Hull, Cargo, 1 Starter Drone slot.
  3. `saveShip` persists all mutable fields (position, hp, credits, cargo, modules) to DB.
- **Test scenarios**:
  1. Create account; `loadShip` creates and returns starter ship with correct defaults.
  2. Modify ship credits; `saveShip`; reload; credits match.
  3. Ship with full cargo bay rejects additional resource insertion.

#### `server-ship-power-budget` — Power Budget System
- **Description**: Validates that total active module PU draw does not exceed capacitor capacity. `checkPowerBudget(ship)` returns `{ok: bool, overdrawnBy: number}`. Module activation calls this before toggling on.
- **Owner**: server
- **Dependencies**: `server-ship-entity`
- **Inputs/Outputs**: In: ship module states + PU values. Out: budget validation result.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Activating a module that would exceed capacitor PU is rejected with event message.
  2. Total draw of all active modules is correctly summed (thrusters at 50% = 20 PU).
  3. Deactivating a module frees its PU immediately.
- **Test scenarios**:
  1. Starter ship (100 PU cap): activate all 4 modules (40+20+15+25=100); accepted.
  2. Same ship: attempt to activate 5th 10-PU module; rejected (would be 110 PU).
  3. Deactivate shields (free 20 PU); activate 10-PU module; accepted.

#### `server-ship-movement` — Movement Mode State Machine
- **Description**: Manages ship movement modes: `idle`, `approaching`, `orbiting`. Validates ntarget existence. Transitions: `approach` → approaching, `orbit` → orbiting, `stop` → idle. Stores `{mode, ntarget, orbitDistance, stopRange}` in ship state.
- **Owner**: server
- **Dependencies**: `server-ship-entity`, `server-world-coordinate`
- **Inputs/Outputs**: In: command + current ship state. Out: updated movement state in Redis.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `approach` command sets mode to `approaching` with ntarget reference.
  2. `orbit` command sets mode to `orbiting` with distance parameter.
  3. `stop` transitions any mode to `idle` immediately.
  4. Cannot approach an invalid/nonexistent ntarget.
- **Test scenarios**:
  1. Set ntarget to asteroid; `approach`; mode = approaching, ntarget set.
  2. `orbit <target> 50`; mode = orbiting, orbitDistance = 50.
  3. During approach; `stop`; mode immediately = idle, velocity = 0.

#### `server-ship-thruster-scaling` — Thruster Power Scaling
- **Description**: Computes ship movement speed per tick as a function of thruster power level (0–100%). Base speed at 100% determined by ship class. `getSpeed(thrusterPowerPct, shipClass)` → units/tick.
- **Owner**: server
- **Dependencies**: `server-ship-entity`, `server-ship-power-budget`
- **Inputs/Outputs**: In: thruster power %, ship class. Out: speed in units/tick.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. 100% thruster power = max speed for ship class (e.g. 15 u/tick for starter).
  2. 0% thruster power = 0 speed.
  3. `thrusters 50` command halves PU draw and halves speed.
- **Test scenarios**:
  1. `getSpeed(100, 'starter')` = 15 (or configured value).
  2. `getSpeed(0, 'starter')` = 0.
  3. `getSpeed(50, 'starter')` = 7.5 (linear scaling).

#### `server-ship-cargo` — Cargo Bay CRUD
- **Description**: Functions to add/remove resources from a ship's cargo bay. Enforces cargo capacity. `addCargo(ship, resource, qty)`, `removeCargo(ship, resource, qty)`, `getCargoUsed(ship)`.
- **Owner**: server
- **Dependencies**: `server-ship-entity`
- **Inputs/Outputs**: In: ship + resource type + quantity. Out: updated cargo map or error.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `addCargo` rejects if total cargo used + qty > cargo capacity.
  2. `removeCargo` rejects if quantity requested > quantity held.
  3. Cargo operations persist to DB via `saveShip`.
- **Test scenarios**:
  1. Add 50 units H to empty cargo (capacity 100); succeeds, used=50.
  2. Add 60 more units; rejected (would be 110/100).
  3. Remove 30 H; succeeds, used=20.

---

### System: cmd

#### `server-cmd-parser` — Command String Parser
- **Description**: Tokenizes player command strings into `{command: string, args: string[]}`. Case-insensitive command matching. Returns `{error: string}` for unrecognized commands.
- **Owner**: server
- **Dependencies**: none
- **Inputs/Outputs**: In: raw command string from wire `command` message. Out: parsed command object.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `"scan asteroid-1"` parses to `{command: "scan", args: ["asteroid-1"]}`.
  2. Unknown command returns error message sent back to client as `event`.
  3. Empty string returns error, not crash.
- **Test scenarios**:
  1. Parse `"orbit station-1 50"` → `{command:"orbit", args:["station-1","50"]}`.
  2. Parse `"LOOK"` (uppercase) → `{command:"look", args:[]}`.
  3. Parse `""` → `{error: "Empty command"}`.

#### `server-cmd-movement` — Movement Commands Handler
- **Description**: Handles `ntarget`, `approach`, `orbit`, `thrusters`, `stop`. Validates target existence in current system. Updates ship movement state. Sends `event` feedback message.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-ship-movement`, `server-ship-thruster-scaling`
- **Inputs/Outputs**: In: parsed command + player ship state. Out: updated movement state + `event` message to client.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `ntarget <id>` sets ntarget if object exists in system; error if not.
  2. `approach` without ntarget set returns error message.
  3. `thrusters 50` updates PU draw and speed factor.
- **Test scenarios**:
  1. `ntarget asteroid-1`; asteroid exists; ship.ntarget = "asteroid-1".
  2. `ntarget nonexistent`; error event sent; ntarget unchanged.
  3. `thrusters 0`; ship stops moving; PU draw = 0.

#### `server-cmd-scan` — Scan Commands Handler
- **Description**: Handles `scan <target>` and `deep-scan`. `scan` validates distance ≤500u, returns `scan_result` with object properties. `deep-scan` returns `deep_scan_result` with hyper-lane list.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-world-coordinate`, `server-world-objects`
- **Inputs/Outputs**: In: command + player position + system state. Out: `scan_result` or `deep_scan_result` wire message.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `scan` on object within 500u returns resource composition / object details.
  2. `scan` on object >500u returns error event "Target out of scan range."
  3. `deep-scan` returns hyper-lane data; triggers system meta-generation if not yet generated.
- **Test scenarios**:
  1. Player at (0,0,0), asteroid at (400,0,0); `scan asteroid-1`; returns resource data.
  2. Player at (0,0,0), asteroid at (600,0,0); `scan`; error returned.
  3. `deep-scan` in starting system; returns list with ≥1 hyper-lane.

#### `server-cmd-drone` — Drone & Module Commands Handler
- **Description**: Handles `ptarget <target>` and `module <slot> <on/off>`. Validates ptarget type compatibility. Validates power budget on module activation.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-ship-power-budget`, `server-drone-target-validation`
- **Inputs/Outputs**: In: command + ship module state. Out: updated module state + `ship_status` update + `event` message.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `module 1 on` activates module slot 1 if power budget allows.
  2. `module 1 on` fails if ptarget is invalid type for that module.
  3. `ptarget` accepts any object in system; validation happens at drone activation.
- **Test scenarios**:
  1. Set ptarget to asteroid; activate starter drone; drone activates.
  2. Set ptarget to station; activate gun drone; gun drone fails (station not a ship).
  3. Activate module that exceeds power budget; rejection event sent.

#### `server-cmd-dock` — Dock/Undock Commands Handler
- **Description**: Handles `dock <station>` and `undock`. Validates distance ≤10u. Transitions player state to `docked`. While docked, sends `dock_state` message with station menu data.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-world-coordinate`, `server-economy-trade`
- **Inputs/Outputs**: In: command + player position + station data. Out: player docked state + `dock_state` wire message.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `dock <station>` when ≤10u sets player state to docked and sends `dock_state`.
  2. `dock` when >10u returns error "Too far to dock."
  3. `undock` returns player to space, sends `tick_update`.
- **Test scenarios**:
  1. Player at (5,0,0), station at (0,0,0); `dock station-1`; player docked.
  2. Player at (15,0,0); `dock station-1`; error event, no state change.
  3. Player docked; `undock`; player position = station position, mode = idle.

#### `server-cmd-info` — Info Commands Handler
- **Description**: Handles `look`, `status`, `help`, `chat`. `look` triggers immediate tick_update + ship_status. `status` sends detailed ship readout. `chat` broadcasts message to system chat channel.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-tick-broadcast`
- **Inputs/Outputs**: In: command. Out: appropriate wire messages.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `look` triggers immediate state update without waiting for next tick.
  2. `status` includes all module states and PU breakdown.
  3. `chat <msg>` broadcasts only to players in the same system.
- **Test scenarios**:
  1. `look`; player immediately receives `tick_update` and `ship_status`.
  2. `status`; response includes hull, shield, power, cargo, all module slots.
  3. Two players in different systems; player A chats; player B does not receive it.

#### `server-cmd-jump` — Jump Commands Handler
- **Description**: Handles `jtarget <system>` and `jump`. Validates jtarget is in deep-scan results. Validates fuel (H) sufficient for lane distance. Executes system transition: move player to target system, deduct fuel.
- **Owner**: server
- **Dependencies**: `server-cmd-parser`, `server-starchart-jump-fuel`, `server-procgen-meta`
- **Inputs/Outputs**: In: command + player star chart + cargo (fuel). Out: player teleported to new system + `event` messages.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. `jump` with sufficient H fuel teleports player to target system.
  2. `jump` with insufficient fuel returns error "Insufficient jump fuel."
  3. Player appears in new system at a spawn point; tick_update reflects new system.
- **Test scenarios**:
  1. Set jtarget to valid adjacent system; `jump` with enough fuel; player in new system.
  2. `jump` with 0 H; error event; player still in original system.
  3. Jump to ungenerated system triggers full system generation before arrival.

---

### System: resource

#### `server-resource-definitions` — Resource Type Definitions
- **Description**: Constants and types for the 4 MVP resources: H (Hydrogen, 5cr), He (Helium, 25cr), Li (Lithium, 15cr), B (Boron, 10cr). Includes harvest category (`gas`: H/He, `mineral`: Li/B).
- **Owner**: server
- **Dependencies**: none
- **Inputs/Outputs**: In: nothing. Out: `RESOURCES` constant map importable by game modules.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. All 4 resources have base value, name, harvest category defined.
  2. `getHarvestCategory(resourceType)` returns `gas` or `mineral` correctly.
  3. No magic strings for resource types in game code — all use constants.
- **Test scenarios**:
  1. `RESOURCES.H.baseValue` = 5.
  2. `getHarvestCategory('He')` = `'gas'`.
  3. `getHarvestCategory('Li')` = `'mineral'`.

#### `server-resource-harvest-tick` — Drone Harvest Extraction
- **Description**: On each drone-operations tick, if a harvest drone is active and within ≤20u of a resource object, extracts `yield` units from the object and adds to cargo. Starter drone yield = base yield × 0.5 (50% efficiency).
- **Owner**: server
- **Dependencies**: `server-resource-definitions`, `server-ship-cargo`, `server-world-coordinate`
- **Inputs/Outputs**: In: drone state + resource object + cargo. Out: updated cargo + updated resource object quantity.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Starter drone extracts H at 50% yield per tick.
  2. Resource object quantity decrements on each harvest tick (resource depletion design choice applied).
  3. Cargo full: extraction stops, event sent "Cargo bay full."
- **Test scenarios**:
  1. Starter drone on asteroid with 100H; per-tick extraction = configured base × 0.5.
  2. After enough ticks, asteroid H reaches 0; drone deactivates with event.
  3. Cargo at capacity; extraction attempt; cargo unchanged, event fired.

---

### System: drone

#### `server-drone-starter` — Starter Drone Module
- **Description**: Implementation of the omni-harvest Starter Drone: validates ptarget is a resource object (asteroid or gas cloud), delegates to harvest tick at 50% efficiency, draws 15 PU when active.
- **Owner**: server
- **Dependencies**: `server-resource-harvest-tick`, `server-ship-power-budget`
- **Inputs/Outputs**: In: ship module slot state + ptarget. Out: harvest execution or error.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Starter drone accepts both asteroid and gas cloud ptargets.
  2. Starter drone rejects ship/station/star ptargets with auto-deactivation event.
  3. Power draw of 15 PU registered in budget when active.
- **Test scenarios**:
  1. Set ptarget to asteroid; activate starter drone; harvesting begins.
  2. Set ptarget to pirate ship; activate starter drone; auto-deactivates, event sent.
  3. Deactivate starter drone; power budget frees 15 PU.

#### `server-drone-gun` — Gun Drone Module
- **Description**: Implementation of Gun Drone: validates ptarget is a ship, creates a `Projectile` entity toward ptarget every 2 ticks, consumes 1 bullet per shot. Draws 25 PU when active.
- **Owner**: server
- **Dependencies**: `server-combat-projectile`, `server-ship-cargo`, `server-ship-power-budget`
- **Inputs/Outputs**: In: ship position + ptarget position + bullet count. Out: new projectile entity, decremented ammo.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Gun drone fires at tick 1, tick 3, tick 5 (every 2 ticks).
  2. Each shot consumes 1 bullet from cargo; at 0 bullets, drone auto-deactivates.
  3. Gun drone rejects non-ship ptargets with auto-deactivation event.
- **Test scenarios**:
  1. Activate gun drone; 5 ticks pass; 3 projectiles created.
  2. Last bullet fired; drone deactivates, event "Out of ammunition."
  3. Set ptarget to asteroid; gun drone rejects with event.

#### `server-drone-target-validation` — Drone Target Type Validation
- **Description**: Given a drone module type and a ptarget object, returns whether the target is in the drone's `target_type[]` list. Called before drone activation and each tick.
- **Owner**: server
- **Dependencies**: `server-world-objects`, `server-resource-definitions`
- **Inputs/Outputs**: In: drone type + target object type. Out: `{valid: bool, reason?: string}`.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Harvest drones (starter, gas, mineral) reject ship targets.
  2. Combat drones (gun) reject non-ship targets.
  3. Returns human-readable reason for UI event message.
- **Test scenarios**:
  1. Starter drone + asteroid → valid.
  2. Gun drone + asteroid → invalid, reason = "Gun Drone can only target ships."
  3. Starter drone + pirate ship → invalid, reason = "Starter Drone can only target resource objects."

---

### System: combat

#### `server-combat-projectile` — Projectile Entity
- **Description**: Creates and tracks `Projectile` world objects: position, velocity vector (normalized toward target × 50 u/tick), source ship ID, target ship ID, damage value. Stored in Redis with system objects.
- **Owner**: server
- **Dependencies**: `server-world-objects`, `server-world-coordinate`
- **Inputs/Outputs**: In: source position + target position + damage. Out: `Projectile` entity added to system Redis state.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Projectile velocity always equals 50 units/tick in direction of target.
  2. Projectile created with correct source, target, and damage fields.
  3. Projectile appears in `tick_update` as a visible object to all players in system.
- **Test scenarios**:
  1. Create projectile from (0,0,0) toward (100,0,0); velocity = (50,0,0).
  2. Projectile in `tick_update`; client sees it as an object on radar.
  3. Two simultaneous shots create two independent projectile entities.

#### `server-combat-collision` — Hit Detection
- **Description**: Each combat tick phase, for each projectile, compute distance to its target ship. If ≤5 units, trigger damage application and mark projectile for removal.
- **Owner**: server
- **Dependencies**: `server-combat-projectile`, `server-world-coordinate`
- **Inputs/Outputs**: In: projectile list + ship positions. Out: `{hit: bool, targetId, damage}` for each projectile.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Hit triggers when distance ≤5 units.
  2. Near-miss (6 units) does not trigger hit.
  3. Projectile is removed from state on hit (not on next tick).
- **Test scenarios**:
  1. Projectile at (4.9, 0, 0), target at (0,0,0); distance = 4.9; hit triggered.
  2. Projectile at (5.1, 0, 0), target at (0,0,0); distance = 5.1; no hit.
  3. Hit detected; projectile removed from Redis same tick.

#### `server-combat-damage` — Damage Model
- **Description**: Applies incoming damage to a ship: shields absorb first. If shield HP > 0, damage reduces shield. Overflow damage carries to hull. `applyDamage(ship, amount)` → `{shieldDamage, hullDamage, shieldDestroyed, killed}`.
- **Owner**: server
- **Dependencies**: `server-ship-entity`
- **Inputs/Outputs**: In: ship HP state + damage amount. Out: updated HP state + damage report.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. 30 damage to ship with 50 shield: shield = 20, hull = 100.
  2. 60 damage to ship with 50 shield: shield = 0, hull = 90 (10 overflow).
  3. Damage exactly equal to shield + hull kills the ship.
- **Test scenarios**:
  1. 10 damage, shields at 50; result: shield=40, hull=100.
  2. 60 damage, shields at 50; result: shield=0, hull=90.
  3. 150 damage, shields=50, hull=100; result: killed=true.

#### `server-combat-death` — Death & Respawn
- **Description**: Handles ship destruction: sends `event` death message, removes ship from system Redis state, calculates 20% cargo loss (floor), moves player to home station system, restores HP to full, triggers `saveShip`.
- **Owner**: server
- **Dependencies**: `server-combat-damage`, `server-ship-cargo`, `server-ship-entity`, `server-persist-save`
- **Inputs/Outputs**: In: killed ship state. Out: respawned ship at home station + `event` messages + DB save.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. 20% of each cargo resource type removed (rounded down).
  2. Player's ship HP fully restored on respawn.
  3. Player appears in home station's system on next tick.
- **Test scenarios**:
  1. Die with 10H, 10He, 10Li, 10B; respawn with 8 of each (20% loss = 2).
  2. Die with 1 unit of a resource; respawn with 0 (floor(0.8) = 0).
  3. Die while in home station system; respawn at home station in same system.

---

### System: npc

#### `server-npc-pirate-spawn` — Pirate Spawn at System Generation
- **Description**: When a system is generated, spawns 0–N pirate NPC entities (count based on archetype: dangerous=3–5, resource-rich=1–2, barren=0, civilized=0–1). Each pirate has fixed speed, HP, gun drone, and patrol path.
- **Owner**: server
- **Dependencies**: `server-world-objects`, `server-procgen-system`
- **Inputs/Outputs**: In: system archetype + object list. Out: pirate NPC entities added to system.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Dangerous system generates 3–5 pirates.
  2. Starting system generates 0 pirates.
  3. Each pirate has `hull_hp`, `shield_hp`, `speed`, and a `patrol_path` array of waypoints.
- **Test scenarios**:
  1. Generate dangerous system; pirate count in range 3–5.
  2. Generate barren system; pirate count = 0.
  3. Pirate entity has all required fields; no undefined properties.

#### `server-npc-pirate-ai` — Pirate AI (Aggro & Pursuit)
- **Description**: Each NPC tick: check if any player ship is within 100u of this pirate. If yes, enter pursuit mode (set movement target to player). If pursuing player moves >150u away, return to patrol. Move toward movement target at pirate speed.
- **Owner**: server
- **Dependencies**: `server-npc-pirate-spawn`, `server-world-coordinate`, `server-tick-npc`
- **Inputs/Outputs**: In: pirate state + all player positions in system. Out: updated pirate position + aggro state.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Pirate aggros player within 100u within 1 tick.
  2. Pirate uses gun drone against player when within combat range (100u).
  3. Pirate loses aggro and returns to patrol when player is >150u away.
- **Test scenarios**:
  1. Player enters 90u; next tick pirate moves toward player.
  2. Pirate within 100u of player; pirate fires projectile.
  3. Player flees to 160u; pirate stops pursuit, resumes patrol.

#### `server-npc-pirate-loot` — Pirate Loot Drop & Respawn
- **Description**: On pirate death, creates a loot container object in the system with a random bundle of resources (1–3 resource types, small quantities). Sets respawn timer (configurable, default 300 ticks = ~15 min). On timer expiry, recreates pirate at original spawn point.
- **Owner**: server
- **Dependencies**: `server-npc-pirate-spawn`, `server-resource-definitions`
- **Inputs/Outputs**: In: dead pirate entity. Out: loot container object + respawn timer in Redis.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Loot container appears at pirate's death location.
  2. Players can `scan` loot container and `harvest` from it with a drone.
  3. Pirate respawns at original spawn point after configured ticks.
- **Test scenarios**:
  1. Kill pirate; loot container in system state with resource payload.
  2. Harvest loot container with drone; resources added to cargo.
  3. After 300 ticks, pirate reappears at original position.

---

### System: economy

#### `server-economy-trade` — Station Trade (Buy/Sell)
- **Description**: Processes `trade` dock menu actions. Sell: removes resources from cargo at 80% base value, credits player. Buy fuel/ammo: deducts credits at 120% base value, adds to cargo. Validates quantities.
- **Owner**: server
- **Dependencies**: `server-cmd-dock`, `server-ship-cargo`, `server-resource-definitions`
- **Inputs/Outputs**: In: trade request (type, resource, quantity) + ship state. Out: updated cargo + credits + `dock_state` refresh.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Sell 10H: player receives `floor(10 × 5 × 0.8)` = 40 credits.
  2. Buy 10 fuel: costs `ceil(10 × 5 × 1.2)` = 60 credits; rejected if insufficient credits.
  3. Sell more than held quantity returns error.
- **Test scenarios**:
  1. Sell 5 He (base 25cr each); receive 100 credits (5×25×0.8=100).
  2. Buy 10 ammo with insufficient credits; error event; no cargo/credit change.
  3. Sell 0 quantity; error event.

#### `server-economy-repair` — Hull Repair
- **Description**: Dock menu repair action: computes repair cost = `(maxHull - currentHull) × 2` credits. Deducts credits, restores hull to max. Rejects if insufficient credits.
- **Owner**: server
- **Dependencies**: `server-cmd-dock`, `server-ship-entity`
- **Inputs/Outputs**: In: ship hull state + credits. Out: updated hull HP + credits.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Repair at 50% hull (50/100 HP): costs 100 credits.
  2. Full hull: repair option shows "No repairs needed."
  3. Insufficient credits: repair rejected with cost shown.
- **Test scenarios**:
  1. Hull = 50, credits = 200; repair; hull = 100, credits = 100.
  2. Hull = 100; repair request; error "No repairs needed."
  3. Hull = 50, credits = 50; repair costs 100; rejected.

#### `server-economy-upgrade` — Module Upgrade
- **Description**: Dock menu upgrade action: validates player has required credits + resource costs for a module tier upgrade (Mk I → Mk II). Deducts resources + credits, updates module tier in DB.
- **Owner**: server
- **Dependencies**: `server-cmd-dock`, `server-ship-entity`, `server-ship-cargo`, `server-resource-definitions`
- **Inputs/Outputs**: In: upgrade request (slot, target_tier) + ship state. Out: upgraded module + updated cargo + credits.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Upgrade succeeds only while docked.
  2. Upgrade deducts correct resource quantities and credits from ship.
  3. After upgrade, module tier reflected in `ship_status` and persisted.
- **Test scenarios**:
  1. Upgrade Starter Drone (has resources + credits); tier becomes Mk II.
  2. Upgrade without required resources; rejected with itemized list of missing items.
  3. Upgrade while undocked; error "Must be docked to upgrade."

---

### System: persist

#### `server-persist-save` — Auto-Save on Disconnect
- **Description**: On WebSocket close event, triggers `saveShip(ship)` for the disconnecting player. Also saves star chart updates. Logs save completion or failure.
- **Owner**: server
- **Dependencies**: `server-ship-entity`, `server-auth-ws-handshake`
- **Inputs/Outputs**: In: disconnect event + player ship state. Out: DB save.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Disconnect mid-session persists current position, HP, credits, cargo.
  2. Save failure logs an error but does not crash the server.
  3. Save completes within 500ms of disconnect.
- **Test scenarios**:
  1. Connect, harvest 50H, disconnect; reconnect; cargo shows 50H.
  2. Simulate DB failure during save; server continues running for other players.
  3. Multiple players disconnect simultaneously; all saves complete independently.

#### `server-persist-load` — Load Ship on Connect
- **Description**: On successful auth handshake, loads the player's ship from DB. If no ship exists (new account), creates starter ship. Adds ship to Redis world state in their current system.
- **Owner**: server
- **Dependencies**: `server-auth-ws-handshake`, `server-ship-entity`, `server-world-redis-state`
- **Inputs/Outputs**: In: accountId. Out: ship loaded into Redis + added to connection map.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Returning player's ship state matches last saved state.
  2. New player receives fresh starter ship in starting system.
  3. Player added to system Redis state so they receive tick_updates.
- **Test scenarios**:
  1. New account connects; starter ship created with default stats.
  2. Returning player connects; position, cargo, credits match last session.
  3. Player in a non-starting system reconnects; appears in correct system.

---

### System: procgen

#### `server-procgen-meta` — Hyper-Lane Metadata Generation
- **Description**: When `deep-scan` is executed in a system that has no generated hyper-lane data, generates 1–5 adjacent system entries with distances. Known systems use their stored names; new systems get placeholder IDs.
- **Owner**: server
- **Dependencies**: `server-db-systems`, `server-world-coordinate`
- **Inputs/Outputs**: In: current system ID. Out: `deep_scan_result` wire message + hyper-lane data persisted to DB.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Generates 1–5 hyper-lanes with realistic distances.
  2. Previously visited systems show known name; unvisited show "Unknown System #N".
  3. Generated hyper-lane data persisted so repeated deep-scans return same results.
- **Test scenarios**:
  1. Deep-scan starting system; result has 2–3 hyper-lanes.
  2. Deep-scan same system twice; identical results.
  3. Deep-scan after visiting adjacent system; that system shows its name.

#### `server-procgen-system` — Full System Generation on Jump
- **Description**: When a player jumps to a system with no generated state, generates a full system: chooses archetype (weighted random), places objects (star, planets, asteroids, gas clouds, optionally stations), spawns NPCs, persists to DB + Redis.
- **Owner**: server
- **Dependencies**: `server-procgen-meta`, `server-world-objects`, `server-npc-pirate-spawn`, `server-db-systems`
- **Inputs/Outputs**: In: system ID + hyper-lane metadata. Out: complete system in DB + Redis.
- **Estimated complexity**: XL
- **Acceptance criteria**:
  1. Generated system has 10–50 objects including at least 1 harvestable resource.
  2. Archetype probabilities match: resource-rich/dangerous systems have appropriate NPC/resource counts.
  3. System generation completes before player arrival (synchronous in jump handler, or player waits ≤1 tick).
- **Test scenarios**:
  1. Generate 10 systems; every system has ≥1 asteroid or gas cloud.
  2. Generate dangerous system 5 times; always has 3–5 pirates.
  3. Generate civilized system; has ≥1 trade station; pirate count = 0–1.

#### `server-procgen-rules` — Generation Rule Enforcement
- **Description**: Post-generation validation pass: ensures every system has ≥1 hyper-lane out (no dead ends) and ≥1 harvestable object. Adds missing elements if rules are violated.
- **Owner**: server
- **Dependencies**: `server-procgen-system`
- **Inputs/Outputs**: In: generated system state. Out: rule-compliant system state.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. No generated system ever has 0 hyper-lanes.
  2. No generated system ever has 0 harvestable objects.
  3. Rule enforcement is logged when it fires (for balancing visibility).
- **Test scenarios**:
  1. Mock generator producing 0 hyper-lanes; rule enforcer adds 1.
  2. Mock generator producing 0 asteroids/gas clouds; enforcer adds 1 asteroid.
  3. Normal system generation never triggers rule enforcement (rules are edge-case safety).

---

### System: starchart

#### `server-starchart-track` — Personal Star Chart Tracker
- **Description**: Records systems a player has visited and objects they've scanned. `recordVisit(playerId, systemId)`, `recordScan(playerId, objectId)`. Used by `deep-scan` to label known vs. unknown systems.
- **Owner**: server
- **Dependencies**: `server-db-starchart`, `server-cmd-scan`
- **Inputs/Outputs**: In: player action events. Out: updated `player_starchart` DB rows.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Visiting a new system creates a chart entry.
  2. Scanning an object adds its ID to `scanned_objects` for that system.
  3. Star chart is per-player; one player's scans don't affect another's chart.
- **Test scenarios**:
  1. Visit system; chart entry exists with `visited_at` timestamp.
  2. Scan 3 objects; `scanned_objects` contains all 3 IDs.
  3. Two players in same system; each scans different objects; charts differ.

#### `server-starchart-jump-fuel` — Jump Fuel System
- **Description**: Calculates jump fuel cost = `hyper-lane distance × fuel_rate_constant` (H units). Validates player has sufficient H in cargo before allowing jump. Deducts H on jump.
- **Owner**: server
- **Dependencies**: `server-ship-cargo`, `server-resource-definitions`, `server-cmd-jump`
- **Inputs/Outputs**: In: hyper-lane distance + ship cargo. Out: fuel cost validation + cargo deduction.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Fuel cost formula is deterministic given distance.
  2. Insufficient H returns error with exact shortfall shown.
  3. Fuel deducted atomically with system transition (no deduct-then-crash).
- **Test scenarios**:
  1. Jump distance 10, rate 2 H/unit; cost = 20H. Player with 25H: jumps, has 5H left.
  2. Player with 15H for 20H jump; error "Need 20H, have 15H."
  3. Deduct fuel and crash simulation; on reconnect fuel was not deducted (idempotent).

---

## Workstream: CLIENT

### System: layout

#### `client-layout-scaffold` — Rust Client Project Scaffold
- **Description**: Initialize `spacemud-client` Rust project with ratatui, crossterm, tungstenite, serde, serde_json dependencies. Entry point runs TUI loop with clean terminal restore on exit/panic.
- **Owner**: client
- **Dependencies**: none
- **Inputs/Outputs**: In: nothing. Out: `cargo run` launches blank terminal and exits cleanly with `q`.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `cargo build --release` succeeds with no warnings.
  2. Terminal is fully restored on exit (no broken state).
  3. Panic hook restores terminal before printing panic message.
- **Test scenarios**:
  1. `cargo run`; blank terminal; press `q`; terminal restored.
  2. Force panic; terminal restored; panic message readable.
  3. `cargo clippy` passes with no warnings.

#### `client-layout-panels` — 4-Panel TUI Layout
- **Description**: Divides terminal into 4 regions using ratatui constraints: radar panel (top-left, largest), ship status panel (top-right), chat/events feed (bottom-left), command input bar (bottom). Renders placeholder text in each.
- **Owner**: client
- **Dependencies**: `client-layout-scaffold`
- **Inputs/Outputs**: In: terminal size. Out: 4 bordered panels rendered on screen.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. All 4 panels visible at terminal width ≥80, height ≥24.
  2. Panels have distinct borders and labels (RADAR, STATUS, EVENTS, CMD).
  3. Layout does not crash on minimum terminal size (80×24).
- **Test scenarios**:
  1. Render at 80×24; all 4 panels fit without overlap.
  2. Resize to 120×40; panels scale proportionally.
  3. Render with placeholder text in each panel; no rendering artifacts.

#### `client-layout-resize` — Terminal Resize Handling
- **Description**: Listens for terminal resize events (crossterm `Event::Resize`) and triggers a redraw with updated dimensions. No layout state corruption on resize.
- **Owner**: client
- **Dependencies**: `client-layout-panels`
- **Inputs/Outputs**: In: resize event. Out: full redraw at new dimensions.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Dragging terminal window triggers redraw within 100ms.
  2. No visual artifacts after resize.
  3. Resize to smaller than 80×24 shows graceful "Terminal too small" message.
- **Test scenarios**:
  1. Resize from 120×40 to 80×24; layout correct at new size.
  2. Rapid resize events; no crash or flicker loop.
  3. Resize below minimum; warning message; resize back up; normal layout resumes.

---

### System: conn

#### `client-conn-ws` — WebSocket Client
- **Description**: Establishes a tungstenite WebSocket connection to the server URL (from config/env). Runs message receive loop in a background thread. Exposes `send(msg)` and `recv_channel` to the main TUI thread.
- **Owner**: client
- **Dependencies**: `client-layout-scaffold`, `shared-wire-rs-types`
- **Inputs/Outputs**: In: server URL. Out: message channel (server → client), send function (client → server).
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Connects to server WebSocket endpoint without blocking TUI thread.
  2. Received messages appear on channel within 100ms of server send.
  3. Connection failure shows error in status panel, not a crash.
- **Test scenarios**:
  1. Start client with server running; connection established; no TUI freeze.
  2. Start client with server down; error displayed; client stays alive for retry.
  3. Send a message from TUI; server receives it within 100ms.

#### `client-conn-auth` — Auth Handshake (Client Side)
- **Description**: On WebSocket connect, sends `{type: "auth", token: "<jwt>"}`. JWT loaded from local config file or prompted on first run. On `auth_ok`, transition app state to `connected`. On auth failure, show error.
- **Owner**: client
- **Dependencies**: `client-conn-ws`, `shared-wire-rs-types`
- **Inputs/Outputs**: In: stored JWT (file or env). Out: `auth_ok` → connected state; `auth_fail` → error state.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. On first run with no config, client prompts for server URL + credentials.
  2. On subsequent runs, loads JWT from `~/.spacemud/config.toml`.
  3. Auth failure message displayed in events panel; client does not crash.
- **Test scenarios**:
  1. Valid JWT in config; connect; `auth_ok` received; HUD transitions to active.
  2. Expired JWT; connect; error displayed; client remains open.
  3. Missing config; client prompts for credentials interactively.

#### `client-conn-reconnect` — Reconnect Logic
- **Description**: On connection drop, displays "Disconnected — reconnecting..." in status panel. Attempts reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s). Re-sends auth on reconnect.
- **Owner**: client
- **Dependencies**: `client-conn-auth`
- **Inputs/Outputs**: In: connection drop event. Out: reconnection attempts + status messages.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. After disconnect, client automatically retries without user action.
  2. Status panel shows "Reconnecting (attempt N)..." during backoff.
  3. Successful reconnect resumes normal HUD without user action.
- **Test scenarios**:
  1. Server drops connection; client retries within 1s; status updated.
  2. Server offline for 3 attempts; delays increase (1s, 2s, 4s).
  3. Server comes back; client reconnects; HUD returns to live state.

#### `client-conn-deserialize` — JSON → Rust Struct Deserializer
- **Description**: Parses raw WebSocket text frames into typed `ServerMessage` enum (tick_update, ship_status, scan_result, etc.) using serde_json. Unknown message types log a warning and are discarded.
- **Owner**: client
- **Dependencies**: `shared-wire-rs-types`, `client-conn-ws`
- **Inputs/Outputs**: In: raw JSON string. Out: `ServerMessage` enum variant.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Valid `tick_update` JSON deserializes to correct Rust struct.
  2. Unknown message type logs warning, does not panic.
  3. Malformed JSON logs error with raw text snippet, does not panic.
- **Test scenarios**:
  1. Deserialize valid `ship_status` JSON; all fields populated correctly.
  2. Deserialize JSON with unknown `type` field; warning logged; no crash.
  3. Deserialize `{broken json`; error logged; no crash.

---

### System: hud

#### `client-hud-radar` — Radar Panel Renderer
- **Description**: Renders the radar panel: star at center of panel, all system objects as ASCII symbols (★ star, ● planet, · asteroid, ~ gas cloud, ▲ station, ◉ player, × NPC ship), scaled to panel dimensions. Distances annotated on hover/select.
- **Owner**: client
- **Dependencies**: `client-layout-panels`, `client-conn-deserialize`
- **Inputs/Outputs**: In: `tick_update` object list with positions. Out: radar panel render.
- **Estimated complexity**: L
- **Acceptance criteria**:
  1. Star always rendered at panel center.
  2. Objects scaled to fit panel (max coordinate → panel edge).
  3. Player ship rendered distinctly from NPCs (different symbol).
  4. Unscanned objects show as "?" until scan reveals type.
- **Test scenarios**:
  1. 5 objects at varying distances; all rendered within panel bounds.
  2. Player at (200,0,0), star at (0,0,0); player rendered right of center.
  3. Object with `scanned=false`; shown as `?` symbol.

#### `client-hud-status` — Ship Status Panel Renderer
- **Description**: Renders ship status: hull HP bar, shield HP bar, power budget bar (PU used/total), cargo used/capacity, module list with active/inactive state and PU draw per slot.
- **Owner**: client
- **Dependencies**: `client-layout-panels`, `client-conn-deserialize`
- **Inputs/Outputs**: In: `ship_status` message. Out: status panel render.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Hull and shield shown as colored progress bars (green→yellow→red).
  2. Each module slot shows name, tier, active status, PU draw.
  3. Power bar turns red when draw ≥ 90% of capacity.
- **Test scenarios**:
  1. Hull at 50%; bar shows half-filled correctly.
  2. 4 module slots displayed with correct active states.
  3. Power at 95/100 PU; bar rendered red.

#### `client-hud-chat` — Chat & Events Feed
- **Description**: Renders scrolling chat/event feed: chat messages prefixed with player name, game events (combat hits, drone events, death) prefixed with `[!]`. Scrollable with PgUp/PgDn.
- **Owner**: client
- **Dependencies**: `client-layout-panels`, `client-conn-deserialize`
- **Inputs/Outputs**: In: `chat_message` and `event` wire messages. Out: feed panel render.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. New messages appear at bottom; old messages scroll up.
  2. `[!]` event messages visually distinct from chat (different color).
  3. Feed retains last 100 messages in memory.
- **Test scenarios**:
  1. Receive 5 chat messages; all appear in order.
  2. Receive event message; `[!]` prefix shown in distinct color.
  3. Receive 150 messages; only last 100 retained; no memory leak.

#### `client-hud-events` — Combat Event Display
- **Description**: Short-lived event notifications overlaid or appended to the chat feed for time-sensitive events: "You hit Pirate for 10 damage", "Shields down!", "Cargo full." Fades after 3 ticks if overlay, or stays in feed.
- **Owner**: client
- **Dependencies**: `client-hud-chat`, `client-conn-deserialize`
- **Inputs/Outputs**: In: `event` wire messages. Out: highlighted event lines in feed.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Combat events appear immediately on the tick they occur.
  2. Death event displayed prominently ("You were destroyed!").
  3. Cargo full event shown when drone extraction blocked.
- **Test scenarios**:
  1. Server sends combat event; client renders it in ≤1 render frame.
  2. Death event triggers special styling (bold/red).
  3. Multiple events in one tick all displayed without truncation.

---

### System: input

#### `client-input-readline` — Command Input Bar
- **Description**: Single-line command input bar at bottom of screen. Supports left/right cursor movement, backspace/delete, up/down arrow for command history (last 50 commands). Enter submits.
- **Owner**: client
- **Dependencies**: `client-layout-panels`
- **Inputs/Outputs**: In: keyboard events. Out: submitted command strings.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Typing characters appends to input buffer and renders in input bar.
  2. Up arrow cycles through command history.
  3. Enter submits command and clears input bar.
- **Test scenarios**:
  1. Type "scan asteroid-1"; Enter; command string sent; input bar clears.
  2. Submit 3 commands; up arrow cycles through all 3 in order.
  3. Backspace removes last character correctly.

#### `client-input-dispatch` — Command Sender
- **Description**: Takes submitted command string, wraps in `{type: "command", payload: "<string>"}` wire message, sends over WebSocket. Provides local feedback in event feed for common user errors (no connection, etc.).
- **Owner**: client
- **Dependencies**: `client-input-readline`, `client-conn-ws`, `shared-wire-rs-types`
- **Inputs/Outputs**: In: submitted command string. Out: JSON sent to server over WebSocket.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Command sent as valid wire `command` message.
  2. If disconnected, shows "Not connected" in events feed instead of panicking.
  3. Empty command string not sent to server.
- **Test scenarios**:
  1. Submit "look"; server receives `{type:"command", payload:"look"}`.
  2. Submit command while disconnected; events feed shows error; no crash.
  3. Submit empty string; nothing sent.

---

### System: dock

#### `client-dock-menu` — Dock Menu UI
- **Description**: When `dock_state` message received, replaces radar panel with dock menu UI. Shows station name, menu options numbered 1–5. Pressing number keys navigates sub-menus. `5` or `undock` command returns to space.
- **Owner**: client
- **Dependencies**: `client-layout-panels`, `client-conn-deserialize`
- **Inputs/Outputs**: In: `dock_state` wire message. Out: dock menu rendered in radar panel area.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Dock menu replaces radar panel on `dock_state` receipt.
  2. Menu shows station name in header.
  3. Number key navigation works for all 5 top-level menu items.
- **Test scenarios**:
  1. Receive `dock_state`; radar panel replaced by dock menu.
  2. Press `1` (Trade); trade sub-menu renders.
  3. `undock` command sent; dock menu replaced by radar panel.

#### `client-dock-trade` — Trade Sub-Menu
- **Description**: Shows buy and sell options with current prices, player cargo quantities, and credit balance. Player types quantity and confirms. Sends `command` to server for processing. Updates on `dock_state` refresh.
- **Owner**: client
- **Dependencies**: `client-dock-menu`
- **Inputs/Outputs**: In: `dock_state` with inventory/prices. Out: command strings sent to server.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Sell menu shows all cargo resources with quantities and sell prices.
  2. Buy menu shows fuel and ammo with costs per unit and player credit balance.
  3. Server response (updated `dock_state`) refreshes displayed values.
- **Test scenarios**:
  1. Player has 50H; sell menu shows 50H at 4cr each (80% of 5).
  2. Buy 20 fuel; server accepts; `dock_state` updates showing new cargo.
  3. Try to sell more than held; server rejects; error shown in events feed.

#### `client-dock-repair` — Repair Screen
- **Description**: Shows current hull HP, max hull HP, repair cost, and credit balance. Confirm button sends repair command. Server response updates values.
- **Owner**: client
- **Dependencies**: `client-dock-menu`
- **Inputs/Outputs**: In: `dock_state` hull/credits data. Out: repair command.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Repair cost shown before confirmation.
  2. At full hull, shows "Hull at full integrity."
  3. After repair, hull bar in status panel updates on next `ship_status`.
- **Test scenarios**:
  1. Hull at 60/100; repair screen shows cost 80cr; confirm; hull = 100.
  2. Hull at 100/100; repair screen shows "No repairs needed."
  3. Insufficient credits for repair; server rejects; message shown.

#### `client-dock-upgrade` — Module Upgrade Screen
- **Description**: Lists upgradeable module slots with current tier, next tier stats, and required credits/resources. Shows what player has vs. what's needed. Confirm sends upgrade command.
- **Owner**: client
- **Dependencies**: `client-dock-menu`
- **Inputs/Outputs**: In: `dock_state` module + cargo data. Out: upgrade command.
- **Estimated complexity**: M
- **Acceptance criteria**:
  1. Each upgradeable slot shows current tier, next tier, cost breakdown.
  2. Missing resources displayed in red with quantity deficit.
  3. After upgrade, slot tier reflects Mk II in status panel.
- **Test scenarios**:
  1. Starter Drone Mk I upgradeable with 50Li + 200cr; confirm; drone becomes Mk II.
  2. Missing resources; cost shows red "Li: 30/50"; confirm blocked.
  3. Max-tier module shows "Max tier reached."

---

### System: explore

#### `client-explore-starchart` — Star Chart Display
- **Description**: Renders player's personal star chart as a simple graph/list: known systems with names, connection lines (hyper-lanes), current system highlighted. Accessible via `chart` command or dock menu.
- **Owner**: client
- **Dependencies**: `client-layout-panels`, `client-conn-deserialize`
- **Inputs/Outputs**: In: star chart data from server (sent on connect/update). Out: chart panel render.
- **Estimated complexity**: L
- **Acceptance criteria**:
  1. Current system highlighted distinctly.
  2. Known systems show name; unknown show "Unknown #N".
  3. Hyper-lane connections shown as lines or arrows between nodes.
- **Test scenarios**:
  1. One visited system; chart shows single node (starting system, highlighted).
  2. After jump; new system added; hyper-lane line connects them.
  3. Unknown system shows "Unknown #N" not "null" or empty.

---

## Workstream: DESIGN SPIKES (Sprint 1)

#### `design-spike-unit-scale` — Resolve Unit Scale
- **Description**: Determine what 1 coordinate unit represents and total system diameter. Target: crossing a system in ~5 min at mid-power thrusters. Set placeholder values, document tuning plan.
- **Owner**: shared
- **Dependencies**: `server-ship-thruster-scaling`
- **Inputs/Outputs**: In: desired session pacing. Out: unit scale constants committed to shared constants file.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Unit scale constant defined and used by movement system.
  2. Calculation documented: "system radius = X units; starter speed = Y u/tick; crossing time = Z min."
  3. Value is tunable via config, not hardcoded.
- **Test scenarios**:
  1. At 100% thrusters, starter ship crosses system in 4–8 minutes (within target band).
  2. Scan range (500u) covers approximately half a system at chosen scale.
  3. Combat range (100u) is meaningfully smaller than scan range.

#### `design-spike-resource-depletion` — Resolve Resource Depletion
- **Description**: Decide: asteroids/gas clouds deplete (finite qty) or are infinite. Chosen: finite with slow depletion and a respawn timer. Document respawn rate and initial quantities.
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design discussion. Out: depletion config constants.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Resource object initial quantities defined per type and archetype.
  2. Respawn timer set (e.g. 200 ticks = ~10 min) and used by resource system.
  3. Design rationale documented in `docs/design-decisions.md`.
- **Test scenarios**:
  1. Harvest asteroid to 0; resource quantity = 0, drone deactivates.
  2. After respawn timer; asteroid quantity restored to initial value.
  3. Gas cloud and asteroid respawn rates independently configurable.

#### `design-spike-offline-persistence` — Resolve Offline Persistence
- **Description**: Decide: drones pause on disconnect (simpler) or continue (complex). Chosen: pause. Document behavior and edge cases (death-while-offline is impossible; no cargo-while-offline).
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design discussion. Out: behavior constant + documented edge cases.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. `DRONES_PAUSE_ON_DISCONNECT = true` constant used by tick system.
  2. Reconnecting player's drones are in inactive state.
  3. No game state changes for a disconnected player's ship between sessions.
- **Test scenarios**:
  1. Disconnect with active drone; reconnect; drone inactive.
  2. Other players in system proceed normally while player offline.
  3. Player's ship removed from active system state on disconnect (invisible while offline).

#### `design-spike-station-inventory` — Resolve Station Inventory
- **Description**: Decide: infinite fuel/ammo stock or limited. Chosen: infinite for MVP. Document rationale. Note that limited stock is a post-MVP option once player count grows.
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design discussion. Out: `STATION_INVENTORY_INFINITE = true` constant.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Station buy menu always has fuel and ammo available.
  2. Design decision documented in `docs/design-decisions.md`.
  3. Inventory model does not create per-station stock rows in MVP (simplification noted).
- **Test scenarios**:
  1. Buy 1000 fuel; succeeds (infinite stock).
  2. Station buy prices consistent between sessions.
  3. No "out of stock" error ever fires in MVP.

#### `design-spike-pirate-scaling` — Resolve Pirate Scaling
- **Description**: Decide: uniform pirate difficulty or scaled by hop-distance from starting system. Chosen: uniform for MVP with one configurable stat tier. Document scaling approach for post-MVP.
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design discussion. Out: pirate stat constants.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Pirate stats (HP, speed, damage) defined as single-tier constants.
  2. Config structure supports future tier-scaling (e.g. `PIRATE_TIERS[1]` MVP only).
  3. Design rationale documented.
- **Test scenarios**:
  1. Pirate in system 1 hop out has identical stats to pirate in starting system.
  2. Starter ship can kill a pirate in ~10 shots (about 30–60 seconds of combat).
  3. Pirate can kill starter ship in ~15 shots (combat is survivable with skill).

#### `design-spike-home-station` — Resolve Home Station Rules
- **Description**: Decide: one active home station per player (simplest, chosen). Document: `Set Home Station` replaces previous. Starting home station = starting system trade station. Death always respawns there.
- **Owner**: shared
- **Dependencies**: none
- **Inputs/Outputs**: In: design discussion. Out: `home_station_id` field on ship + behavior doc.
- **Estimated complexity**: S
- **Acceptance criteria**:
  1. Each ship has exactly one `home_station_id`.
  2. New players start with starting system's trade station as home.
  3. `Set Home Station` while docked updates `home_station_id`.
- **Test scenarios**:
  1. New player; home station = starting system station.
  2. Dock at new station; set home; die; respawn at new station.
  3. Can only set home while docked at a station with `HAS_TRADE=true`.

---

# Deliverable 2: Dependency-Ordered Roadmap

## Critical Path

The minimum-duration chain (each depends on the previous):

```
shared-wire-schema
  → server-infra-scaffold / client-layout-scaffold (parallel)
    → server-auth-ws-handshake
      → server-tick-loop
        → server-tick-broadcast
          → server-world-starting-system
            → server-ship-entity
              → server-ship-movement
                → server-tick-movement
                  → server-cmd-movement
                    → server-drone-starter
                      → server-resource-harvest-tick
                        → server-economy-trade
                          → server-persist-save
                            → server-combat-projectile
                              → server-combat-death
                                → server-npc-pirate-ai
                                  → server-procgen-system
                                    → server-starchart-jump-fuel
                                      → Phase 4 polish
```

**Minimum project duration: ~18 dev-weeks** (per critical path). Parallel server+client work brings the wall-clock timeline to ~20 weeks.

---

## Phase 0 — Foundation

### Milestone 0.1: Scaffolding + Wire Protocol
**Demo:** Both repos exist, build successfully, and agree on a shared wire protocol document.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `design-spike-unit-scale`, `design-spike-resource-depletion`, `design-spike-offline-persistence`, `design-spike-station-inventory`, `design-spike-pirate-scaling`, `design-spike-home-station` | shared | 1 |
| `shared-wire-schema`, `shared-wire-ts-types`, `shared-wire-rs-types` | shared | 2 |
| `server-infra-scaffold`, `server-infra-postgres`, `server-infra-redis` | server | 2 |
| `client-layout-scaffold`, `client-layout-panels`, `client-layout-resize` | client | 2 |

**Risk flags:** Wire protocol needs sign-off from both devs before any other work starts — any change after Sprint 1 is a coordination cost.

### Milestone 0.2: Auth + Connection Lifecycle
**Demo:** Client connects, authenticates, and the server tracks the session. Disconnect saves nothing yet.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-db-accounts`, `server-db-ships`, `server-db-systems`, `server-db-economy`, `server-db-starchart` | server | 2 |
| `server-auth-register`, `server-auth-login`, `server-auth-ws-handshake` | server | 2 |
| `client-conn-ws`, `client-conn-auth`, `client-conn-reconnect`, `client-conn-deserialize` | client | 3 |

**Risk flags:** JWT flow across two separate repos needs careful integration testing.

### Milestone 0.3: Tick Loop + Empty State Broadcast
**Demo:** Client connects, authenticates, and receives empty `tick_update` messages every 3 seconds. HUD shows "no objects."

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-tick-loop`, `server-tick-broadcast` | server | 2 |
| `server-persist-load` (stub — create new ship only) | server | 1 |
| `client-hud-radar` (empty), `client-hud-status` (empty), `client-hud-chat`, `client-hud-events` | client | 2 |
| `client-input-readline`, `client-input-dispatch` | client | 2 |

**Risk flags:** Threading model in Rust client (TUI thread + WebSocket thread) needs to be established cleanly here.

---

## Phase 1 — Core Loop MVP

### Milestone 1.1: World State + Ship Entity
**Demo:** Developer can see the starting system in the radar HUD with real objects. Ship status panel shows starter ship stats.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-world-coordinate`, `server-world-objects`, `server-world-redis-state` | server | 2 |
| `server-world-starting-system` | server | 2 |
| `server-ship-entity`, `server-ship-power-budget`, `server-ship-cargo` | server | 2 |
| `server-resource-definitions` | server | 0.5 |
| `server-persist-load` (full — load saved ship) | server | 1 |
| `client-hud-radar` (real data), `client-hud-status` (real data) | client | 2 |

**Risk flags:** 3D coordinate scaling (unit scale spike must be resolved first). Redis state serialization round-trip correctness.

### Milestone 1.2: Movement Commands
**Demo:** Developer can type `ntarget`, `approach`, `orbit`, `thrusters`, `stop` and see the ship move on the radar HUD.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-cmd-parser`, `server-cmd-info`, `server-cmd-movement` | server | 2 |
| `server-ship-movement`, `server-ship-thruster-scaling` | server | 2 |
| `server-tick-movement` | server | 2 |
| `server-cmd-scan` | server | 1 |

**Risk flags:** Orbit math — maintaining exact distance requires tuning. Approach auto-stop at distance threshold needs testing.

### Milestone 1.3: Harvesting + Cargo
**Demo:** Developer flies to an asteroid, deploys the Starter Drone, and watches H/He/Li/B accumulate in the cargo panel.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-drone-starter`, `server-drone-target-validation` | server | 2 |
| `server-resource-harvest-tick` | server | 2 |
| `server-tick-drones` (harvest only) | server | 1 |
| `server-cmd-drone` | server | 1 |

**Risk flags:** 50% efficiency math; resource depletion design choice must be implemented here.

### Milestone 1.4: Economy + Docking
**Demo:** Developer docks at the trade station, sells resources, buys fuel, repairs hull, and upgrades a module. Credits update correctly.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-economy-trade`, `server-economy-repair`, `server-economy-upgrade` | server | 3 |
| `server-cmd-dock` | server | 1 |
| `client-dock-menu`, `client-dock-trade`, `client-dock-repair`, `client-dock-upgrade` | client | 4 |

**Risk flags:** Dock menu state machine on client side (radar ↔ dock view swap). Credit atomicity on transactions.

### Milestone 1.5: Persistence + Session Save/Load
**Demo:** Developer disconnects and reconnects; ship position, cargo, credits, and module states are fully restored.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-persist-save` | server | 1 |
| Full `server-persist-load` (all fields) | server | 1 |

**Risk flags:** Race condition between disconnect event and save completion.

---

## Phase 2 — Combat & Danger

### Milestone 2.1: Combat System
**Demo:** Two developer instances can shoot each other. Projectiles visible on radar. Shields absorb damage before hull. Death respawns at home station with 20% cargo loss.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-combat-projectile`, `server-combat-collision`, `server-combat-damage`, `server-combat-death` | server | 4 |
| `server-drone-gun` | server | 2 |
| `server-tick-combat` | server | 1 |

**Risk flags:** Friendly fire edge cases. Bullet despawn on miss (need max range or TTL). Death during docked state.

### Milestone 2.2: Pirates
**Demo:** Dangerous/resource-rich systems have pirates that aggro, pursue, shoot, and drop loot on death. Pirates respawn.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-npc-pirate-spawn` | server | 1 |
| `server-npc-pirate-ai` | server | 2 |
| `server-npc-pirate-loot` | server | 1 |
| `server-tick-npc` | server | 1 |

**Risk flags:** Pirate AI performance at multiple simultaneous pirates. Aggro radius tuning for fun gameplay.

---

## Phase 3 — Exploration & Galaxy

### Milestone 3.1: Jump System + Fuel
**Demo:** Developer deep-scans the starting system, sees hyper-lanes, sets jtarget, and jumps (consuming H fuel).

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-procgen-meta` | server | 2 |
| `server-starchart-track`, `server-starchart-jump-fuel` | server | 2 |
| `server-cmd-jump` | server | 1 |
| `client-explore-starchart` | client | 2 |

**Risk flags:** First time jumping to ungenerated system — generation must complete synchronously before player arrives.

### Milestone 3.2: Procedural System Generation
**Demo:** Developer jumps to a new system and finds a fully populated, archetype-appropriate system with resources and possibly pirates.

| Component IDs | Owner | Dev-Days |
|---|---|---|
| `server-procgen-system`, `server-procgen-rules` | server | 5 |

**Risk flags:** Archetype weighting tuning. Ensuring every generated system is fun and not degenerate.

---

## Phase 4 — Polish & Balance

### Milestone 4.1: Balance Pass
**Demo:** Sustained playtest session where economy, combat, and travel feel appropriately paced for 30–60 min sessions.

| Focus Areas | Dev-Days |
|---|---|
| Economy: resource spawn rates, prices, upgrade costs | 3 |
| Combat: pirate difficulty, weapon damage, shield HP | 2 |
| Power budget tuning | 1 |
| Travel time tuning | 1 |

### Milestone 4.2: UX Polish + Edge Cases
**Demo:** Clean, readable HUD. No crashes on edge cases (disconnect during jump, death while docked, etc.).

| Focus Areas | Dev-Days |
|---|---|
| Radar readability, status panel clarity, command feedback | 3 |
| Error handling: disconnect during jump, death while docked | 2 |
| Player-to-player trade (`interact` command) | 2 |
| Admin commands (spawn, reset, kick) | 2 |

---

# Deliverable 3: Sprint Plan

> **Assumptions:**
> - Dev A: Server (Bun/TypeScript)
> - Dev B: Client (Rust)
> - 6 productive hours/day with Claude Code agent-teams
> - Sprints are 10 working days (2 calendar weeks)
> - Complexity: S = ~4h, M = ~1 day, L = ~2-3 days, XL = 4-5 days

---

### Sprint 1: Wire Protocol & Project Foundation (Weeks 1–2)
**Goal:** Establish the shared contract and scaffold both repos so agent-teams can work independently from Sprint 2 onward.
**Demo:** Both repos build. Wire protocol document committed. Server health endpoint live. Client renders blank 4-panel layout.

#### Dev A (Server)
- [ ] `design-spike-unit-scale` — Resolve unit scale constant — S
- [ ] `design-spike-resource-depletion` — Resolve resource depletion model — S
- [ ] `design-spike-offline-persistence` — Resolve offline behavior — S
- [ ] `design-spike-station-inventory` — Resolve station inventory — S
- [ ] `design-spike-pirate-scaling` — Resolve pirate stat tier — S
- [ ] `design-spike-home-station` — Resolve home station rules — S
- [ ] `server-infra-scaffold` — Bun + Fastify + ws + Drizzle scaffold — S
- [ ] `server-infra-postgres` — PostgreSQL connection + Drizzle config — S
- [ ] `server-infra-redis` — Redis connection + key patterns — S

#### Dev B (Client)
- [ ] `client-layout-scaffold` — Rust project + ratatui + crossterm scaffold — S
- [ ] `client-layout-panels` — 4-panel layout (radar, status, chat, cmd) — M
- [ ] `client-layout-resize` — Terminal resize handling — S

#### Shared
- [ ] `shared-wire-schema` — Wire protocol schema document (both devs review) — M
- [ ] `shared-wire-ts-types` — TypeScript wire interfaces — S
- [ ] `shared-wire-rs-types` — Rust serde structs — S

**Integration checkpoint:** Dev A can run `GET /health` → 200. Dev B can `cargo run` and see the 4-panel layout. Both can read the wire protocol doc and agree on all message shapes.
**Risks:** Wire schema agreement is the only real blocker — dedicate Day 1 to joint design session before splitting off.

---

### Sprint 2: Auth + Connection + Empty Tick (Weeks 3–4)
**Goal:** Client connects, authenticates, and receives live (empty) tick updates every 3 seconds.
**Demo:** Run client, enter credentials, see "Connected" in status panel, and watch an empty radar update every 3 seconds.

#### Dev A (Server)
- [ ] `server-db-accounts` — Accounts table Drizzle schema — S
- [ ] `server-db-ships` — Ships + modules + cargo Drizzle schema — S
- [ ] `server-db-systems` — Star systems + objects Drizzle schema — S
- [ ] `server-db-economy` — Station inventory + trade log schema — S
- [ ] `server-db-starchart` — Player star chart schema — S
- [ ] `server-auth-register` — POST /auth/register — S
- [ ] `server-auth-login` — POST /auth/login → JWT — S
- [ ] `server-auth-ws-handshake` — WebSocket auth message validation — M
- [ ] `server-tick-loop` — 3s tick driver — S
- [ ] `server-tick-broadcast` — Broadcast empty tick_update — M

#### Dev B (Client)
- [ ] `client-conn-ws` — WebSocket client (background thread) — M
- [ ] `client-conn-auth` — Send auth token on connect — M
- [ ] `client-conn-reconnect` — Reconnect with backoff — M
- [ ] `client-conn-deserialize` — JSON → ServerMessage enum — S
- [ ] `client-hud-chat` — Chat/events feed panel — M
- [ ] `client-hud-events` — Combat event highlighting — S
- [ ] `client-input-readline` — Command input bar + history — M
- [ ] `client-input-dispatch` — Send command over WebSocket — S

**Integration checkpoint:** Client authenticates and receives empty `tick_update` every 3s. Both devs verify tick timing and connection stability.
**Risks:** Rust threading model (TUI + WebSocket thread) — establish the channel-based pattern correctly now; hard to refactor later.

---

### Sprint 3: World State + Ship Entity + Live HUD (Weeks 5–6)
**Goal:** Client shows a live radar with real objects and real ship status from the server.
**Demo:** Connect, see starting system star, planets, asteroids in radar. Status panel shows starter ship hull/shields/power/cargo.

#### Dev A (Server)
- [ ] `server-world-coordinate` — 3D vector math utilities — S
- [ ] `server-world-objects` — Object entity model + factory functions — S
- [ ] `server-world-redis-state` — Redis world state store/retrieve — M
- [ ] `server-world-starting-system` — Fixed starting system generator + seed — M
- [ ] `server-resource-definitions` — H, He, Li, B constants — S
- [ ] `server-ship-entity` — Ship model + loadShip/saveShip — M
- [ ] `server-ship-cargo` — Cargo bay CRUD — S
- [ ] `server-persist-load` — Load or create ship on connect — S
- [ ] `server-tick-broadcast` (update) — Broadcast real system state — M

#### Dev B (Client)
- [ ] `client-hud-radar` — Radar panel with real object positions — L
- [ ] `client-hud-status` — Status panel with real ship data — M

**Integration checkpoint:** Both devs connect to running server; starting system objects visible on radar; ship status matches server-sent values.
**Risks:** Coordinate scaling — if unit scale is wrong, radar will look cramped or empty. Tune using design spike values.

---

### Sprint 4: Movement Commands + Harvesting (Weeks 7–8)
**Goal:** Ship moves, approaches, and orbits. Starter drone harvests. Cargo fills up.
**Demo:** Type `ntarget asteroid-1`, `approach`, watch ship move on radar. Activate drone module, watch cargo H/B accumulate.

#### Dev A (Server)
- [ ] `server-ship-movement` — Movement mode state machine — M
- [ ] `server-ship-thruster-scaling` — Speed = f(power%) — S
- [ ] `server-ship-power-budget` — PU allocation enforcement — S
- [ ] `server-tick-movement` — Per-tick position update phase — M
- [ ] `server-cmd-parser` — Command string tokenizer — S
- [ ] `server-cmd-info` — look, status, help, chat commands — S
- [ ] `server-cmd-movement` — ntarget, approach, orbit, thrusters, stop — M
- [ ] `server-cmd-scan` — scan, deep-scan (stub: scan only) — M
- [ ] `server-drone-starter` — Starter omni-harvest drone — M
- [ ] `server-drone-target-validation` — target_type[] check — S
- [ ] `server-resource-harvest-tick` — Drone → extract → cargo — M
- [ ] `server-tick-drones` — Drone ops tick phase (harvest only) — M
- [ ] `server-cmd-drone` — ptarget, module on/off — M

#### Dev B (Client)
- [ ] Polish radar movement visualization (ship moving in real time) — M
- [ ] Command echo + server event display in chat feed — S

**Integration checkpoint:** Both devs can move ships around starting system, scan objects, deploy starter drone, and see cargo fill up over time.
**Risks:** Orbit math tuning. Drone range check (20u) — test that approach + harvest combo works naturally.

---

### Sprint 5: Economy + Docking + Persistence (Weeks 9–10)
**Goal:** Full session loop: harvest → dock → sell → buy → repair → upgrade → disconnect → reconnect with state intact.
**Demo:** Full 30-minute session ending with disconnecting and reconnecting to find exact state restored.

#### Dev A (Server)
- [ ] `server-economy-trade` — Buy/sell at 80%/120% — M
- [ ] `server-economy-repair` — Hull repair cost + execution — S
- [ ] `server-economy-upgrade` — Module upgrade logic — M
- [ ] `server-cmd-dock` — dock/undock commands — M
- [ ] `server-persist-save` — Auto-save on disconnect — S

#### Dev B (Client)
- [ ] `client-dock-menu` — Dock menu replaces radar panel — M
- [ ] `client-dock-trade` — Buy/sell sub-menu — M
- [ ] `client-dock-repair` — Repair screen — S
- [ ] `client-dock-upgrade` — Module upgrade screen — M

**Integration checkpoint:** Both devs run a complete session: harvest → dock → trade → repair → upgrade → disconnect → reconnect → state intact.
**Risks:** Dock state machine on client (radar ↔ dock view). Credit atomicity. Upgrade resource cost definitions need to be agreed before sprint.

---

### Sprint 6: Combat System (Weeks 11–12)
**Goal:** Two players can shoot each other. Projectiles visible on radar. Death and respawn work correctly.
**Demo:** Dev A and Dev B each connect; shoot each other; watch shields drop, then hull; one dies; respawns at home station with 20% cargo loss.

#### Dev A (Server)
- [ ] `server-combat-projectile` — Projectile entity + creation — M
- [ ] `server-combat-collision` — Hit detection (≤5u) — S
- [ ] `server-combat-damage` — Shields → hull damage model — S
- [ ] `server-combat-death` — Death + respawn + 20% cargo loss — M
- [ ] `server-drone-gun` — Gun drone module + ammo consumption — M
- [ ] `server-tick-combat` — Combat resolution tick phase — M
- [ ] `server-cmd-drone` (update) — Add ptarget + module on/off for gun drone — S

#### Dev B (Client)
- [ ] Projectile rendering on radar (fast-moving `•` symbols) — M
- [ ] Combat event display in feed ("You hit X for 10 damage", "Your shields are down!") — S
- [ ] Death screen + respawn notification — S

**Integration checkpoint:** Full PvP combat session between Dev A and Dev B — hit detection, damage, death, respawn.
**Risks:** Friendly fire edge cases. Projectile despawn on miss needs max TTL. Test death-while-docked scenario.

---

### Sprint 7: Pirates + Combat Events (Weeks 13–14)
**Goal:** The galaxy has enemies. Pirates spawn, aggro, shoot, die, drop loot, and respawn.
**Demo:** Enter a resource-rich system, get attacked by a pirate, fight back, kill it, loot the corpse. Wait and see it respawn.

#### Dev A (Server)
- [ ] `server-npc-pirate-spawn` — Pirate spawn at system gen — M
- [ ] `server-npc-pirate-ai` — Aggro + pursuit AI — M
- [ ] `server-npc-pirate-loot` — Loot drop + respawn timer — M
- [ ] `server-tick-npc` — NPC AI tick phase — M
- [ ] Starting system update: add 1–2 pirates for early testing — S

#### Dev B (Client)
- [ ] NPC ship rendering on radar (distinct symbol from player ships) — S
- [ ] Aggro event notifications ("A pirate has targeted you!") — S
- [ ] Loot container rendering on radar — S

**Integration checkpoint:** Both devs fight pirates together in starting system. Verify loot drop, cargo pickup, and respawn timer.
**Risks:** Pirate speed balance — must be fast enough to be threatening but not impossible to escape. Tune during this sprint.

---

### Sprint 8: Jump System + Fuel + Star Chart (Weeks 15–16)
**Goal:** Break out of the starting system. Deep-scan, set jtarget, jump using H fuel, explore adjacent systems.
**Demo:** Deep-scan starting system → see 2–3 hyper-lanes → set jtarget → jump (consuming H) → arrive in new system → see star chart updated.

#### Dev A (Server)
- [ ] `server-procgen-meta` — Hyper-lane metadata generation — M
- [ ] `server-starchart-track` — Personal chart DB tracking — S
- [ ] `server-starchart-jump-fuel` — Fuel cost calculation + deduction — S
- [ ] `server-cmd-jump` — jtarget + jump commands — M
- [ ] `server-cmd-scan` (update) — deep-scan implementation — M
- [ ] Stub: jump to ungenerated system creates empty system placeholder — M

#### Dev B (Client)
- [ ] `client-explore-starchart` — Star chart display panel — L

**Integration checkpoint:** Both devs jump to adjacent systems (stubs). Fuel consumed. Star chart updates. Jump-with-no-fuel error fires correctly.
**Risks:** Jump to ungenerated system must handle gracefully — player can't arrive in null state. The stub must return something renderable.

---

### Sprint 9: Procedural Generation (Weeks 17–18)
**Goal:** Every new system is a real place. Procedurally generated, archetype-appropriate, with resources and NPCs.
**Demo:** Jump to 5 different new systems; each has a unique layout, appropriate resources, and correct pirate count for its archetype.

#### Dev A (Server)
- [ ] `server-procgen-system` — Full archetype-based system generation — XL
- [ ] `server-procgen-rules` — Dead-end prevention + resource guarantee — S
- [ ] Wire `server-cmd-jump` to full procgen (replace stub) — M

#### Dev B (Client)
- [ ] Star chart: show archetype labels on known systems — S
- [ ] Polish radar for varying system sizes — M

**Integration checkpoint:** Both devs explore the procedural galaxy for a full session. Log any degenerate systems (too many/few objects, wrong NPCs).
**Risks:** Generation complexity — archetype weighting may produce unbalanced systems. Budget extra time for generation tuning.

---

### Sprint 10: Polish, Balance & Edge Cases (Weeks 19–20)
**Goal:** Game feels good at 30–60 minute sessions. No crashes on edge cases. Ready for friends.
**Demo:** 3–4 players connected simultaneously; full session; no crashes; economy feels rewarding; combat is tense but fair.

#### Dev A (Server)
- [ ] Economy balance pass — resource prices, upgrade costs, spawn rates — M
- [ ] Combat balance pass — pirate HP, damage, aggro range — M
- [ ] Power budget tuning — review starter ship feel — S
- [ ] Edge case: disconnect during jump — M
- [ ] Edge case: death while docked — S
- [ ] Admin commands: `admin spawn <type>`, `admin reset <system>`, `admin kick <player>` — M

#### Dev B (Client)
- [ ] Radar readability pass — symbol clarity, distance labels, color coding — M
- [ ] Status panel clarity pass — bar labels, module names — S
- [ ] Command feedback polish — echo commands, error messages more specific — S
- [ ] Player-to-player trade: `interact <player>` → trade menu — L

#### Shared
- [ ] Full-session playtesting (3+ players) — 2 sessions
- [ ] Bug triage and hotfixes from playtesting

**Integration checkpoint:** End-of-sprint 60-minute multiplayer session with target player group.
**Risks:** Balance is inherently iterative — allocate at least 2 days post-playtest for hotfixes. Player-to-player trade is a stretch goal; cut if balance pass takes longer.

---

## Sprint Summary

| Sprint | Weeks | Theme | Critical Deliverable |
|---|---|---|---|
| 1 | 1–2 | Foundation | Wire protocol committed; both repos scaffold |
| 2 | 3–4 | Auth + Connection | Client connects, authenticates, receives empty ticks |
| 3 | 5–6 | Live World | Real objects on radar; real ship status |
| 4 | 7–8 | Move + Harvest | Ship moves; drone harvests; cargo fills |
| 5 | 9–10 | Economy Loop | Full session: harvest → sell → upgrade → reconnect |
| 6 | 11–12 | PvP Combat | Shoot each other; death + respawn |
| 7 | 13–14 | PvE Danger | Pirates attack; loot; respawn |
| 8 | 15–16 | Galaxy | Jump between systems; fuel; star chart |
| 9 | 17–18 | Procgen | Infinite procedural galaxy |
| 10 | 19–20 | Polish | Balanced, playable, friend-ready |
