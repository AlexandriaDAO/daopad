fn candid_hash(name: &str) -> u32 {
    let mut hash: u32 = 0;
    for byte in name.bytes() {
        hash = hash.wrapping_mul(223).wrapping_add(byte as u32);
    }
    hash
}

fn main() {
    println!("Testing Candid hash function:");
    println!("Created: {}", candid_hash("Created"));
    println!("Completed: {}", candid_hash("Completed"));
    println!("total: {}", candid_hash("total"));
    println!("requests: {}", candid_hash("requests"));
}
