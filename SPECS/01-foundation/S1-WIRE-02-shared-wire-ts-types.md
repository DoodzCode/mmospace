# Implementation Spec: S1-WIRE-02 — TypeScript Wire Type Definitions

## 🆔 Task ID
`S1-WIRE-02` (shared-wire-ts-types)

## 🎯 Objective
TypeScript interfaces and discriminated unions for every wire message defined in `wire-protocol.md`. Lives in the shared package so it can be imported by any TypeScript consumer without duplication.

## 📁 File Locations
- `spacemud-shared/types/wire.ts` — canonical source of all wire types
- `spacemud-shared/tsconfig.json` — validates shared types standalone under `tsc --strict`
- `spacemud-server/src/types/wire.ts` — re-export barrel (`export * from "../../../spacemud-shared/types/wire"`)

## 📋 Types Implemented

**Shared types:** `WorldObject`, `HyperLane`, `ModuleStatus`, `ObjectProperties`, `MenuOption`

**Client → Server:** `AuthMessage`, `CommandMessage`, `ClientMessage`

**Server → Client:** `AuthOkMessage`, `AuthErrMessage`, `TickUpdateMessage`, `ShipStatusMessage`, `EventMessage`, `ScanResultMessage`, `DeepScanResultMessage`, `DockStateMessage`, `ServerMessage`

**Top-level union:** `WireMessage = ClientMessage | ServerMessage`

## ✅ Acceptance Criteria
1. `spacemud-shared/types/wire.ts` exists and exports `WireMessage`.
2. `tsc --strict --noEmit` passes with zero errors on both shared and server packages.
3. No `any` anywhere in the type definitions.
4. Server imports types from the shared barrel without casting.
5. All 8 server→client and 2 client→server message types from `wire-protocol.md` v0.1.0 are represented.

## 🧪 Verification
- `bun /path/to/tsc -p spacemud-shared/tsconfig.json --noEmit` → clean
- `bun /path/to/tsc -p spacemud-server/tsconfig.json --noEmit` → clean
- `bun test` in `spacemud-server` runs `src/types/wire.test.ts` — all positive and `@ts-expect-error` negative tests pass.

## 📌 Status
✅ Complete — 2026-04-18
