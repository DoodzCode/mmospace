# Implementation Spec: S1-WIRE-03 — Rust Wire Serde Structs

## 🆔 Task ID
`S1-WIRE-03` (shared-wire-rs-types)

## 🎯 Objective
Implement Rust structs with `serde` for JSON serialization/deserialization. These structs must map perfectly to the JSON schema defined in `wire-protocol.md`.

## 📁 File Location
`spacemud-client/src/wire/types.rs`

## 📋 Types to Implement
Define a Rust enum `WireMessage` with `#[derive(Serialize, Deserialize)]`.

1.  **Enums/Structs**:
    - `enum MessageType`: Map types (auth, command, tick_update, etc.)
    - `struct WorldObject`: `{ id: String, object_type: String, x: f32, y: f32, z: f32, properties: serde_json::Value }`
    - `struct HyperLane`: `{ target_system_id: String, distance: f32 }`
    - `struct ModuleStatus`: `{ slot: u8, module_type: String, active: bool, power: f32 }`
    - `struct MenuOption`: `{ label: String, action: String, cost: Option<u32> }`

2.  **Enum Variants**:
    - `Auth { token: String }`
    - `Command { text: String }`
    - `AuthOk { account_id: String }`
    - `TickUpdate { tick: u64, system_id: String, objects: Vec<WorldObject> }`
    - `ShipStatus { hull: f32, shield: f32, power: f32, cargo: HashMap<String, u32>, modules: Vec<ModuleStatus> }`
    - `Event { level: EventLevel, message: String }` (where `EventLevel` is an enum)
    - `ScanResult { target_id: String, properties: serde_json::Value }`
    - `DeepScanResult { lanes: Vec<HyperLane> }`
    - `DockState { station_id: String, menu: Vec<MenuOption> }`

## ✅ Acceptance Criteria
1.  File exists at `spacemud-client/src/wire/types.rs`.
2.  All structs/enums implement `Serialize` and `Deserialize`.
3.  The file compiles successfully with `cargo build`.
4.  Snake_case is used for fields, mapping correctly to camelCase JSON using `#[serde(rename_all = "camelCase")]`.

## 🧪 Verification
1.  Run `cargo check` in `spacemud-client`.
2.  Write a simple test using `serde_json::from_str` with a sample `tick_update` string.
