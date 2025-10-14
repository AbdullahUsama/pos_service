// Test script to demonstrate the date range bug fix
// This shows why the old approach was missing sales

console.log('=== Date Range Bug Analysis ===\n');

// Simulate current date: October 14, 2025
const testDate = new Date('2025-10-14T15:30:00.000Z'); // 3:30 PM UTC

console.log('Test date:', testDate.toISOString());
console.log('Local time:', testDate.toLocaleString());
console.log('');

// OLD APPROACH (BUGGY)
console.log('--- OLD APPROACH (BUGGY) ---');
const todayOld = testDate.toISOString().split('T')[0]; // "2025-10-14"
const startOld = `${todayOld}T00:00:00`; // "2025-10-14T00:00:00"
const endOld = `${todayOld}T23:59:59`;   // "2025-10-14T23:59:59"

console.log('Start time:', startOld);
console.log('End time:', endOld);
console.log('SQL Query: created_at >= ? AND created_at < ?');
console.log('Issue: Using "lt" (less than) excludes the last second of the day');
console.log('');

// NEW APPROACH (FIXED)
console.log('--- NEW APPROACH (FIXED) ---');
const startNew = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()).toISOString();
const endNew = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1).toISOString();

console.log('Start time:', startNew);
console.log('End time:', endNew);
console.log('SQL Query: created_at >= ? AND created_at < ?');
console.log('Fixed: Using next day start time ensures entire day is included');
console.log('');

// TEST SCENARIOS
console.log('--- TEST SCENARIOS ---');

const testSales = [
  '2025-10-14T08:30:00.000Z', // 8:30 AM - included in both
  '2025-10-14T12:15:00.000Z', // 12:15 PM - included in both  
  '2025-10-14T15:45:00.000Z', // 3:45 PM - included in both
  '2025-10-14T23:59:59.999Z', // 11:59:59.999 PM - MISSED by old approach!
];

testSales.forEach((saleTime, index) => {
  const saleDate = new Date(saleTime);
  
  // Old approach check
  const oldIncluded = saleDate >= new Date(startOld) && saleDate < new Date(endOld);
  
  // New approach check  
  const newIncluded = saleDate >= new Date(startNew) && saleDate < new Date(endNew);
  
  console.log(`Sale ${index + 1}: ${saleTime}`);
  console.log(`  Local time: ${saleDate.toLocaleString()}`);
  console.log(`  Old approach: ${oldIncluded ? '✅ INCLUDED' : '❌ MISSED'}`);
  console.log(`  New approach: ${newIncluded ? '✅ INCLUDED' : '❌ MISSED'}`);
  console.log('');
});

console.log('=== SUMMARY ===');
console.log('The bug was caused by using "T23:59:59" with "lt" (less than)');
console.log('This excluded sales happening in the last second of the day');
console.log('The fix uses the start of the next day with "lt" to include the entire day');
console.log('Now admin panel and sales report use consistent date logic');