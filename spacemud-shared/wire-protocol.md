# Space MUD Wire Protocol

**Version:** `0.1.0`

This document is the authoritative contract for all WebSocket messages exchanged between the TypeScript server and Rust client. Both sides must conform to this specification.

---

## Table of Contents

1. [Shared Types](#shared-types)
2. [Client → Server Messages](#client--server-messages)
   - [auth](#auth)
   - [command](#command)
3. [Server → Client Messages](#server--client-messages)
   - [auth_ok](#auth_ok)
   - [auth_err](#auth_err)
   - [tick_update](#tick_update)
   - [ship_status](#ship_status)
   - [event](#event)
   - [scan_result](#scan_result)
   - [deep_scan_result](#deep_scan_result)
   - [dock_state](#dock_state)

---

## Shared Types

### `WorldObject`

Represents any object present in a star system.

| Field      | Type     | Description                                      |
|------------|----------|--------------------------------------------------|
| `id`       | `string` | Unique identifier for this object.               |
| `kind`     | `string` | Object category: `"ship"`, `"station"`, `"asteroid"`, `"debris"`, etc. |
| `name`     | `string` | Display name.                                    |
| `x`        | `number` | X coordinate in system space.                    |
| `y`        | `number` | Y coordinate in system space.                    |
| `faction`  | `string \| null` | Controlling faction, or `null` if neutral. |

```json
{
  "id": "obj-7a3f",
  "kind": "ship",
  "name": "Serpent's Fang",
  "x": 412.5,
  "y": -87.0,
  "faction": "Void Raiders"
}
```

---

### `HyperLane`

Describes a navigable hyperspace lane connecting two star systems.

| Field        | Type     | Description                                       |
|--------------|----------|---------------------------------------------------|
| `id`         | `string` | Unique lane identifier.                           |
| `targetId`   | `string` | ID of the destination star system.                |
| `targetName` | `string` | Display name of the destination system.           |
| `distance`   | `number` | Travel distance in light-minutes.                 |
| `danger`     | `"low" \| "medium" \| "high"` | Reported hazard level for this lane. |

```json
{
  "id": "lane-001",
  "targetId": "sys-alpha-centauri",
  "targetName": "Alpha Centauri",
  "distance": 4.37,
  "danger": "low"
}
```

---

### `ModuleStatus`

Describes the operational status of a single ship module.

| Field       | Type      | Description                                     |
|-------------|-----------|-------------------------------------------------|
| `id`        | `string`  | Module identifier (e.g., `"weapons-1"`).        |
| `name`      | `string`  | Human-readable module name.                     |
| `online`    | `boolean` | Whether the module is currently powered on.     |
| `integrity` | `number`  | Percentage of structural integrity (0–100).     |

```json
{
  "id": "weapons-1",
  "name": "Pulse Cannon Mk II",
  "online": true,
  "integrity": 78
}
```

---

### `ObjectProperties`

A property bag returned by a standard scan. All values are `string` — non-string data (booleans, numbers) must be serialized as strings (e.g., `"true"`, `"42"`). This keeps the type uniform across languages and avoids ambiguity in scan results.

| Field        | Type                      | Description                              |
|--------------|---------------------------|------------------------------------------|
| `[key: string]` | `string`               | Arbitrary key-value properties of the scanned object (e.g., hull rating, faction, cargo manifest). |

```json
{
  "hull_rating": "heavy",
  "faction": "Merchants Guild",
  "shield_class": "Type-3",
  "cargo_visible": "false"
}
```

---

### `MenuOption`

A selectable option in a station docking menu.

| Field    | Type     | Description                                        |
|----------|----------|----------------------------------------------------|
| `id`     | `string` | Unique option identifier used in follow-up commands. |
| `label`  | `string` | Display text shown to the player.                  |
| `enabled`| `boolean`| Whether the option is currently selectable.        |

```json
{
  "id": "repair",
  "label": "Repair Hull",
  "enabled": true
}
```

---

## Client → Server Messages

### `auth`

Sent immediately after the WebSocket connection is established to authenticate the session.

| Field   | Type     | Description                          |
|---------|----------|--------------------------------------|
| `type`  | `string` | Always `"auth"`.                     |
| `token` | `string` | Bearer token issued by the auth service. |

**Example Payload:**

```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhY2MtMDAxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

> Note: Token is illustrative. Implementations must accept any well-formed JWT issued by the auth service.

---

### `command`

Sends a text command from the player to the server for processing (e.g., `"scan target-42"`, `"dock"`, `"jump alpha-centauri"`).

| Field  | Type     | Description                                   |
|--------|----------|-----------------------------------------------|
| `type` | `string` | Always `"command"`.                           |
| `text` | `string` | Raw command string entered by the player.     |

**Example Payload:**

```json
{
  "type": "command",
  "text": "scan obj-7a3f"
}
```

---

## Server → Client Messages

### `auth_ok`

Sent by the server upon successful authentication.

| Field       | Type     | Description                              |
|-------------|----------|------------------------------------------|
| `type`      | `string` | Always `"auth_ok"`.                      |
| `accountId` | `string` | The authenticated account's unique ID.   |

**Example Payload:**

```json
{
  "type": "auth_ok",
  "accountId": "acc-001"
}
```

---

### `auth_err`

Sent by the server when authentication fails, immediately before closing the connection.

| Field    | Type     | Description                                      |
|----------|----------|--------------------------------------------------|
| `type`   | `string` | Always `"auth_err"`.                             |
| `reason` | `string` | Human-readable description of the auth failure.  |

**Example Payload:**

```json
{
  "type": "auth_err",
  "reason": "Token expired."
}
```

---

### `tick_update`

Broadcast each server tick with the current state of all objects in the player's star system.

| Field      | Type            | Description                                          |
|------------|-----------------|------------------------------------------------------|
| `type`     | `string`        | Always `"tick_update"`.                              |
| `tick`     | `number`        | Monotonically increasing tick counter.               |
| `systemId` | `string`        | ID of the star system this snapshot describes.       |
| `objects`  | `WorldObject[]` | All objects present in the system (see visibility note below). |

> **Visibility:** The server sends **all objects present in the system** regardless of sensor range or faction. Client-side filtering (e.g., fog-of-war) is not applied at the protocol level in MVP `0.1.0`. This may be scoped by sensor range in a future protocol version.

**Example Payload:**

```json
{
  "type": "tick_update",
  "tick": 1024,
  "systemId": "sys-sol",
  "objects": [
    {
      "id": "obj-7a3f",
      "kind": "ship",
      "name": "Serpent's Fang",
      "x": 412.5,
      "y": -87.0,
      "faction": "Void Raiders"
    },
    {
      "id": "obj-sta-01",
      "kind": "station",
      "name": "Olympus Station",
      "x": 0.0,
      "y": 0.0,
      "faction": "Sol Authority"
    }
  ]
}
```

---

### `ship_status`

Sent whenever the player's ship stats change (hull damage, shield fluctuation, power shift, cargo update, or module state change).

| Field     | Type                       | Description                                      |
|-----------|----------------------------|--------------------------------------------------|
| `type`    | `string`                   | Always `"ship_status"`.                          |
| `hull`    | `number`                   | Current hull integrity (0–100).                  |
| `shield`  | `number`                   | Current shield strength (0–100).                 |
| `power`   | `number`                   | Available power units (non-negative integer).    |
| `cargo`   | `Record<string, number>`   | Map of cargo item name to quantity held.         |
| `modules` | `ModuleStatus[]`           | Status of each installed module.                 |

**Example Payload:**

```json
{
  "type": "ship_status",
  "hull": 85,
  "shield": 60,
  "power": 12,
  "cargo": {
    "iron_ore": 40,
    "fuel_cells": 5
  },
  "modules": [
    {
      "id": "weapons-1",
      "name": "Pulse Cannon Mk II",
      "online": true,
      "integrity": 78
    },
    {
      "id": "engines-1",
      "name": "Ion Drive",
      "online": true,
      "integrity": 100
    }
  ]
}
```

---

### `event`

A narrative or system notification pushed to the player's event log.

| Field     | Type                                         | Description                                        |
|-----------|----------------------------------------------|----------------------------------------------------|
| `type`    | `string`                                     | Always `"event"`.                                  |
| `level`   | `"info" \| "warning" \| "error" \| "death"` | Severity / category of the event.                  |
| `message` | `string`                                     | Human-readable event text displayed to the player. |

**Level meanings:**

| Level     | Meaning                                                    |
|-----------|------------------------------------------------------------|
| `info`    | Routine notification (docked, jumped, cargo collected).    |
| `warning` | Action advised (shield low, hostile nearby).               |
| `error`   | Action failed (command rejected, insufficient power).      |
| `death`   | Player ship was destroyed; triggers respawn flow.          |

**Example Payload:**

```json
{
  "type": "event",
  "level": "warning",
  "message": "Hull integrity critical — seek repairs immediately."
}
```

---

### `scan_result`

Response to a `command` of type `scan`. Returns observable properties of a targeted object.

| Field        | Type               | Description                                       |
|--------------|--------------------|---------------------------------------------------|
| `type`       | `string`           | Always `"scan_result"`.                           |
| `targetId`   | `string`           | ID of the object that was scanned.                |
| `properties` | `ObjectProperties` | Key-value map of the object's observable traits.  |

**Example Payload:**

```json
{
  "type": "scan_result",
  "targetId": "obj-7a3f",
  "properties": {
    "hull_rating": "heavy",
    "faction": "Void Raiders",
    "shield_class": "Type-3",
    "cargo_visible": "false"
  }
}
```

---

### `deep_scan_result`

Response to a deep-scan command. Returns all hyperspace lanes navigable from the player's current system.

| Field      | Type          | Description                                                   |
|------------|---------------|---------------------------------------------------------------|
| `type`     | `string`      | Always `"deep_scan_result"`.                                  |
| `systemId` | `string`      | ID of the star system these lanes originate from.             |
| `lanes`    | `HyperLane[]` | Array of hyperspace lanes accessible from the current system. |

**Example Payload:**

```json
{
  "type": "deep_scan_result",
  "systemId": "sys-sol",
  "lanes": [
    {
      "id": "lane-001",
      "targetId": "sys-alpha-centauri",
      "targetName": "Alpha Centauri",
      "distance": 4.37,
      "danger": "low"
    },
    {
      "id": "lane-002",
      "targetId": "sys-barnards-star",
      "targetName": "Barnard's Star",
      "distance": 5.96,
      "danger": "high"
    }
  ]
}
```

---

### `dock_state`

Sent when the player successfully docks at a station. Delivers the station's interactive menu.

| Field       | Type           | Description                                             |
|-------------|----------------|---------------------------------------------------------|
| `type`      | `string`       | Always `"dock_state"`.                                  |
| `stationId` | `string`       | ID of the station the player has docked with.           |
| `menu`      | `MenuOption[]` | List of actions available at this station.              |

**Example Payload:**

```json
{
  "type": "dock_state",
  "stationId": "obj-sta-01",
  "menu": [
    {
      "id": "repair",
      "label": "Repair Hull",
      "enabled": true
    },
    {
      "id": "refuel",
      "label": "Refuel",
      "enabled": true
    },
    {
      "id": "market",
      "label": "Trade Goods",
      "enabled": true
    },
    {
      "id": "hangar",
      "label": "Ship Upgrades",
      "enabled": false
    }
  ]
}
```

---

## Protocol Notes

- All messages are JSON-encoded UTF-8 text frames over WebSocket.
- The client must send `auth` as its first message. The server will close the connection if any other message type is received before authentication succeeds.
- On auth failure the server sends an `auth_err` message then closes the WebSocket with code `4001`.
- Field names use `camelCase` throughout.
- Unknown fields in any message must be silently ignored by both sides to allow forward-compatible extensions.
