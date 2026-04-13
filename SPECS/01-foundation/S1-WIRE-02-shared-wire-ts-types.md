# Implementation Spec: S1-WIRE-02 — TypeScript Wire Type Definitions

## 🆔 Task ID
`S1-WIRE-02` (shared-wire-ts-types)

## 🎯 Objective
Create a TypeScript type definition file in the server repository that mirrors the `wire-protocol.md` schema. These types will ensure type safety for all WebSocket communication on the backend.

## 📁 File Location
`spacemud-server/src/types/wire.ts`

## 📋 Types to Implement
Define a discriminated union `WireMessage` where the `type` field is the discriminator.

1.  **Interfaces/Types**:
    - `WorldObject`: `{ id: string, type: string, x: number, y: number, z: number, properties: any }`
    - `HyperLane`: `{ targetSystemId: string, distance: number }`
    - `ModuleStatus`: `{ slot: number, type: string, active: boolean, power: number }`
    - `MenuOption`: `{ label: string, action: string, cost?: number }`

2.  **Message Interfaces**:
    - `AuthMessage`, `CommandMessage` (Client -> Server)
    - `AuthOkMessage`, `TickUpdateMessage`, `ShipStatusMessage`, `EventMessage`, `ScanResultMessage`, `DeepScanResultMessage`, `DockStateMessage` (Server -> Client)

## ✅ Acceptance Criteria
1.  File exists at `spacemud-server/src/types/wire.ts`.
2.  The code exports a `WireMessage` union type.
3.  All types from `S1-WIRE-01` are accurately represented.
4.  The file passes `tsc --noEmit` validation (no syntax errors).

## 🧪 Verification
1.  Compile with `bun build` or `tsc`.
2.  Verify that a mock message object correctly triggers TypeScript errors if fields are missing or mistyped.
