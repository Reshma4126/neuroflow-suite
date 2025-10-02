// Simple API Test Script for Team Member 4
// Run with: node test-api.js

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test helper function
function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`\n✓ ${method} ${path}`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Response: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        resolve({ status: res.statusCode, body: body });
      });
    });

    req.on('error', (error) => {
      console.log(`\n✗ ${method} ${path}`);
      console.log(`  Error: ${error.message}`);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('=================================');
  console.log('Team Member 4 - API Tests');
  console.log('=================================');

  try {
    // Test 1: Health Check
    await testEndpoint('/health');

    // Test 2: Get Habits
    await testEndpoint('/api/habits');

    // Test 3: Get Routines
    await testEndpoint('/api/routines');

    // Test 4: Create a Habit
    await testEndpoint('/api/habits', 'POST', {
      name: 'Test Habit',
      description: 'Testing habit creation',
      trigger: 'After morning coffee'
    });

    // Test 5: Create a Routine
    await testEndpoint('/api/routines', 'POST', {
      name: 'Test Routine',
      description: 'Testing routine creation',
      frequency: 'daily',
      timeOfDay: 'morning'
    });

    console.log('\n=================================');
    console.log('All tests completed!');
    console.log('=================================\n');

  } catch (error) {
    console.log('\n=================================');
    console.log('Tests failed!');
    console.log('=================================\n');
    process.exit(1);
  }
}

runTests();
