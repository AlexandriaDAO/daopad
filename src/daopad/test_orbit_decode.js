// Test decoding issue with wrong optional vec encoding
const wrongEncoding = {
  statuses: []  // Empty array for None
};

const correctEncoding = {
  statuses: []  // Empty array for None (same as wrong)
};

const wrongSome = {
  statuses: ['Created', 'Approved']  // Wrong: bare array
};

const correctSome = {
  statuses: [['Created', 'Approved']]  // Correct: wrapped array
};

console.log("Wrong None encoding:", JSON.stringify(wrongEncoding));
console.log("Correct None encoding:", JSON.stringify(correctEncoding));
console.log("Wrong Some encoding:", JSON.stringify(wrongSome));
console.log("Correct Some encoding:", JSON.stringify(correctSome));
