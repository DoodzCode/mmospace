<aside>
🎯

**Project Codename:** Space MUD

**Type:** Sci-fi exploration, survival, and economy text-based MMO

**Target Platform:** Terminal (TUI)

**Team Size:** 2 developers (Claude Code agent-teams)

**Target Audience:** Private friends server (~10 players)

</aside>

---

## Mission Statement

Build a persistent, tick-based, text-rendered space MMO where players pilot customizable ships through a procedurally generated galaxy. The game emphasizes **exploration**, **resource economics**, and **emergent player interaction** over twitch combat or visual spectacle. The galaxy is unknown at the start — every system discovered is a system that didn't exist before you jumped there. Players carve out their own story through the decisions they make: where to explore, what to harvest, when to fight, and who to trust.

The game should feel like **commanding a starship from the bridge** — instruments, readouts, radar, and typed orders — not like piloting an arcade ship.

---

## Core Design Pillars

1. **Exploration is the endgame.** The galaxy is infinite and procedurally generated on discovery. There is always somewhere new to go. The fog of war is permanent — your star chart is yours alone.
2. **Ships are characters.** There are no skill trees, levels, or XP. Progression is entirely through ship modules, ship class, and accumulated knowledge of the galaxy.
3. **Power is a budget.** Every system on your ship draws from a finite power supply. You cannot run everything at once. Choosing what to power — thrusters, shields, drones, scanners — is the core tactical decision.
4. **Drones are your hands.** Ships don't directly mine or shoot. Drones do the work. Your ship is a platform; drones are the tools you deploy.
5. **The galaxy doesn't care about you.** Pirates attack. Resources deplete. Stations have their own economies. The world ticks forward whether you're ready or not.

---

## Game Overview

### The World

The galaxy is a weighted graph of **star systems** connected by **hyper-lanes**. Each star system contains up to ~50 objects: planets, asteroids, gas clouds, stations, NPC ships, and player ships. Objects exist in a **3D coordinate space** within each system, and interactions are gated by **distance thresholds** (scanning range, combat range, mining range, docking range).

Star systems are **procedurally generated when first discovered**. A starting system is created at server initialization and is shared by all players. When a player performs a `deep-scan`, the game generates metadata for connecting systems (distance, hyper-lane count). When a player actually `jump`s to a new system, the full system is generated and persisted.

### The Player

Each player is a **pilot/ship combo** — one entity. There is no EVA, no boarding, no crew management. The ship *is* the player.

Players interact with the world through **typed commands** in a terminal interface. The game renders a radar HUD, ship status panel, and chat feed, updated every tick.

### The Session

Target session length is **30–60 minutes**. A typical session: undock → scan → travel → harvest → encounter pirates → return to station → sell → upgrade → log off. The game auto-saves on disconnect.

---

## Tech Stack & Architecture

### Stack Decision: Split (Rust Client + Node Server)

```
┌─────────────────────────┐       WebSocket (JSON)       ┌────────────────────────┐
│     Rust TUI Client     │ ◄────── state updates ─────► │    Node.js Server      │
│   ratatui + crossterm   │ ──────► player commands ────► │    (Bun runtime)       │
│                         │                               │                        │
│   Renders:              │                               │   Systems:             │
│   • Radar HUD           │                               │   • Game tick loop     │
│   • Ship status panel   │                               │   • World state mgmt   │
│   • Dock menu UI        │                               │   • Combat resolution  │
│   • Chat feed           │                               │   • NPC AI             │
│   • Command input       │                               │   • Economy engine     │
│                         │                               │   • Procedural gen     │
│                         │                               │   • Auth / sessions    │
└─────────────────────────┘                               │                        │
                                                          │   PostgreSQL + Redis   │
                                                          └────────────────────────┘
```

### Server

| Component | Choice | Rationale |
| --- | --- | --- |
| Runtime | **Bun** (or Node.js) | Fast iteration on game logic; huge TS ecosystem |
| Transport | **ws** (WebSocket) | Lightweight, no [Socket.io](http://Socket.io) overhead needed for 10 players |
| HTTP Framework | **Fastify** | Auth endpoints, account management, admin tools |
| Game Loop | Custom `setInterval` (3s tick) | Simple, predictable, debuggable |
| ORM | **Drizzle** | Type-safe, lightweight, good PostgreSQL support |

### Client

| Component | Choice | Rationale |
| --- | --- | --- |
| Language | **Rust** | Performance, single binary distribution, fun to write |
| TUI Framework | **ratatui + crossterm** | Mature, cross-platform, excellent layout system |
| Transport | **tungstenite** (WebSocket) | Rust WebSocket client, pairs with server's ws |
| Serialization | **serde + serde_json** | Deserialize server state updates into Rust structs |

### Database

| Store | Use |
| --- | --- |
| **PostgreSQL** | Player accounts, ship loadouts, star system definitions, economy state, persistent world |
| **Redis** | Active player sessions, current system state (positions, velocities), tick-ephemeral data |

### Wire Protocol

JSON over WebSocket. A shared schema document defines every message type.

**Server → Client messages:**

- `tick_update` — full state of player's current system (positions, objects, distances)
- `ship_status` — player's ship state (hull, shields, power, cargo, modules)
- `scan_result` — result of a scan command
- `deep_scan_result` — hyper-lane list
- `dock_state` — station menu state (prices, inventory)
- `chat_message` — incoming chat
- `event` — combat hit, drone deployed, jump initiated, death, etc.

**Client → Server messages:**

- `command` — player-typed command string (parsed server-side)

### Deployment

| Target | Option |
| --- | --- |
| Server hosting | **Railway**, [Fly.io](http://Fly.io), or a $5 VPS (10 players = trivial load) |
| Database hosting | **Supabase** (managed PostgreSQL) or self-hosted on same VPS |
| Client distribution | Compiled Rust binary, shared via GitHub Releases or direct download |

---

## Development Workflow

### Team Split

Two developers, each running **Claude Code with agent-teams**. The split stack maps naturally to a team split:

| Developer | Owns | Language | Repo |
| --- | --- | --- | --- |
| **Dev A — Server** | Game server, tick engine, game logic, DB schema, economy, NPC AI, procedural gen, auth | TypeScript (Bun) | `spacemud-server` |
| **Dev B — Client** | TUI rendering, radar HUD, ship status panel, dock menu, command input, chat feed, connection mgmt | Rust | `spacemud-client` |

**Shared ownership:** Wire protocol schema (both devs must agree on changes).

### Spec Pipeline

Specs flow from high-level design (this document) through increasingly detailed implementation specs:

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│  This Document        │     │  System Specs             │     │  Implementation Specs    │
│  (Game Proposal &     │ ──► │  (per-system detail,      │ ──► │  (Claude/Gemini output,  │
│   Roadmap)            │     │   written in Notion)      │     │   code-ready, in repo)  │
│                       │     │                           │     │                         │
│  • Design decisions   │     │  • Wire protocol schema   │     │  • Function signatures  │
│  • Game systems       │     │  • DB schema              │     │  • Test cases           │
│  • Roadmap phases     │     │  • Data types/enums       │     │  • Module boundaries    │
│  • Open questions     │     │  • State machines         │     │  • Error handling       │
│                       │     │  • Algorithm pseudocode   │     │  • Edge cases           │
└──────────────────────┘     └──────────────────────────┘     └─────────────────────────┘
```

### Spec Structure for Agent Consumption

When handing specs to Claude Code / Gemini for detailed implementation specs, each system spec should follow this structure:

1. **Context** — What this system is, where it fits in the architecture, what depends on it
2. **Data types** — Every struct/type/enum with exact field names and types (TypeScript for server, Rust for client)
3. **Wire messages** — Every JSON message this system sends or receives, with example payloads
4. **State machine** — If the system has states (e.g., movement modes, dock state), diagram the transitions
5. **Algorithm** — Pseudocode for any non-trivial logic (tick processing order, damage calculation, procedural gen)
6. **Constraints** — Hard rules that must never be violated (e.g., "power draw cannot exceed capacitor PU")
7. **Edge cases** — What happens on disconnect, death while docked, jump with insufficient fuel, etc.
8. **Test scenarios** — 3–5 concrete scenarios the implementation must handle correctly

### Recommended System Specs to Write Next

These are the spec documents to create (in priority order) before handing off to agent-teams:

| Priority | Spec | Feeds Into | Owner |
| --- | --- | --- | --- |
| **P0** | Wire Protocol Schema | Both repos — this is the contract | Shared |
| **P0** | DB Schema | Server repo scaffold | Server dev |
| **P1** | Tick Engine & World State | Server core loop | Server dev |
| **P1** | TUI Layout & Rendering | Client scaffold | Client dev |
| **P2** | Ship & Module System | Server game logic | Server dev |
| **P2** | Command Parser & Input | Client input handling | Client dev |
| **P3** | Drone System (harvest + combat) | Server game logic | Server dev |
| **P3** | Radar HUD Rendering | Client rendering | Client dev |
| **P4** | Economy & Station | Server economy | Server dev |
| **P4** | Dock Menu UI | Client UI | Client dev |
| **P5** | NPC AI (Pirates) | Server AI | Server dev |
| **P5** | Procedural Generation | Server world gen | Server dev |

The **P0 specs (wire protocol + DB schema)** should be written first because both developers' agent-teams need them as input before any code is written. The wire protocol is the handshake — once both sides agree on message shapes, client and server can be developed independently.

---

## Game Systems

### 1. Tick Engine

- **1 tick = 3 seconds real time**
- Every tick, the server processes (in order):
    1. **Movement** — update positions of all moving objects (ships, drones, projectiles)
    2. **Combat resolution** — check projectile/drone collisions, apply damage
    3. **Drone operations** — resource drones harvest, combat drones fire
    4. **NPC AI** — pirate aggro checks, patrol movement
    5. **State broadcast** — send updated state to all connected players in the system

### 2. World Structure

**Star Systems** are the fundamental "room" unit.

| Property | Detail |
| --- | --- |
| Objects | 10–50 per system (randomized at generation) |
| Object types | Star (always 1, at center), planets, asteroids, gas clouds, stations, NPC ships |
| Coordinate space | 3D (x, y, z), unit scale TBD (tuned for 30–60 min session pacing) |
| Hyper-lanes | 1–5 connections to adjacent systems |
| Generation | Procedural on first discovery; persisted to PostgreSQL |

**System archetypes** (weighted random at generation):

| Archetype | Characteristics |
| --- | --- |
| **Resource-rich** | Many asteroids/gas clouds, few pirates, 1–2 planets |
| **Civilized** | 1–3 planets with trade stations, military patrols, few raw resources |
| **Dangerous** | Heavy pirate presence, scattered debris/resources, no stations |
| **Barren** | Few objects, transit system, 1–2 hyper-lanes |
| **Starting system** | Fixed layout: safe, 1 trade station (home station), moderate resources, 2–3 hyper-lanes |

**Generation rules:**

- Every system must have at least 1 hyper-lane out (no dead ends at galaxy edge — generate a new connection)
- Every system must have at least 1 harvestable resource object
- The starting system is hand-tuned, not procedural

### 3. Ship System

A ship has **module slots** organized into two categories:

**Core Modules** (always present, one of each, upgradeable):

| Module | Function |
| --- | --- |
| **Power Capacitor** | Supplies PU (power units) to all modules. Total PU determines what you can run simultaneously. |
| **Thrusters** | In-system movement. Speed scales with power draw (0–100%). No fuel cost. |
| **Jump Drive** | Inter-system travel. Consumes jump fuel proportional to hyper-lane distance. |
| **Shields** | Absorbs damage before hull. Has separate HP pool. |
| **Hull** | The ship's final HP pool. Determines total structural integrity. |
| **Cargo Bay** | Storage capacity for resources, fuel, and ammunition. |

**Drone Slots** (variable number based on ship class):

Drone modules occupy drone slots. Each drone module:

- Has a **power draw** (PU)
- Has a **target_type[]** array (valid object types it can target: `ship`, `asteroid`, `gas_cloud`, `planet`, etc.)
- Can be **toggled on/off** — if turned on and `ptarget` is not a valid target type, the module auto-deactivates
- Has a **tier** (determines what resource tier / combat tier it operates at)

**Drone Module Types:**

| Type | Subtype | Behavior |
| --- | --- | --- |
| **Starter Drone** | Omni-harvest | Harvests ANY resource type at its tier, but at **50% efficiency** (half yield or double time). Available from game start. |
| **Non-metal Harvester** | Resource | Harvests H-group resources at full efficiency |
| **Gas Harvester** | Resource | Harvests noble gas resources at full efficiency |
| **Metal Harvester** | Resource | Harvests alkali/alkaline metal resources at full efficiency |
| **Mineral Harvester** | Resource | Harvests metalloid/post-transition resources at full efficiency |
| **Gun Drone** | Combat | Fires projectiles at `ptarget`. Consumes bullets. Fire rate: every N ticks. |
| **Laser Drone** | Combat | Fires energy weapon at `ptarget`. Draws PU per shot. No ammo. *(Later version)* |
| **Missile Drone** | Combat | Fires guided missiles at `ptarget`. Consumes missiles. High damage, slow fire rate. *(Later version)* |
| **Scout Drone** | Exploration | Extends scan range, auto-scans objects. *(Later version)* |

**Power Budget Example (MVP):**

| Module | Power Draw |
| --- | --- |
| Thrusters (at 100%) | 40 PU |
| Shields | 20 PU |
| Starter Drone | 15 PU |
| Gun Drone | 25 PU |
| **Total draw** | **100 PU** |
| Starter Capacitor | **100 PU** |

This means a new player can run everything — but barely. Upgrade the capacitor to run more, or make tradeoffs: drop thrusters to 50% (20 PU) to run shields + both drones.

**Movement Modes** (mutually exclusive):

- `idle` — stationary
- `approaching` — moving toward `ntarget`, auto-stops at specified range
- `orbiting` — maintaining set distance from `ntarget`, auto-adjusting thrusters

### 4. Resource System

Resources are based on **periodic table element groups**.

**MVP Resources:**

| Element | Group | Harvest Source | Primary Use | Base Value (credits) |
| --- | --- | --- | --- | --- |
| **Hydrogen (H)** | Non-metal | Gas clouds, ice asteroids | Jump fuel, basic crafting | 5 |
| **Helium (He)** | Noble gas | Gas giants, nebulae | Shield modules, high-value trade | 25 |
| **Lithium (Li)** | Alkali metal | Rocky asteroids, planetary crust | Power capacitors, energy modules | 15 |
| **Boron (B)** | Metalloid | Mineral-rich asteroids | Hull, structural modules, ammo | 10 |

**Resource categories for module targeting:**

- `gas` → H, He (and future noble gases/non-metals)
- `mineral` → Li, B (and future metals/metalloids)

This two-category split means MVP needs only two specialized harvester types (gas + mineral), plus the Starter Drone omni-harvester.

**Future tier expansion:**

| Tier | Unlock Condition | Elements Added |
| --- | --- | --- |
| Tier 1 (MVP) | Start of game | H, He, Li, B |
| Tier 2 | Ship class upgrade | C, N, Na, Mg, Al, Ne, Ar |
| Tier 3 | Endgame systems | Si, K, Ge, Sn, Xe |
| Tier 4 (Transition metals) | Locked zones | Fe, Cu, Ti, W, Au |

### 5. Economy

**Currency:** Credits (single currency)

**Money sources:**

- Sell resources at trade stations (base value × station demand multiplier)
- Destroy pirate ships (bounty reward + loot drop)
- *(Later)* Complete missions

**Money sinks:**

- Buy jump fuel (Hydrogen-based, or synthetic at stations)
- Buy ammunition (bullets)
- Repair hull
- Buy/upgrade modules
- *(Later)* Buy specialized resources at stations

**Station Trade Model (MVP):**

- Stations buy resources at **80% of base value** (the station takes a cut)
- Stations sell fuel and ammo at **120% of base value**
- Repair cost = hull damage × 2 credits per HP
- Module upgrades require **credits + specific resources** (crafted at station)

**Inflation control:**

- Death penalty removes 20% of cargo resources (resource sink)
- Ammo is consumed (credit sink)
- Fuel is consumed (credit sink)
- Module upgrades are expensive and require rare resources
- For 10 players, manual economy tuning between sessions is viable

### 6. Combat

**Model:** Seamless, no combat mode. Combat is a consequence of module activation.

**Flow:**

1. Player sets `ptarget` to a hostile ship (or any ship, since PvP is always-on)
2. Player activates combat drone module (`module <slot> on`)
3. Module validates `ptarget` against its `target_type[]` — if invalid, module auto-deactivates
4. If valid, combat drone fires every N ticks (fire rate)
5. Projectile is created as a world object with position + velocity, traveling toward target
6. Each tick, server checks projectile distance to target
7. On hit (distance ≤ hit threshold): damage applied → shields first → hull
8. If hull ≤ 0: ship destroyed → death event

**MVP Combat Stats:**

| Stat | Value |
| --- | --- |
| Gun Drone fire rate | 1 shot every 2 ticks (6 seconds) |
| Bullet damage | 10 HP per hit |
| Bullet speed | 50 units/tick |
| Hit threshold | ≤ 5 units from target |
| Starter Shield HP | 50 |
| Starter Hull HP | 100 |

**Weapons only damage ships** (player and NPC). Planets, asteroids, gas clouds, and stations are invulnerable.

**Friendly fire is ON.** Players must manage their targeting carefully. Projectiles that hit unintended targets (another player's ship between you and your target) deal full damage.

**NPC Aggro:**

- Hitting a military/faction NPC causes **immediate retaliation** — the NPC targets and engages the offending player
- *(Later)* Destroying faction ships causes reputation loss: `faction_rep -= 20`

**Death:**

- Ship is destroyed
- Player respawns at their **designated home station**
- 20% of cargo resources are lost (rounded down)
- Ship hull and shields are restored to full
- All modules remain intact
- No credit loss

### 7. NPC System

**MVP NPC Types:**

| NPC | Behavior | Location |
| --- | --- | --- |
| **Pirate** | Spawns in system at generation. Aggros within combat range (~100 units). Pursues at fixed speed (slightly slower than mid-tier ship). Drops random resource bundle on death. Respawns after N ticks. | Roaming in dangerous/resource-rich systems |
| **Trade Station** | Static. Orbits a planet with `HAS_TRADE: true`. Provides dock menu (buy/sell/repair). | Orbiting tradeable planets |

**Later NPC Types:**

| NPC | Behavior |
| --- | --- |
| **Military Patrol** | Guards civilized systems. Passive unless attacked. Retaliates with high-tier weapons. |
| **Merchant Convoy** | Travels between systems on hyper-lanes. Can be traded with in space (no docking required). Can be pirated (reputation loss). |
| **Faction NPCs** | Tied to faction reputation system. Hostile/neutral/friendly based on player rep. |

### 8. Station & Docking

When a player executes `dock <station>` within docking range (≤ 10 units), they enter the **dock UI** — a separate menu-driven interface replacing the radar HUD.

**Dock Menu (MVP):**

```
═══════════════════════════════
  DOCKED: Sol Station Alpha
═══════════════════════════════
  1. Trade
     ├─ Buy
     │  ├─ Fuel (Jump)
     │  └─ Ammunition (Bullets)
     └─ Sell
        └─ Resources (H, He, Li, B)
  2. Repair Ship
     └─ Full hull repair
  3. Upgrade Modules
     └─ (requires credits + resources)
  4. Set Home Station
  5. Undock
═══════════════════════════════
```

**Upgrade at station:** Module upgrades (Mk I → Mk II, etc.) are only available while docked. Requires credits + specific resource costs.

### 9. Scanning & Discovery

| Scan Type | Command | Range | Reveals |
| --- | --- | --- | --- |
| **Object scan** | `scan <target>` | ≤ 500 units | Resource composition, planet population/economy, ship class/modules |
| **Deep scan** | `deep-scan` | System-wide | Hyper-lane list with distances. Known systems show names; unknown show as "Unknown System #N" |
- Objects on radar are **unidentified** until scanned (displayed as "Unknown Object")
- Each player maintains a **personal star chart** — systems visited + objects scanned are remembered across sessions
- Deep scan results are settable as `jtarget` targets

### 10. Command Grammar (MVP)

| Command | Action |
| --- | --- |
| `look` | Display radar HUD + ship overview |
| `scan <target>` | Scan a specific object |
| `deep-scan` | Scan hyper-lanes from current system |
| `ntarget <target>` | Set navigation target |
| `approach` | Begin moving toward ntarget |
| `orbit <target> <distance>` | Maintain distance from target |
| `thrusters <0-100>` | Set thruster power level (% of max draw) |
| `ptarget <target>` | Set primary target (for modules) |
| `module <slot> <on/off>` | Toggle a module on or off |
| `jtarget <system>` | Set jump target system |
| `jump` | Initiate jump to jtarget |
| `dock <station>` | Dock with a station (must be in range) |
| `undock` | Leave station, return to space |
| `interact <target>` | Open interaction menu with target (trade with player, etc.) |
| `status` | Display detailed ship systems readout |
| `chat <message>` | Send message to system-wide chat |
| `stop` | Kill thrusters, cancel approach/orbit |
| `help` | List available commands |

### 11. Distance Thresholds

| Interaction | Range (units) |
| --- | --- |
| Radar visibility | Entire system (all objects shown, unidentified until scanned) |
| Scanning | ≤ 500 |
| Combat (drone deployment) | ≤ 100 |
| Mining (drone deployment) | ≤ 20 |
| Docking | ≤ 10 |
| Projectile hit | ≤ 5 |

---

## Development Roadmap

### Phase 0 — Foundation (Weeks 1–3)

<aside>
🧱

**Goal:** Establish the project skeleton. No gameplay yet — just infrastructure.

</aside>

- [ ]  Define wire protocol schema (JSON message types, client ↔ server)
- [ ]  +Scaffold Node.js server project (Bun + Fastify + ws + Drizzle)
- [ ]  Scaffold Rust TUI client project (ratatui + crossterm + tungstenite)
- [ ]  Set up PostgreSQL schema (accounts, star systems, ships, modules, resources)
- [ ]  Set up Redis for session/tick state
- [ ]  Implement basic auth (username/password → JWT session)
- [ ]  Implement WebSocket connection lifecycle (connect, auth handshake, disconnect/reconnect)
- [ ]  Implement tick loop skeleton (3s interval, broadcasts empty state)
- [ ]  Client renders blank HUD layout (radar panel, status panel, command input, chat panel)

### Phase 1 — Core Loop MVP (Weeks 4–8)

<aside>
🎮

**Goal:** One star system. Move, scan, harvest, sell, upgrade. Playable end-to-end.

</aside>

**World:**

- [ ]  Build starting system generator (fixed layout: star, 3–5 planets, 5–10 asteroids/gas clouds, 1 trade station)
- [ ]  Implement 3D coordinate system + object positions
- [ ]  Implement per-tick position updates for moving objects
- [ ]  Implement distance calculations (brute-force, ~50 objects)

**Ship:**

- [ ]  Implement ship entity with core modules (capacitor, thrusters, shields, hull, cargo, jump drive)
- [ ]  Implement power budget system (PU allocation, module power draw)
- [ ]  Implement movement modes (idle, approaching, orbiting)
- [ ]  Implement thruster power scaling (speed = f(power level))

**Commands:**

- [ ]  Implement command parser (string → command + args)
- [ ]  `look`, `status`, `scan`, `ntarget`, `approach`, `orbit`, `thrusters`, `stop`
- [ ]  `ptarget`, `module <slot> on/off`
- [ ]  `dock`, `undock`
- [ ]  `chat`
- [ ]  `help`

**Drones:**

- [ ]  Implement Starter Drone Module (omni-harvester, 50% efficiency penalty)
- [ ]  Implement drone deployment toward ptarget with target_type validation
- [ ]  Implement resource harvesting tick (drone at target → extract resource → deposit in cargo)

**Economy:**

- [ ]  Implement 4 MVP resources (H, He, Li, B) with base values
- [ ]  Implement trade station buy/sell (80% sell, 120% buy multipliers)
- [ ]  Implement hull repair at station
- [ ]  Implement module upgrade at station (credits + resources)

**Client:**

- [ ]  Render radar HUD (star at center, objects as symbols, player position, distances)
- [ ]  Render ship status panel (hull, shields, power, cargo, modules)
- [ ]  Render command input with history
- [ ]  Render dock menu UI
- [ ]  Render chat feed

**Persistence:**

- [ ]  Auto-save ship state on disconnect
- [ ]  Load ship state on reconnect
- [ ]  Persist star system state to PostgreSQL

### Phase 2 — Combat & Danger (Weeks 9–12)

<aside>
⚔️

**Goal:** Add combat drones, pirates, death, and PvP. The galaxy becomes dangerous.

</aside>

- [ ]  Implement Gun Drone module (fire rate, bullet creation, ammo consumption)
- [ ]  Implement projectile entities (position, velocity, per-tick movement, collision check)
- [ ]  Implement damage model (shields absorb first → hull)
- [ ]  Implement death (ship destroyed → respawn at home station → 20% cargo loss)
- [ ]  Implement NPC pirate (spawn in system, aggro within range, pursuit AI, loot drop on death)
- [ ]  Implement pirate respawn timer
- [ ]  Implement friendly fire (projectiles hit any ship in path)
- [ ]  Implement ammunition purchase at trade station
- [ ]  Implement `Set Home Station` dock menu option
- [ ]  Combat event messages in chat/event feed ("You hit Pirate for 10 damage", "Your shields are down!")

### Phase 3 — Exploration & Galaxy (Weeks 13–16)

<aside>
🌌

**Goal:** Break out of the starting system. Procedural galaxy, hyper-lanes, fog of war.

</aside>

- [ ]  Implement `deep-scan` command (generate hyper-lane metadata for current system)
- [ ]  Implement procedural star system generation (archetype-weighted: resource-rich, civilized, dangerous, barren)
- [ ]  Implement `jtarget` + `jump` commands (fuel cost = hyper-lane distance, transition between systems)
- [ ]  Implement jump fuel (Hydrogen-based consumption)
- [ ]  Implement per-player star chart (visited systems + scanned objects, persisted)
- [ ]  Implement fuel purchase at trade stations
- [ ]  Implement system-specific chat channels (only players in same system see messages)
- [ ]  Ensure generation rules: no dead-end systems, every system has ≥1 harvestable source

### Phase 4 — Polish & Balance (Weeks 17–20)

<aside>
✨

**Goal:** Make it feel good. Balance the economy. Squash bugs. Play with friends.

</aside>

- [ ]  Playtesting sessions with friends
- [ ]  Economy balance pass (resource spawn rates, prices, upgrade costs, session pacing)
- [ ]  Combat balance pass (pirate difficulty, weapon damage, shield HP)
- [ ]  Power budget tuning (can players run everything? should they have to choose?)
- [ ]  Travel time tuning (how long does it take to cross a system? jump between systems?)
- [ ]  Client UX polish (radar readability, status panel clarity, command feedback)
- [ ]  Error handling and edge cases (disconnect during jump, death while docked, etc.)
- [ ]  Player-to-player trade (`interact <player>` → trade menu)
- [ ]  Admin commands (spawn objects, reset systems, kick players)

---

## Future Versions (Post-MVP)

### v1.1 — Specialization

- Specialized resource drones (non-metal, gas, mineral, metal harvesters at full efficiency)
- Ship class upgrades (more module slots, larger cargo, new drone slot count)
- Tier 2 resources (C, N, Na, Mg, Al, Ne, Ar)
- Module upgrade trees (Mk I → Mk II → Mk III with increasing costs)

### v1.2 — Expanded Combat

- Laser Drones (draw PU per shot, no ammo — power budget tradeoff)
- Missile Drones (high damage, slow fire rate, expensive ammo)
- Shield regeneration (slow, draws PU)
- NPC military patrols in civilized systems
- NPC aggro retaliation on accidental hits

### v2.0 — Society

- **Factions** — player-created guilds/companies + world factions (NPC civilizations)
- **Reputation system** — per-faction rep tracked as a number, gained/lost through actions
- **Diplomacy** — invite to faction, declare war/peace, trade agreements
- **Missions** — procedurally generated tasks (deliver X to Y, destroy pirate Z, scan system W)
- **Exploration drones** — auto-scan, extend sensor range

### v3.0 — Civilization

- **Player housing** — shared space stations, built and maintained by players
- **Transition metals** — endgame resources in dangerous deep-space systems
- **Module crafting** — combine resources into custom module variants
- **Economy dynamics** — station prices fluctuate based on supply/demand
- **Merchant convoys** — NPC trade ships that travel hyper-lanes, can be pirated or protected

---

## Open Design Questions

These are recorded for future resolution — they do not block MVP.

1. **Unit scale** — What does 1 unit represent? How far across is a star system? This determines travel feel and session pacing. Needs playtesting.
2. **Pirate scaling** — Do pirates in further-from-start systems get harder? Or is danger uniform?
3. **Resource depletion** — Do asteroids/gas clouds run out? Or are they infinite? Depletion adds depth but could frustrate solo players.
4. **Multiple home stations** — Or just one at a time? One at a time is simplest.
5. **Offline persistence** — Do drones keep harvesting if you disconnect? Or does everything pause for that player?
6. **Station inventory** — Do stations have limited stock of ammo/fuel? Or infinite supply? Limited stock is more interesting but harder to balance for 10 players.