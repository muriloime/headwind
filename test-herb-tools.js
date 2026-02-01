const { sortTailwindClasses } = require('@herb-tools/tailwind-class-sorter');

const testCases = [
    'px-4 container mx-auto text-center bg-blue-500',
    'px-6 text-white py-2 rounded bg-blue-500',
    'flex items-center justify-between'
];

async function test() {
    for (const classes of testCases) {
        console.log('Input: ', classes);
        const sorted = await sortTailwindClasses(classes, {});
        console.log('Output:', sorted);
        console.log('Changed:', sorted !== classes);
        console.log('---');
    }
}

test();
