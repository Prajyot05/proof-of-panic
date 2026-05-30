//! Protocol adapter layer for multi-market expansion.
//!
//! This provides a stable abstraction for normalizing different perpetual
//! protocol state models into the simulator's canonical Snapshot format.

use crate::types::*;

/// Normalized market metadata that adapters produce.
#[derive(Debug, Clone)]
pub struct MarketEnvelope {
    pub market_name: String,
    pub snapshot: Snapshot,
}

/// Trait for protocol-specific adapters.
pub trait ProtocolAdapter {
    fn market_name(&self) -> &'static str;
    fn normalize(&self, snapshot: Snapshot) -> MarketEnvelope {
        MarketEnvelope {
            market_name: self.market_name().to_string(),
            snapshot,
        }
    }
}

/// Reference adapter for the current Proof of Panic simulation model.
#[derive(Debug, Default, Clone)]
pub struct ReferenceAdapter;

impl ProtocolAdapter for ReferenceAdapter {
    fn market_name(&self) -> &'static str {
        "proof-of-panic-reference"
    }
}

/// Manifest entry describing a supported protocol integration target.
#[derive(Debug, Clone)]
pub struct AdapterManifestEntry {
    pub protocol: &'static str,
    pub market_name: &'static str,
    pub status: &'static str,
}

pub fn adapter_manifest() -> Vec<AdapterManifestEntry> {
    vec![
        AdapterManifestEntry {
            protocol: "reference",
            market_name: "proof-of-panic-reference",
            status: "active",
        },
        AdapterManifestEntry {
            protocol: "drift",
            market_name: "drift-perp",
            status: "planned",
        },
        AdapterManifestEntry {
            protocol: "vertex",
            market_name: "vertex-perp",
            status: "planned",
        },
    ]
}
