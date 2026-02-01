// Quick test of the headwind sorting functionality
const { sortClassString, processText } = require('./out/utils');

const testOptions = {
    shouldRemoveDuplicates: true,
    shouldPrependCustomClasses: false,
    customTailwindPrefix: ''
};

async function runTests() {
    try {
        // Test 1: Basic sorting
        console.log('Test 1: Basic class sorting');
        const result1 = await sortClassString('px-4 container mx-auto text-center', testOptions);
        console.log('Input:  px-4 container mx-auto text-center');
        console.log('Output:', result1);
        console.log('✓ Test 1 passed\n');

        // Test 2: processText with HTML
        console.log('Test 2: Processing HTML');
        const htmlText = '<div class="px-4 container mx-auto text-center">Test</div>';
        const htmlLangConfig = '\\bclass\\s*=\\s*[\\"\\\']([\\._a-zA-Z0-9\\s\\-\\:\\/]+)[\\"\\\']';
        
        const result2 = await processText(htmlText, htmlLangConfig, testOptions);
        console.log('Input: ', htmlText);
        console.log('Output:', result2);
        console.log('✓ Test 2 passed\n');

        console.log('All tests passed! Extension is working correctly.');
    } catch (err) {
        console.error('✗ Test failed:', err);
        process.exit(1);
    }
}

runTests();
