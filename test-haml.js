const { processText, buildMatchers } = require('./out/utils');

// HAML config from package.json
const hamlConfig = [
    {
        regex: [
            "\\.([_a-zA-Z0-9\\-:]+)"
        ],
        separator: "\\.",
        replacement: "."
    },
    "(?:^|\n)\\s*(?:(?:[%#][a-zA-Z0-9-_]+)*)((\\.[_a-zA-Z0-9\\-:]+)(?:\\.[\\._a-zA-Z0-9\\-:]+)*)\\s*(?=\\{|\n)"
];

const hamlText = `%div
  .px-4.container.mx-auto.text-center.bg-blue-500
    Test HAML classes

%button.text-white.px-6.py-2.bg-blue-500.rounded
  Button`;

const options = {
    shouldRemoveDuplicates: true,
    shouldPrependCustomClasses: false,
    customTailwindPrefix: ''
};

console.log('Testing HAML processing...\n');
console.log('Input:');
console.log(hamlText);
console.log('\n---\n');

processText(hamlText, hamlConfig, options)
    .then(result => {
        console.log('Output:');
        console.log(result);
        console.log('\n---\n');
        if (result !== hamlText) {
            console.log('✓ Classes were sorted!');
        } else {
            console.log('ℹ No changes (already sorted or no classes found)');
        }
        
        // Also test the matchers
        console.log('\n---\n');
        console.log('Matchers built:', JSON.stringify(buildMatchers(hamlConfig), null, 2));
    })
    .catch(err => {
        console.error('✗ Error:', err);
        process.exit(1);
    });
