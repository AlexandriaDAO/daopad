use candid::{Principal, CandidType, Decode, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;
use serde::Deserialize;

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

// Generic wrapper for Candid-serializable types
#[derive(Clone, Debug)]
pub struct StorableCandid<T: CandidType + for<'de> Deserialize<'de>>(pub T);

impl<T: CandidType + for<'de> Deserialize<'de>> Storable for StorableCandid<T> {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(Decode!(bytes.as_ref(), T).unwrap())
    }

    const BOUND: Bound = Bound::Unbounded;
}

// Tuple keys for stable storage
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PrincipalPair(pub Principal, pub Principal);

impl Storable for PrincipalPair {
    fn to_bytes(&self) -> Cow<[u8]> {
        let p1_bytes = self.0.as_slice();
        let p2_bytes = self.1.as_slice();
        let mut bytes = Vec::new();
        bytes.push(p1_bytes.len() as u8);  // Length prefix for first principal
        bytes.extend_from_slice(p1_bytes);
        bytes.extend_from_slice(p2_bytes);
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let len = bytes[0] as usize;
        let p1 = Principal::from_slice(&bytes[1..1+len]);
        let p2 = Principal::from_slice(&bytes[1+len..]);
        Self(p1, p2)
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 59, // 1 (length prefix) + 29 (p1) + 29 (p2)
        is_fixed_size: false,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorableString(pub String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.to_vec()).unwrap())
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 200, // Reasonable limit for proposal IDs
        is_fixed_size: false,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StringPrincipalPair(pub String, pub Principal);

impl Storable for StringPrincipalPair {
    fn to_bytes(&self) -> Cow<[u8]> {
        let str_bytes = self.0.as_bytes();
        let len = (str_bytes.len() as u16).to_le_bytes();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&len);
        bytes.extend_from_slice(str_bytes);
        bytes.extend_from_slice(self.1.as_slice());
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let len = u16::from_le_bytes([bytes[0], bytes[1]]) as usize;
        let s = String::from_utf8(bytes[2..2 + len].to_vec()).unwrap();
        let p = Principal::from_slice(&bytes[2 + len..]);
        Self(s, p)
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 231, // 2 (length) + 200 (string) + 29 (principal)
        is_fixed_size: false,
    };
}
