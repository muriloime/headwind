// Test EXACTLY what VS Code is doing
const { sortClassString } = require('tailwind-sort');

const input = '.px-4.container.mx-auto.text-center.bg-blue-500';
const options = {
    shouldRemoveDuplicates: true,
    shouldPrependCustomClasses: false,
    customTailwindPrefix: '',
    separator: /\./g,
    replacement: '.'
};

console.log('Testing tailwind-sort package directly');
console.log('Input:', input);
console.log('Options:', options);
console.log('---');

sortClassString(input, options)
    .then(result => {
        console.log('Output:', result);
        console.log('Changed:', result !== input);
        
        // Also test what gets sent to @herb-tools
        const classArray = input.split(options.separator).filter(el => el !== '');
        const joined = classArray.join(' ');
        console.log('\nWhat @herb-tools receives:', joined);
        
        return require('@herb-tools/tailwind-class-sorter').sortTailwindClasses(joined, {
            tailwindPreserveDuplicates: !options.shouldRemoveDuplicates
        });
    })
    .then(herbResult => {
        console.log('What @herb-tools returns:', herbResult);
    });
