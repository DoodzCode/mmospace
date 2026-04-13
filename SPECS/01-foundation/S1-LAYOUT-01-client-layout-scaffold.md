# Implementation Spec: S1-LAYOUT-01 — Rust Client Project Scaffold

## 🆔 Task ID
`S1-LAYOUT-01` (client-layout-scaffold)

## 🎯 Objective
Initialize a new Rust binary project for the `spacemud-client`. This task involves setting up the foundation for TUI rendering and network communication using standard libraries.

## 📁 File Location
`spacemud-client/`

## 📋 Steps
1.  **Init**: `cargo init` in `spacemud-client/`.
2.  **Add Dependencies**:
    - `ratatui`, `crossterm`, `tungstenite`, `serde`, `serde_json`, `tokio`.
3.  **Entry Point**: `src/main.rs` should:
    - Set up a terminal and alternative screen using `crossterm`.
    - Enter a simple loop that listens for the 'q' key to quit.
    - Cleanly restore the terminal on exit (important).

## ✅ Acceptance Criteria
1.  `cargo run` in the `spacemud-client` directory opens a blank terminal screen.
2.  Pressing 'q' exits the application and returns the user to their shell prompt correctly.
3.  Project uses `tokio` for async.

## 🧪 Verification
1.  Verify the project builds with `cargo build`.
2.  Test that the terminal restores its original state (no leftover colors or cursor issues).
