#!/usr/bin/env node

/**
 * Direct test script for checking Gemini API key
 * Run with: node scripts/test-gemini-direct.js
 */

// This will load environment variables from .env file
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  console.log('=== Gemini API Direct Test ===');
  
  // Get API key from environment
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: GEMINI_API_KEY environment variable is not set');
    console.log('Make sure you have a .env file with GEMINI_API_KEY or set it in your environment');
    process.exit(1);
  }
  
  console.log(`API Key (masked): ${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`);
  console.log('Initializing Gemini client...');
  
  // Initialize the API client
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test models
  const models = ['gemini-1.5-flash', 'gemini-2.5-flash-preview-04-17'];
  
  for (const modelName of models) {
    console.log(`\nTesting model: ${modelName}`);
    
    try {
      // Get the model
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test with a simple prompt
      const prompt = 'Respond with "OK" if you can see this message.';
      console.log(`Sending test prompt: "${prompt}"`);
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      console.log(`✅ Response: "${response}"`);
      console.log(`Model ${modelName} is working correctly`);
    } catch (error) {
      console.error(`❌ Error with model ${modelName}:`);
      console.error(error.message);
      
      if (error.message.includes('API key')) {
        console.log('\nPossible API key issues:');
        console.log('1. The key may be invalid or expired');
        console.log('2. You may not have access to this model');
        console.log('3. There may be billing issues with your Google Cloud account');
      }
    }
  }
  
  console.log('\nTest completed. Check the results above for any issues.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
}); 