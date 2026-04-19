# Contributing to Space MUD

Welcome, Pilot. Whether you are a human developer or an AI agent, this guide outlines how we build this persistent, text-based galaxy.

## 🌌 Architecture Overview

The project is split into two distinct repositories (or directories) to maintain a clean separation of concerns:

- **Server (`spacemud-server`):** Node.js/Bun, TypeScript, PostgreSQL (Drizzle), Redis. Handles the tick loop, game logic, and world state.
- **Client (`spacemud-client`):** Rust, Ratatui, Crossterm. Handles TUI rendering, command input, and HUD updates.

**The "Contract":** All communication happens via JSON over WebSockets. The `Wire Protocol Schema` is the single source of truth. No changes to the protocol should be made without agreement from both "sides" of the stack.

## 🛠 Development Workflow (Spec-First)

We follow a rigorous pipeline to ensure consistency between the client and server:

1.  **System Spec:** High-level intent and data structures (usually in Notion or `DOCS.md`).
2.  **Implementation Spec:** Detailed technical breakdown (Function signatures, exact JSON payloads, state machines) placed in the repository.
3.  **Implementation:** Code is written ONLY after the Implementation Spec is finalized.
4.  **Validation:** Every feature must include automated tests and be verified against the Wire Protocol.

## 🤖 Guidance for AI Agents

When acting as a developer on this project:
- **Context is King:** Always read the `PROPOSAL.md` and the relevant `Implementation Spec` before writing code.
- **Stay Surgical:** Use `replace` for targeted edits. Do not refactor unrelated systems unless explicitly asked.
- **Strict Typing:** In TypeScript, use Drizzle for DB safety. In Rust, leverage `serde` for robust deserialization.
- **Test Before Completion:** Never mark a task as done without running the test suite (Rust `cargo test`, TS `bun test`).

## 💻 Technical Standards

### Rust (Client)
- Use idiomatic Rust (clippy is your friend).
- Keep rendering logic (Ratatui) separate from network logic (Tungstenite).
- All server messages must be safely deserialized into strongly-typed structs.

### TypeScript (Server)
- Use Bun for development and testing.
- Drizzle ORM is mandatory for all database interactions.
- The Game Loop (3s tick) must remain non-blocking.

## 🚀 Getting Started

1.  **Sync the Protocol:** Ensure your local copy of the wire protocol matches the current design.
2.  **Pick a Spec:** Check the `Roadmap` in `PROPOSAL.md` for the current Phase's pending tasks.
3.  **Create a Branch:** Work in feature branches (e.g., `feat/harvesting-logic`).
4.  **Update Docs:** If you change a game system, you MUST update the corresponding documentation.

---
*The galaxy doesn't care about you—but the codebase does. Write clean code.*
