# Implementation Spec: S1-WIRE-01 — Shared Wire Protocol

## 🆔 Task ID
`S1-WIRE-01` (shared-wire-schema)

## 🎯 Objective
Create a single, authoritative markdown document that defines every server→client and client→server message type for the Space MUD MVP. This document is the "contract" that ensures the TypeScript server and Rust client can communicate reliably.

## 📁 File Location
`spacemud-shared/wire-protocol.md`

## 📋 Message Types to Define

### Client → Server
1.  **`auth`**: `{ type: "auth", token: string }`
2.  **`command`**: `{ type: "command", text: string }`

### Server → Client
1.  **`auth_ok`**: `{ type: "auth_ok", accountId: string }`
2.  **`tick_update`**: `{ type: "tick_update", tick: number, systemId: string, objects: WorldObject[] }`
3.  **`ship_status`**: `{ type: "ship_status", hull: number, shield: number, power: number, cargo: Record<string, number>, modules: ModuleStatus[] }`
4.  **`event`**: `{ type: "event", level: "info" | "warning" | "error" | "death", message: string }`
5.  **`scan_result`**: `{ type: "scan_result", targetId: string, properties: ObjectProperties }`
6.  **`deep_scan_result`**: `{ type: "deep_scan_result", lanes: HyperLane[] }`
7.  **`dock_state`**: `{ type: "dock_state", stationId: string, menu: MenuOption[] }`

## ✅ Acceptance Criteria
1.  The document exists at `spacemud-shared/wire-protocol.md`.
2.  Every message type above is documented with:
    - **Fields**: Name, type (string, number, array, etc.), and description.
    - **Example Payload**: A JSON block showing a valid message.
3.  Common types (e.g., `WorldObject`, `HyperLane`) are defined in a "Shared Types" section.
4.  The protocol version is set to `0.1.0`.

## 🧪 Verification
1.  Verify that all 9 message types specified above are documented.
2.  Manually validate that the example JSON payloads are syntactically correct.
