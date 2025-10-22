use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{storable::Bound, Storable};
use serde::Serialize;
use std::borrow::Cow;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorablePrincipal(pub Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(Principal::from_slice(bytes.as_ref()))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AgreementSnapshot {
    pub token_id: Principal,
    pub station_id: Principal,
    pub data: String, // JSON stringified agreement data
    pub created_at: u64,
    pub updated_at: u64,
    pub version: u32,
}

impl Storable for AgreementSnapshot {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode AgreementSnapshot"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(bytes.as_ref()).expect("Failed to decode AgreementSnapshot")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 5_000_000, // 5MB max for agreement data
        is_fixed_size: false,
    };
}
