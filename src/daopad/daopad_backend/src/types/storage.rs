use candid::Principal;
use ic_stable_structures::{Storable, storable::Bound};
use std::borrow::Cow;
use crate::types::OrbitStationInfo;

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

#[derive(Clone, Debug)]
pub struct StorableOrbitStation(pub OrbitStationInfo);

impl Storable for StorableOrbitStation {
    fn to_bytes(&self) -> Cow<[u8]> {
        let json = serde_json::to_string(&self.0).unwrap();
        Cow::Owned(json.into_bytes())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let json = String::from_utf8(bytes.to_vec()).unwrap();
        let info: OrbitStationInfo = serde_json::from_str(&json).unwrap();
        Self(info)
    }

    const BOUND: Bound = Bound::Unbounded;
}