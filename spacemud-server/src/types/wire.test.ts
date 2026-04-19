import { describe, expect, it, test } from "vitest";
import type {
  WorldObject,
  HyperLane,
  ModuleStatus,
  MenuOption,
  AuthMessage,
  CommandMessage,
  AuthOkMessage,
  AuthErrMessage,
  TickUpdateMessage,
  ShipStatusMessage,
  EventMessage,
  ScanResultMessage,
  DeepScanResultMessage,
  DockStateMessage,
  WireMessage,
  ObjectProperties,
} from "./wire";

// ---------------------------------------------------------------------------
// B. Negative compile-time tests (module scope — checked by tsc, not runtime)
// ---------------------------------------------------------------------------

// Missing required field: AuthMessage without `token`
// @ts-expect-error missing token field
const _badAuth: AuthMessage = { type: "auth" };

// Wrong field type: `tick` should be number, not string
const _badTick: TickUpdateMessage = {
  type: "tick_update",
  // @ts-expect-error tick must be a number
  tick: "not-a-number",
  systemId: "sys-1",
  objects: [],
};

// Invalid union literal: danger must be "low" | "medium" | "high"
const _badLane: HyperLane = {
  id: "lane-1",
  targetId: "sys-2",
  targetName: "Alpha",
  distance: 4.2,
  // @ts-expect-error "extreme" is not a valid danger value
  danger: "extreme",
};

// faction must be string | null, not a number
const _badFaction: WorldObject = {
  id: "obj-1",
  kind: "station",
  name: "Orbis",
  x: 0,
  y: 0,
  // @ts-expect-error faction must be string | null
  faction: 123,
};

// level must be "info" | "warning" | "error" | "death"
const _badEventLevel: EventMessage = {
  type: "event",
  // @ts-expect-error "critical" is not a valid event level
  level: "critical",
  message: "something happened",
};

// ---------------------------------------------------------------------------
// C. Discriminated union narrowing helper (compile-time + runtime)
// ---------------------------------------------------------------------------

function describeMessage(msg: WireMessage): string {
  switch (msg.type) {
    case "auth":
      return `auth token=${msg.token}`;
    case "command":
      return `command text=${msg.text}`;
    case "auth_ok":
      return `auth_ok accountId=${msg.accountId}`;
    case "auth_err":
      return `auth_err reason=${msg.reason}`;
    case "tick_update":
      return `tick_update tick=${msg.tick}`;
    case "ship_status":
      return `ship_status hull=${msg.hull}`;
    case "event":
      return `event level=${msg.level}`;
    case "scan_result":
      return `scan_result targetId=${msg.targetId}`;
    case "deep_scan_result":
      return `deep_scan_result systemId=${msg.systemId}`;
    case "dock_state":
      return `dock_state stationId=${msg.stationId}`;
    default: {
      const _exhaustive: never = msg;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// A. Positive runtime tests — shared types
// ---------------------------------------------------------------------------

describe("wire.ts — shared types", () => {
  it("WorldObject has correct shape", () => {
    const obj: WorldObject = {
      id: "w-1",
      kind: "asteroid",
      name: "Rock",
      x: 10,
      y: 20,
      faction: null,
    };
    expect(obj.id).toBe("w-1");
    expect(obj.faction).toBeNull();
  });

  it("HyperLane has correct shape", () => {
    const lane: HyperLane = {
      id: "lane-1",
      targetId: "sys-2",
      targetName: "Beta",
      distance: 3.5,
      danger: "medium",
    };
    expect(lane.danger).toBe("medium");

    const laneLow: HyperLane = {
      id: "lane-2",
      targetId: "sys-3",
      targetName: "Gamma",
      distance: 1.0,
      danger: "low",
    };
    expect(laneLow.danger).toBe("low");

    const laneHigh: HyperLane = {
      id: "lane-3",
      targetId: "sys-4",
      targetName: "Delta",
      distance: 9.9,
      danger: "high",
    };
    expect(laneHigh.danger).toBe("high");
  });

  it("ModuleStatus has correct shape", () => {
    const mod: ModuleStatus = {
      id: "mod-1",
      name: "Shields",
      online: true,
      integrity: 95,
    };
    expect(mod.online).toBe(true);
    expect(mod.integrity).toBe(95);
  });

  it("MenuOption has correct shape", () => {
    const option: MenuOption = { id: "opt-1", label: "Refuel", enabled: true };
    expect(option.enabled).toBe(true);
  });

  it("ObjectProperties is a Record<string, string>", () => {
    const props: ObjectProperties = { mass: "1000", class: "M" };
    expect(props["mass"]).toBe("1000");
  });
});

// ---------------------------------------------------------------------------
// A. Positive runtime tests — message types
// ---------------------------------------------------------------------------

describe("wire.ts — message type discriminants", () => {
  it("AuthMessage type is 'auth'", () => {
    const msg: AuthMessage = { type: "auth", token: "tok-abc" };
    expect(msg.type).toBe("auth");
    expect(msg.token).toBe("tok-abc");
  });

  it("CommandMessage type is 'command'", () => {
    const msg: CommandMessage = { type: "command", text: "go north" };
    expect(msg.type).toBe("command");
    expect(msg.text).toBe("go north");
  });

  it("AuthOkMessage type is 'auth_ok'", () => {
    const msg: AuthOkMessage = { type: "auth_ok", accountId: "acc-1" };
    expect(msg.type).toBe("auth_ok");
    expect(msg.accountId).toBe("acc-1");
  });

  it("AuthErrMessage type is 'auth_err'", () => {
    const msg: AuthErrMessage = { type: "auth_err", reason: "bad token" };
    expect(msg.type).toBe("auth_err");
    expect(msg.reason).toBe("bad token");
  });

  it("TickUpdateMessage type is 'tick_update'", () => {
    const msg: TickUpdateMessage = {
      type: "tick_update",
      tick: 42,
      systemId: "sys-1",
      objects: [],
    };
    expect(msg.type).toBe("tick_update");
    expect(msg.tick).toBe(42);
  });

  it("ShipStatusMessage type is 'ship_status'", () => {
    const msg: ShipStatusMessage = {
      type: "ship_status",
      hull: 100,
      shield: 80,
      power: 60,
      cargo: { iron: 5 },
      modules: [],
    };
    expect(msg.type).toBe("ship_status");
    expect(msg.hull).toBe(100);
  });

  it("EventMessage type is 'event'", () => {
    const msg: EventMessage = {
      type: "event",
      level: "warning",
      message: "hull integrity low",
    };
    expect(msg.type).toBe("event");
    expect(msg.level).toBe("warning");
  });

  it("ScanResultMessage type is 'scan_result'", () => {
    const msg: ScanResultMessage = {
      type: "scan_result",
      targetId: "obj-99",
      properties: { class: "X" },
    };
    expect(msg.type).toBe("scan_result");
    expect(msg.targetId).toBe("obj-99");
  });

  it("DeepScanResultMessage type is 'deep_scan_result'", () => {
    const msg: DeepScanResultMessage = {
      type: "deep_scan_result",
      systemId: "sys-7",
      lanes: [],
    };
    expect(msg.type).toBe("deep_scan_result");
    expect(msg.systemId).toBe("sys-7");
  });

  it("DockStateMessage type is 'dock_state'", () => {
    const msg: DockStateMessage = {
      type: "dock_state",
      stationId: "sta-3",
      menu: [],
    };
    expect(msg.type).toBe("dock_state");
    expect(msg.stationId).toBe("sta-3");
  });
});

// ---------------------------------------------------------------------------
// C. Discriminated union narrowing — runtime assertions
// ---------------------------------------------------------------------------

describe("wire.ts — WireMessage union narrowing", () => {
  test("narrows auth correctly", () => {
    const msg: WireMessage = { type: "auth", token: "t1" };
    expect(describeMessage(msg)).toBe("auth token=t1");
  });

  test("narrows tick_update correctly", () => {
    const msg: WireMessage = {
      type: "tick_update",
      tick: 7,
      systemId: "s1",
      objects: [],
    };
    expect(describeMessage(msg)).toBe("tick_update tick=7");
  });

  test("narrows event correctly", () => {
    const msg: WireMessage = { type: "event", level: "death", message: "you died" };
    expect(describeMessage(msg)).toBe("event level=death");
  });

  test("narrows dock_state correctly", () => {
    const msg: WireMessage = { type: "dock_state", stationId: "sta-1", menu: [] };
    expect(describeMessage(msg)).toBe("dock_state stationId=sta-1");
  });

  test("narrows command correctly", () => {
    const msg: WireMessage = { type: "command", text: "go south" };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });

  test("narrows auth_ok correctly", () => {
    const msg: WireMessage = { type: "auth_ok", accountId: "acc-2" };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });

  test("narrows auth_err correctly", () => {
    const msg: WireMessage = { type: "auth_err", reason: "expired" };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });

  test("narrows ship_status correctly", () => {
    const msg: WireMessage = {
      type: "ship_status",
      hull: 75,
      shield: 50,
      power: 40,
      cargo: {},
      modules: [],
    };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });

  test("narrows scan_result correctly", () => {
    const msg: WireMessage = {
      type: "scan_result",
      targetId: "obj-5",
      properties: {},
    };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });

  test("narrows deep_scan_result correctly", () => {
    const msg: WireMessage = {
      type: "deep_scan_result",
      systemId: "sys-9",
      lanes: [],
    };
    const result = describeMessage(msg);
    expect(result).toBeTruthy();
  });
});
