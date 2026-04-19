# INSTRUCTION: Space MUD — Development Outline, Roadmap & Sprint Plan

You are a senior technical project manager and game systems architect. Your task is to take the **Space MUD Game Proposal & Roadmap** (provided below or in the repo as `PROPOSAL.md`) and produce three deliverables:

---

## Deliverable 1: Development Outline

A hierarchical breakdown of every buildable system, organized by **workstream** (Server vs Client), then by **system** (e.g., Tick Engine, Ship System, Economy), then by **module/component**.

For each leaf-level component, specify:
- **Description**: 1–2 sentences on what it does.
- **Owner**: `server` or `client` (or `shared` for wire protocol).
- **Dependencies**: Which other components must exist first (by ID).
- **Inputs/Outputs**: What data it consumes and produces (reference wire protocol message types or DB tables).
- **Estimated complexity**: `S` (< 1 day), `M` (1–3 days), `L` (3–5 days), `XL` (5+ days). Assume a single developer with Claude Code agent-teams assisting.
- **Acceptance criteria**: 2–4 concrete, testable statements (e.g., "Player can dock at a station within ≤10 units and sees the dock menu").

Use this ID scheme: `[workstream]-[system]-[component]`, e.g., `server-tick-movement`, `client-hud-radar`, `shared-wire-tick_update`.

---

## Deliverable 2: Dependency-Ordered Roadmap

Flatten the outline into a **linear, dependency-respecting build order**. Group into **phases** that align with the proposal's existing phases (Phase 0–4) but break them into finer milestones:

- Each **milestone** is a playable or testable state of the system (e.g., "Client connects, authenticates, and receives empty tick broadcasts").
- For each milestone, list:
  - The components (by ID) included.
  - A **milestone demo statement**: What a developer can do/see when this milestone is complete.
  - **Estimated duration** (in dev-days, per workstream).
  - **Risk flags**: Anything that could block or surprise (e.g., "3D coordinate math tuning may need iteration").

Highlight the **critical path** — the longest chain of dependent work that determines the minimum project duration.

---

## Deliverable 3: Sprint Plan

Convert the roadmap into **2-week sprints** (10 working days each). Assume:
- **2 developers**: Dev A (Server/TypeScript) and Dev B (Client/Rust).
- Each dev works **~6 productive hours/day** with Claude Code agent-teams.
- Shared work (wire protocol, integration testing) is split or pair-programmed.
- Each sprint has a **sprint goal** (1 sentence), a **demo target**, and a task list per developer.

Format each sprint as:

### Sprint N: [Name] (Weeks X–Y)
**Goal:** [1-sentence sprint goal]
**Demo:** [What can be shown at sprint review]

#### Dev A (Server)
- [ ] [component-id] — [brief description] — [S/M/L/XL]
- [ ] ...

#### Dev B (Client)
- [ ] [component-id] — [brief description] — [S/M/L/XL]
- [ ] ...

#### Shared
- [ ] [component-id] — [brief description] — [S/M/L/XL]

**Integration checkpoint:** [What both devs test together at end of sprint]
**Risks:** [Anything to watch]

---

## Constraints & Guidelines

1. **Wire protocol is Sprint 1, Task 1.** Nothing else starts until message schemas are defined and committed to a shared location both repos import or reference.
2. **DB schema is Sprint 1, Task 2 (Server).** Drizzle schema files for PostgreSQL + Redis key patterns.
3. **Vertical slices over horizontal layers.** Prefer "player can move and see movement on HUD" over "server movement system is complete but client can't render it." Every sprint should ideally produce something both devs can test end-to-end.
4. **Spec-first development.** Each sprint's first day should produce or refine the system spec (data types, wire messages, state machines, algorithm pseudocode, edge cases, test scenarios) for that sprint's components. The spec is the input to Claude Code agent-teams.
5. **MVP scope only.** Do not plan work for v1.1, v1.2, v2.0, or v3.0 features. If a system has MVP and post-MVP variants (e.g., Starter Drone now, specialized drones later), only plan the MVP variant.
6. **Test scenarios per component.** Each component in the outline must include at least 3 concrete test scenarios suitable for automated or manual testing.
7. **The proposal's open design questions (unit scale, pirate scaling, resource depletion, etc.) should be resolved in Sprint 1** as design spikes with placeholder values that can be tuned in Phase 4.

---

## Context from the Proposal

Key numbers to reference:
- **Tick rate:** 3 seconds
- **Max objects per system:** ~50
- **Players:** ~10
- **MVP resources:** H, He, Li, B
- **MVP combat:** Gun Drone only
- **MVP NPCs:** Pirates + Trade Stations
- **Distance thresholds:** Scan ≤500, Combat ≤100, Mining ≤20, Dock ≤10, Hit ≤5
- **Death penalty:** 20% cargo loss, respawn at home station, no credit/module loss
- **Session target:** 30–60 minutes
- **Stack:** Bun/Node + Fastify + ws + Drizzle + PostgreSQL + Redis (server), Rust + ratatui + crossterm + tungstenite (client)

---

## Output Format

Return all three deliverables in a single Markdown document with clear `# Deliverable 1`, `# Deliverable 2`, `# Deliverable 3` sections. Use tables, task lists, and code blocks where appropriate. Be specific and actionable — this document will be handed directly to Claude Code agent-teams as their project plan.