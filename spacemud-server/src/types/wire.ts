// Wire protocol type definitions for Space MUD
// Authoritative source: spacemud-shared/wire-protocol.md
// Protocol version: 0.1.0

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface WorldObject {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  faction: string | null;
}

export interface HyperLane {
  id: string;
  targetId: string;
  targetName: string;
  distance: number;
  danger: "low" | "medium" | "high";
}

export interface ModuleStatus {
  id: string;
  name: string;
  online: boolean;
  integrity: number;
}

export type ObjectProperties = Record<string, string>;

export interface MenuOption {
  id: string;
  label: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Client → Server Messages
// ---------------------------------------------------------------------------

export interface AuthMessage {
  type: "auth";
  token: string;
}

export interface CommandMessage {
  type: "command";
  text: string;
}

// ---------------------------------------------------------------------------
// Server → Client Messages
// ---------------------------------------------------------------------------

export interface AuthOkMessage {
  type: "auth_ok";
  accountId: string;
}

export interface AuthErrMessage {
  type: "auth_err";
  reason: string;
}

export interface TickUpdateMessage {
  type: "tick_update";
  tick: number;
  systemId: string;
  objects: WorldObject[];
}

export interface ShipStatusMessage {
  type: "ship_status";
  hull: number;
  shield: number;
  power: number;
  cargo: Record<string, number>;
  modules: ModuleStatus[];
}

export interface EventMessage {
  type: "event";
  level: "info" | "warning" | "error" | "death";
  message: string;
}

export interface ScanResultMessage {
  type: "scan_result";
  targetId: string;
  properties: ObjectProperties;
}

export interface DeepScanResultMessage {
  type: "deep_scan_result";
  systemId: string;
  lanes: HyperLane[];
}

export interface DockStateMessage {
  type: "dock_state";
  stationId: string;
  menu: MenuOption[];
}

// ---------------------------------------------------------------------------
// Discriminated Unions
// ---------------------------------------------------------------------------

export type ClientMessage = AuthMessage | CommandMessage;

export type ServerMessage =
  | AuthOkMessage
  | AuthErrMessage
  | TickUpdateMessage
  | ShipStatusMessage
  | EventMessage
  | ScanResultMessage
  | DeepScanResultMessage
  | DockStateMessage;

export type WireMessage = ClientMessage | ServerMessage;
