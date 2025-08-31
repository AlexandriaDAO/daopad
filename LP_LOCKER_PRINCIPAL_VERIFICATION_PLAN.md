# LP Locker Principal Verification System
> Allowing users to prove ownership of their LP Locker principals from within DAOPad

## Problem Statement
- Users have different principals on DAOPad vs LP Locker due to different derivation origins
- DAOPad cannot calculate what a user's LP Locker principal would be (requires secret salt)
- We need to prevent users from claiming LP Locker principals that aren't theirs

## Solution: Cryptographic Verification Flow

### Core Concept
While we cannot DERIVE the LP Locker principal, we CAN VERIFY ownership through a challenge-response signature mechanism.

## Implementation Plan

### 1. Backend Changes (DAOPad)

#### Add Principal Linking Storage
```rust
// In daopad backend
thread_local! {
    // Maps DAOPad principal -> verified LP Locker principal
    static VERIFIED_LP_PRINCIPALS: RefCell<HashMap<Principal, Principal>> = RefCell::new(HashMap::new());
}
```

#### Add Verification Methods
```rust
#[derive(CandidType, Deserialize)]
struct VerificationChallenge {
    nonce: u64,
    timestamp: u64,
    daopad_principal: Principal,
    claimed_lp_principal: Principal,
}

#[update]
fn create_lp_verification_challenge(claimed_lp_principal: Principal) -> VerificationChallenge {
    let caller = caller();
    let nonce = generate_random_nonce();
    let timestamp = time();
    
    VerificationChallenge {
        nonce,
        timestamp,
        daopad_principal: caller,
        claimed_lp_principal,
    }
}

#[update]
async fn verify_lp_principal_ownership(
    challenge: VerificationChallenge,
    signature: Vec<u8>
) -> Result<bool, String> {
    // 1. Verify challenge is recent (< 5 minutes old)
    if time() - challenge.timestamp > 300_000_000_000 {
        return Err("Challenge expired".to_string());
    }
    
    // 2. Verify caller matches challenge
    if caller() != challenge.daopad_principal {
        return Err("Challenge mismatch".to_string());
    }
    
    // 3. Call LP Locker backend to verify signature
    let lp_locker = Principal::from_text("lp-locker-canister-id").unwrap();
    let result: Result<(bool,), _> = ic_cdk::call(
        lp_locker,
        "verify_signature_for_principal",
        (challenge.claimed_lp_principal, 
         serde_json::to_string(&challenge).unwrap(), 
         signature)
    ).await;
    
    match result {
        Ok((true,)) => {
            // Store verified link
            VERIFIED_LP_PRINCIPALS.with(|vp| {
                vp.borrow_mut().insert(caller(), challenge.claimed_lp_principal);
            });
            Ok(true)
        },
        _ => Err("Signature verification failed".to_string())
    }
}

#[query]
fn get_verified_lp_principal() -> Option<Principal> {
    VERIFIED_LP_PRINCIPALS.with(|vp| {
        vp.borrow().get(&caller()).cloned()
    })
}
```

### 2. Backend Changes (LP Locker)

#### Add Signature Verification
```rust
// In lp_locker backend
#[query]
fn verify_signature_for_principal(
    claimed_principal: Principal,
    message: String,
    signature: Vec<u8>
) -> bool {
    // This would need IC's signature verification
    // The LP Locker backend can verify if a signature
    // was made by the claimed_principal
    
    // For now, we can use a simpler approach:
    // Store signatures temporarily when users sign in LP Locker
    
    // Alternative: Use delegation chain verification
    ic_cdk::api::is_controller(&claimed_principal)
}

// Better approach: Let users create signed attestations
#[update]
fn create_ownership_attestation(target_dapp: String) -> Result<SignedAttestation, String> {
    let caller = caller();
    if caller == Principal::anonymous() {
        return Err("Must be authenticated".to_string());
    }
    
    let attestation = OwnershipAttestation {
        lp_principal: caller,
        target_dapp,
        timestamp: time(),
        expires_at: time() + 300_000_000_000, // 5 minutes
    };
    
    // Sign with canister's key (or user's delegation)
    let signature = sign_message(&attestation);
    
    Ok(SignedAttestation {
        attestation,
        signature,
        signer: caller,
    })
}
```

### 3. Frontend Flow (DAOPad)

#### Verification UI Component
```jsx
const LPLockerVerification = () => {
  const [claimedPrincipal, setClaimedPrincipal] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const handleVerification = async () => {
    setIsVerifying(true);
    try {
      // Step 1: Create challenge in DAOPad backend
      const challenge = await daopadBackend.create_lp_verification_challenge(
        Principal.fromText(claimedPrincipal)
      );
      
      // Step 2: Open LP Locker in popup/iframe with challenge
      const lpLockerUrl = `https://konglocker.org/verify?challenge=${
        encodeURIComponent(JSON.stringify(challenge))
      }&callback=${encodeURIComponent(window.location.origin)}`;
      
      // Open in popup
      const popup = window.open(lpLockerUrl, 'lp_verification', 'width=600,height=700');
      
      // Step 3: Listen for signature response
      window.addEventListener('message', async (event) => {
        if (event.origin !== 'https://konglocker.org') return;
        
        const { signature, challenge: returnedChallenge } = event.data;
        
        // Step 4: Verify signature in backend
        const verified = await daopadBackend.verify_lp_principal_ownership(
          returnedChallenge,
          signature
        );
        
        if (verified) {
          setVerificationStatus('success');
          popup.close();
        } else {
          setVerificationStatus('failed');
        }
      });
      
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="lp-verification-card">
      <h3>Link Your LP Locker Principal</h3>
      
      {!verificationStatus && (
        <>
          <input
            type="text"
            placeholder="Enter your LP Locker principal"
            value={claimedPrincipal}
            onChange={(e) => setClaimedPrincipal(e.target.value)}
            className="input-swiss"
          />
          
          <button 
            onClick={handleVerification}
            disabled={!claimedPrincipal || isVerifying}
            className="button-swiss"
          >
            {isVerifying ? 'Verifying...' : 'Verify Ownership'}
          </button>
          
          <p className="help-text">
            You'll be redirected to LP Locker to sign a verification message
          </p>
        </>
      )}
      
      {verificationStatus === 'success' && (
        <div className="success-message">
          ✓ LP Locker principal verified and linked!
        </div>
      )}
      
      {verificationStatus === 'failed' && (
        <div className="error-message">
          ✗ Could not verify ownership of this principal
        </div>
      )}
    </div>
  );
};
```

### 4. Frontend Flow (LP Locker)

#### Verification Handler Page
```jsx
// In LP Locker: /verify route
const VerificationPage = () => {
  const { identity, isAuthenticated } = useIdentity();
  const [challenge, setChallenge] = useState(null);
  
  useEffect(() => {
    // Parse challenge from URL
    const params = new URLSearchParams(window.location.search);
    const challengeData = JSON.parse(decodeURIComponent(params.get('challenge')));
    setChallenge(challengeData);
  }, []);
  
  const handleSign = async () => {
    if (!identity || !challenge) return;
    
    // Get current principal
    const myPrincipal = identity.getPrincipal().toString();
    
    // Verify this matches the claimed principal
    if (myPrincipal !== challenge.claimed_lp_principal) {
      alert('Your LP Locker principal does not match the claimed one!');
      return;
    }
    
    // Create attestation or signature
    const attestation = await lpLockerBackend.create_ownership_attestation('daopad');
    
    // Send back to parent window
    const callback = new URLSearchParams(window.location.search).get('callback');
    window.opener.postMessage({
      signature: attestation.signature,
      challenge: challenge,
      attestation: attestation
    }, callback);
    
    // Show success
    alert('Verification signature sent to DAOPad!');
  };
  
  if (!isAuthenticated) {
    return (
      <div className="verification-page">
        <h2>LP Locker Principal Verification</h2>
        <p>Please login to verify your principal ownership</p>
        <button onClick={login}>Login with Internet Identity</button>
      </div>
    );
  }
  
  return (
    <div className="verification-page">
      <h2>Verify Your LP Locker Principal</h2>
      
      <div className="verification-details">
        <p><strong>Your LP Locker Principal:</strong></p>
        <code>{identity.getPrincipal().toString()}</code>
        
        <p><strong>Claimed Principal:</strong></p>
        <code>{challenge?.claimed_lp_principal}</code>
        
        <p><strong>Requesting App:</strong> DAOPad</p>
        
        {identity.getPrincipal().toString() === challenge?.claimed_lp_principal ? (
          <>
            <div className="success-message">
              ✓ This is your principal!
            </div>
            <button onClick={handleSign} className="button-swiss">
              Sign Verification
            </button>
          </>
        ) : (
          <div className="error-message">
            ✗ This is NOT your principal. You cannot verify ownership.
          </div>
        )}
      </div>
    </div>
  );
};
```

## Alternative: Simpler Approach with QR Codes

If the popup/iframe approach is too complex, use QR codes:

1. **DAOPad generates QR code** containing:
   - Challenge nonce
   - DAOPad principal
   - Callback URL

2. **User scans with phone** and opens LP Locker

3. **LP Locker signs and sends** verification to callback URL

4. **DAOPad polls for verification** completion

## Security Considerations

### ✓ Prevents
- Users claiming principals that aren't theirs
- Cross-site principal correlation without consent
- Replay attacks (time-limited challenges)

### ✗ Does NOT Prevent
- Users creating multiple accounts and linking them
- Someone with access to both accounts from linking them

### Best Practices
1. **Time-limit challenges** to 5 minutes
2. **Use nonces** to prevent replay attacks
3. **Verify origins** in postMessage handlers
4. **Store verifications** with timestamps for audit
5. **Allow unlinking** for privacy

## Benefits

1. **User Control**: Users explicitly consent to linking
2. **Cryptographic Proof**: Cannot fake ownership
3. **Privacy Preserved**: Only linked with user action
4. **One-time Setup**: Link once, use forever
5. **Blackholed Compatible**: LP Locker can remain immutable

## Implementation Priority

### Phase 1: MVP
- Basic challenge-response flow
- Manual principal entry
- Popup verification

### Phase 2: Enhanced UX
- QR code option
- Automatic principal detection
- Verification history

### Phase 3: Advanced Features
- Multi-principal support
- Delegation chains
- Cross-canister queries with verified principals

## Testing Checklist

- [ ] User can initiate verification from DAOPad
- [ ] LP Locker correctly identifies principal match/mismatch
- [ ] Signature verification works end-to-end
- [ ] Expired challenges are rejected
- [ ] Wrong principals cannot be verified
- [ ] Verified principals persist across sessions
- [ ] Users can unlink/relink principals

## Conclusion

This system allows users to cryptographically prove they own an LP Locker principal from within DAOPad, without compromising Internet Identity's privacy model. The verification is voluntary, user-initiated, and creates an auditable link between the two identities.