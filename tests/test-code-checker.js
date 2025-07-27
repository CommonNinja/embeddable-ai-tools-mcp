const { CodeChecker } = require('../dist/tools/code-checker.tool.js');
const { performance } = require('perf_hooks');

// Run with:
// node tests/test-code-checker.js

async function testCodeChecker() {
	console.log('🧪 Testing Code Checker Functionality\n');

	// Test cases with valid and invalid code
	const testCases = [
		{
			name: 'Valid TypeScript',
			files: {
				'/test-valid.ts': `
export interface User {
	id: number;
	name: string;
	email?: string;
}

export function createUser(name: string): User {
	return {
		id: Math.random(),
		name,
	};
}`.trim(),
			},
			expectedErrors: 0,
		},
		{
			name: 'Invalid TypeScript - Syntax Error',
			files: {
				'/test-invalid.ts': `
export interface User {
	id: number
	name: string  // Missing semicolon
	email?: string
} // Missing semicolon

export function createUser(name: string): User {
	return {
		id: Math.random(),
		name,
		// Missing closing brace`.trim(),
			},
			expectedErrors: 1,
		},
		{
			name: 'Invalid TypeScript - Multiple Errors',
			files: {
				'/test-multiple-errors.ts': `
export interface User {
	id: number
	name: string
	email?: string
} // Missing semicolon

export function createUser(name: string): User {
	return {
		id: Math.random()  // Missing comma
		name
		invalidProperty: "this will cause issues"
	// Missing closing brace and semicolon`.trim(),
			},
			expectedErrors: 1,
		},
		{
			name: 'Valid JSON',
			files: {
				'/test-valid.json': `{
	"name": "Test Widget",
	"version": "1.0.0",
	"description": "A test widget",
	"main": "index.js"
}`,
			},
			expectedErrors: 0,
		},
		{
			name: 'Invalid JSON',
			files: {
				'/test-invalid.json': `{
	"name": "Test Widget",
	"version": "1.0.0",
	"description": "A test widget",
	"main": "index.js"  // JSON doesn't allow comments
	"invalid": "missing comma above"
}`,
			},
			expectedErrors: 1,
		},
		{
			name: 'Valid CSS',
			files: {
				'/test-valid.css': `
.container {
	display: flex;
	flex-direction: column;
	padding: 1rem;
}

.button {
	background-color: #007bff;
	color: white;
	border: none;
	padding: 0.5rem 1rem;
	border-radius: 4px;
}

.button:hover {
	background-color: #0056b3;
}`.trim(),
			},
			expectedErrors: 0,
		},
		{
			name: 'Invalid CSS - Unbalanced Braces',
			files: {
				'/test-invalid.css': `
.container {
	display: flex;
	flex-direction: column;
	padding: 1rem;
	// Missing closing brace

.button {
	background-color: #007bff;
	color: white;
}`.trim(),
			},
			expectedErrors: 1,
		},
	];

	let totalTests = 0;
	let passedTests = 0;
	let totalTime = 0;

	for (const testCase of testCases) {
		console.log(`📋 Testing: ${testCase.name}`);

		const checker = new CodeChecker(`/tmp/test-${Date.now()}-${Math.random()}`);

		// Register all files for checking
		Object.keys(testCase.files).forEach((filePath) => {
			checker.registerFileChange(filePath);
		});

		const startTime = performance.now();

		try {
			const result = await checker.checkChangedFiles(testCase.files);
			const endTime = performance.now();
			const executionTime = endTime - startTime;
			totalTime += executionTime;

			console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
			console.log(`   📊 Found ${result.errors.length} error(s)`);

			if (result.errors.length > 0) {
				console.log('   🔍 Errors found:');
				result.errors.forEach((error) => {
					console.log(`      ${error.file}:${error.line}:${error.column} - ${error.message}`);
				});
			}

			// Check if the result matches expectations
			const hasExpectedErrors = testCase.expectedErrors > 0 ? result.errors.length > 0 : result.errors.length === 0;

			if (hasExpectedErrors) {
				console.log(`   ✅ PASS - ${testCase.expectedErrors > 0 ? 'Correctly detected errors' : 'No errors as expected'}`);
				passedTests++;
			} else {
				console.log(`   ❌ FAIL - Expected ${testCase.expectedErrors > 0 ? 'errors' : 'no errors'} but got ${result.errors.length} error(s)`);
			}
		} catch (error) {
			const endTime = performance.now();
			const executionTime = endTime - startTime;
			totalTime += executionTime;

			console.log(`   ❌ FAIL - Test threw an error: ${error.message}`);
			console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
		}

		totalTests++;
		console.log('');
	}

	// Summary
	console.log('📈 Test Summary:');
	console.log(`   Total tests: ${totalTests}`);
	console.log(`   Passed: ${passedTests}`);
	console.log(`   Failed: ${totalTests - passedTests}`);
	console.log(`   Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
	console.log(`   Total execution time: ${totalTime.toFixed(2)}ms`);
	console.log(`   Average time per test: ${(totalTime / totalTests).toFixed(2)}ms`);

	if (passedTests === totalTests) {
		console.log('\n🎉 All tests passed! Code checker is working correctly.');
	} else {
		console.log('\n⚠️  Some tests failed. Please review the code checker implementation.');
	}
}

// Run the test
testCodeChecker().catch(console.error); 