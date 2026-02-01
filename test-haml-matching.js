const { buildMatchers, getTextMatch } = require('./out/utils');

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

%button.px-6.text-white.py-2.bg-blue-500.rounded
  Button

.flex.items-center.justify-between
  Content`;

console.log('Testing HAML regex matching...');
console.log('Input text:');
console.log(hamlText);
console.log('---');

const matchers = buildMatchers(hamlConfig);
console.log('Number of matchers:', matchers.length);

matchers.forEach((matcher, index) => {
    console.log('Matcher', index + 1);
    console.log('  Regex patterns:', matcher.regex.length);
    console.log('  Separator:', matcher.separator);
    console.log('  Replacement:', matcher.replacement);
    
    let matchCount = 0;
    getTextMatch(matcher.regex, hamlText, (classString, startPosition) => {
        matchCount++;
        console.log('  Match', matchCount, {
            classString,
            startPosition,
            context: hamlText.slice(Math.max(0, startPosition - 10), startPosition + classString.length + 10)
        });
    });
    
    if (matchCount === 0) {
        console.log('  No matches found!');
    }
});
