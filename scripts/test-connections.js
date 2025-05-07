#!/usr/bin/env node

/**
 * Test script for checking API connections
 * Run with: node scripts/test-connections.js
 */

const fetch = require('node-fetch');

async function main() {
  console.log('=== API Connection Test Script ===');
  console.log('Testing API endpoints to diagnose connection issues...\n');
  
  // Base URL - change this if testing against a deployed environment
  const baseUrl = 'http://localhost:3000';
  
  // Test endpoints
  const endpoints = [
    { name: 'Supabase Connection', path: '/api/test-supabase' },
    { name: 'Gemini API', path: '/api/test-gemini' },
    { name: 'Job Matching Status', path: '/api/job-matching' },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`);
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      const data = await response.json();
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.log(`❌ ${endpoint.name} test failed!`);
      } else {
        console.log(`✅ ${endpoint.name} test passed!`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${endpoint.name}:`, error.message);
    }
    console.log('-----------------------------------');
  }
  
  console.log('\nTests completed. Check the results above for any issues.');
  console.log('If you see failures, check your environment variables and server logs for more details.');
}

main().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
}); 