# 🛰 Space MUD — Sprint Roadmap

This document tracks the high-level progress of the Space MUD project. Each sprint is a functional milestone.

## 🏃 Current Sprint: Sprint 1 — Foundation
**Goal**: Establish the communication contract and project scaffolds for Server, Client, and Shared logic.

| ID | Task | Status | Assigned |
|:---|:---|:---:|:---|
| `S1-WIRE-01` | `shared-wire-schema` | ✅ Done | — |
| `S1-WIRE-02` | `shared-wire-ts-types` | 🚀 Active | — |
| `S1-WIRE-03` | `shared-wire-rs-types` | 🔄 Todo | — |
| `S1-INFRA-01` | `server-infra-scaffold` | 🔄 Todo | — |
| `S1-INFRA-02` | `server-infra-postgres` | 🔄 Todo | — |
| `S1-INFRA-03` | `server-infra-redis` | 🔄 Todo | — |
| `S1-LAYOUT-01` | `client-layout-scaffold` | 🔄 Todo | — |
| `S1-LAYOUT-02` | `client-layout-panels` | 🔄 Todo | — |

---

## 📅 Future Sprints

### Sprint 2: Auth & Persistence
- User registration/login (JWT)
- Persistent ship and account storage (Postgres)
- WebSocket authentication handshake

### Sprint 3: The World & The Tick
- 3s Game Tick loop
- 3D Coordinate math
- Starting system generation
- Redis state management

### Sprint 4: Pilot Control
- Command parser
- Movement state machine (Approach/Orbit/Stop)
- Client input handling

### Sprint 5: Interaction & Economy
- Scanning (Short/Deep)
- Docking & Station menus
- Resource harvesting (Drones)

### Sprint 6: Combat & NPCs
- Projectile physics
- Combat drones
- Pirate AI & Aggro

### Sprint 7: Procedural Galaxy
- Hyper-lane generation
- System-to-system jumps
- Full procedural system generation
