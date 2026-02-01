const { sortClassString } = require('./out/utils');

const testCases = [
    {
        name: 'HAML with dots',
        input: '.px-4.container.mx-auto.text-center',
        options: {
            shouldRemoveDuplicates: true,
            shouldPrependCustomClasses: false,
            customTailwindPrefix: '',
            separator: /\./g,
            replacement: '.'
        }
    }
];

async function runTests() {
    for (const test of testCases) {
        console.log('Test:', test.name);
        console.log('Input:', test.input);
        console.log('Options:', test.options);
        
        const result = await sortClassString(test.input, test.options);
        
        console.log('Output:', result);
        console.log('Changed?', result !== test.input);
        console.log('---\n');
    }
}

runTests();
