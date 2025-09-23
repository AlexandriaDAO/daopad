#!/usr/bin/env node

// Test script to verify the correct encoding for pagination parameters

const testCase1 = {
  paginate: [{
    offset: [0],    // opt nat64 - wrapped in array
    limit: [100]    // opt nat64 - wrapped in array
  }]
};

const testCase2 = {
  paginate: [{
    offset: 0,      // plain number (WRONG)
    limit: 100      // plain number (WRONG)
  }]
};

const testCase3 = {
  paginate: [{
    offset: [],     // None/null for opt nat64
    limit: [100]    // Some(100) for opt nat64
  }]
};

console.log("Correct encoding (matches Orbit frontend):");
console.log(JSON.stringify(testCase1, null, 2));

console.log("\nIncorrect encoding (what we were doing):");
console.log(JSON.stringify(testCase2, null, 2));

console.log("\nWith optional offset omitted:");
console.log(JSON.stringify(testCase3, null, 2));

console.log("\n✅ Key insight: Each optional field needs array wrapping!");
console.log("- paginate: opt PaginationInput -> wrapped as [{}]");
console.log("- offset: opt nat64 -> wrapped as [0] or []");
console.log("- limit: opt nat64 -> wrapped as [100] or []");