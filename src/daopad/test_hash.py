def candid_hash(name):
    """Calculate the Candid hash for a field name."""
    hash_val = 0
    for byte in name.encode('utf-8'):
        hash_val = (hash_val * 223 + byte) & 0xFFFFFFFF
    return hash_val

# Test common field names
fields = ["total", "requests", "status", "Created", "Completed", "Approved", "id", "title"]
for field in fields:
    print(f"{field}: {candid_hash(field)}")
