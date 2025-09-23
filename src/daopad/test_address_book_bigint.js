#!/usr/bin/env node

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './daopad_frontend/src/services/orbitStation.did.js';

const STATION_ID = "fec7w-zyaaa-aaaaa-qaffq-cai";

async function testAddressBookCall() {
  console.log("Testing address book API calls with different BigInt encodings...\n");

  // Create agent
  const agent = new HttpAgent({ host: 'https://ic0.app' });

  // Create actor
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: STATION_ID,
  });

  // Test 1: Correct encoding with plain numbers (should work)
  try {
    console.log("Test 1: Using plain numbers (correct)");
    const result1 = await actor.list_address_book_entries({
      paginate: [{
        offset: [0],  // Plain number in array for opt
        limit: [100]  // Plain number in array for opt
      }]
    });
    console.log("✅ Success with plain numbers:", result1.Ok ? "Got response" : "Error");
  } catch (error) {
    console.log("❌ Failed with plain numbers:", error.message.substring(0, 100));
  }

  // Test 2: With BigInt constructor (problematic)
  try {
    console.log("\nTest 2: Using BigInt() constructor");
    const result2 = await actor.list_address_book_entries({
      paginate: [{
        offset: [BigInt(0)],  // BigInt in array for opt
        limit: [BigInt(100)]  // BigInt in array for opt
      }]
    });
    console.log("✅ Success with BigInt():", result2.Ok ? "Got response" : "Error");
  } catch (error) {
    console.log("❌ Failed with BigInt():", error.message.substring(0, 100));
  }

  // Test 3: With Number() wrapper (should work)
  try {
    console.log("\nTest 3: Using Number() wrapper");
    const offset = 0;
    const limit = 100;
    const result3 = await actor.list_address_book_entries({
      paginate: [{
        offset: [Number(offset)],  // Explicit Number conversion
        limit: [Number(limit)]     // Explicit Number conversion
      }]
    });
    console.log("✅ Success with Number():", result3.Ok ? "Got response" : "Error");
  } catch (error) {
    console.log("❌ Failed with Number():", error.message.substring(0, 100));
  }

  // Test 4: Without pagination (should work)
  try {
    console.log("\nTest 4: Without pagination field");
    const result4 = await actor.list_address_book_entries({
      paginate: []  // Empty array for opt null
    });
    console.log("✅ Success without pagination:", result4.Ok ? "Got response" : "Error");
  } catch (error) {
    console.log("❌ Failed without pagination:", error.message.substring(0, 100));
  }

  // Test 5: With all filters
  try {
    console.log("\nTest 5: With all optional filters");
    const result5 = await actor.list_address_book_entries({
      ids: [],
      addresses: [],
      blockchain: [],
      labels: [],
      address_formats: [],
      search_term: [],
      paginate: [{
        offset: [0],
        limit: [50]
      }]
    });
    console.log("✅ Success with all filters:", result5.Ok ? "Got response" : "Error");
  } catch (error) {
    console.log("❌ Failed with all filters:", error.message.substring(0, 100));
  }

  console.log("\nTest complete!");
  process.exit(0);
}

testAddressBookCall().catch(console.error);