// Test the full flow as it would happen in VS Code
const { processText } = require('./out/utils');

const hamlConfig = [
    {
        regex: [
            "\\.([_a-zA-Z0-9\\-:]+)"
        ],
        separator: "\\.",
        replacement: "."
    },
    {
        regex: "(?:^|\n)\\s*(?:(?:[%#][a-zA-Z0-9-_]+)*)((\\.[_a-zA-Z0-9\\-:]+)(?:\\.[\\._a-zA-Z0-9\\-:]+)*)\\s*(?=\\{|\n)",
        separator: "\\.",
        replacement: "."
    }
];

const hamlText = `%div
  .px-4.container.mx-auto.text-center.bg-blue-500
    Test HAML classes

%button.px-6.text-white.py-2.bg-blue-500.rounded
  Button

.flex.items-center.justify-between
  Content`;

const options = {
    shouldRemoveDuplicates: true,
    shouldPrependCustomClasses: false,
    customTailwindPrefix: ''
};

console.log('=== Testing Full Flow ===\n');
console.log('Input:');
console.log(hamlText);
console.log('\n---\n');

processText(hamlText, hamlConfig, options)
    .then(result => {
        console.log('\nOutput:');
        console.log(result);
        console.log('\n---\n');
        console.log('Changed?', result !== hamlText);
    })
    .catch(err => {
        console.error('Error:', err);
    });
