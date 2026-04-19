use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Shared enums ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DangerLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventLevel {
    Info,
    Warning,
    Error,
    Death,
}

// ── Shared structs ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldObject {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub faction: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HyperLane {
    pub id: String,
    pub target_id: String,
    pub target_name: String,
    pub distance: f64,
    pub danger: DangerLevel,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleStatus {
    pub id: String,
    pub name: String,
    pub online: bool,
    pub integrity: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuOption {
    pub id: String,
    pub label: String,
    pub enabled: bool,
}

/// Key-value property bag returned by a standard scan.
/// All values are strings; non-string data is serialized as strings.
pub type ObjectProperties = HashMap<String, String>;

// ── Wire message enum ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WireMessage {
    // Client → Server
    Auth {
        token: String,
    },
    Command {
        text: String,
    },

    // Server → Client
    AuthOk {
        // NOTE: serde's rename_all on the enum only renames variant tag values (the "type" field),
        // NOT fields inside variants. Each camelCase field inside a variant needs an explicit rename.
        #[serde(rename = "accountId")]
        account_id: String,
    },
    AuthErr {
        reason: String,
    },
    TickUpdate {
        tick: u64,
        #[serde(rename = "systemId")]
        system_id: String,
        objects: Vec<WorldObject>,
    },
    ShipStatus {
        hull: f64,
        shield: f64,
        power: u32,
        cargo: HashMap<String, u32>,
        modules: Vec<ModuleStatus>,
    },
    Event {
        level: EventLevel,
        message: String,
    },
    ScanResult {
        #[serde(rename = "targetId")]
        target_id: String,
        properties: ObjectProperties,
    },
    DeepScanResult {
        #[serde(rename = "systemId")]
        system_id: String,
        lanes: Vec<HyperLane>,
    },
    DockState {
        #[serde(rename = "stationId")]
        station_id: String,
        menu: Vec<MenuOption>,
    },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tick_update_deserialize() {
        let json = r#"{"type":"tick_update","tick":1024,"systemId":"sys-sol","objects":[{"id":"obj-1","kind":"ship","name":"Fang","x":1.0,"y":2.0,"faction":"Raiders"}]}"#;
        let msg: WireMessage = serde_json::from_str(json).expect("deserialization failed");

        match msg {
            WireMessage::TickUpdate {
                tick,
                system_id,
                objects,
            } => {
                assert_eq!(tick, 1024);
                assert_eq!(system_id, "sys-sol");
                assert_eq!(objects.len(), 1);
            }
            other => panic!("expected TickUpdate, got {:?}", other),
        }
    }

    #[test]
    fn test_auth_serialize() {
        let msg = WireMessage::Auth {
            token: "tok".into(),
        };
        let json = serde_json::to_string(&msg).expect("serialization failed");
        assert!(json.contains(r#""type":"auth""#), "missing type field: {json}");
        assert!(json.contains(r#""token":"tok""#), "missing token field: {json}");
    }

    #[test]
    fn test_auth_ok_deserialize() {
        let json = r#"{"type":"auth_ok","accountId":"acc-001"}"#;
        let msg: WireMessage = serde_json::from_str(json).expect("deserialize auth_ok");
        match msg {
            WireMessage::AuthOk { account_id } => {
                assert_eq!(account_id, "acc-001");
            }
            _ => panic!("expected AuthOk variant"),
        }
    }
}
