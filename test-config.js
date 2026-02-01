// Test that configuration is properly loaded
const packageJson = require('./package.json');

const hamlConfig = packageJson.contributes.configuration.properties['headwind.classRegex'].default.haml;

console.log('HAML Configuration from package.json:');
console.log(JSON.stringify(hamlConfig, null, 2));

console.log('\nVerifying both matchers have separator/replacement:');
hamlConfig.forEach((matcher, index) => {
    console.log('Matcher', index + 1, {
        type: typeof matcher,
        hasSeparator: typeof matcher === 'object' && matcher.separator !== undefined,
        hasReplacement: typeof matcher === 'object' && matcher.replacement !== undefined,
        separator: typeof matcher === 'object' ? matcher.separator : 'N/A',
        replacement: typeof matcher === 'object' ? matcher.replacement : 'N/A'
    });
});
