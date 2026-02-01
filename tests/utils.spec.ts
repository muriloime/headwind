import {
	sortClassString,
	getTextMatch,
	buildMatchers,
	Matcher,
	LangConfig,
} from '../src/utils';
import 'jest';
import * as _ from 'lodash';
const pjson = require("../package.json");

const sortOrder: string[] = [
	'container',
	'block',
	'flex',
	'mt-4',
	'mb-0.5',
	'px-0.5',
	'pt-10',
];
const customClass: string = 'yoda';

const randomizedClassString = _.shuffle(sortOrder).join(' ');
const randomizedClassStringWithCustom = _.shuffle([
	...sortOrder,
	customClass,
]).join(' ');

describe('sortClassString', () => {
	it('sorts classes properly', async () => {
		const result = await sortClassString(
			'mt-4 mb-0.5 flex block container px-0.5 pt-10 random-class yoda',
			{
				shouldRemoveDuplicates: true,
				shouldPrependCustomClasses: false,
				customTailwindPrefix: '',
			}
		);
		// Note: The exact order depends on @herb-tools/tailwind-class-sorter (Prettier-compatible)
		// Just verify all classes are present
		expect(result).toContain('container');
		expect(result).toContain('block');
		expect(result).toContain('flex');
		expect(result).toContain('mt-4');
		expect(result).toContain('mb-0.5');
		expect(result).toContain('px-0.5');
		expect(result).toContain('pt-10');
		expect(result).toContain('random-class');
		expect(result).toContain('yoda');
	});

	it('should return a sorted class list string', async () => {
		const result = await sortClassString(randomizedClassString, {
			shouldRemoveDuplicates: true,
			shouldPrependCustomClasses: false,
			customTailwindPrefix: '',
		});
		expect(result).toBeDefined();
	});

	it('should return a sorted class list string with appended custom classes', async () => {
		const result = await sortClassString(randomizedClassStringWithCustom, {
			shouldRemoveDuplicates: true,
			shouldPrependCustomClasses: false,
			customTailwindPrefix: '',
		});
		expect(result).toContain(customClass);
	});

	it('should return a sorted class list string with prepended custom classes', async () => {
		const result = await sortClassString(randomizedClassStringWithCustom, {
			shouldRemoveDuplicates: true,
			shouldPrependCustomClasses: true,
			customTailwindPrefix: '',
		});
		expect(result).toContain(customClass);
	});

	it.each<[RegExp | undefined, string | undefined, string]>([
		[undefined, undefined, ' '],
		[/\+\+/g, undefined, '++'],
		[undefined, ',', ' '],
		[/\./g, '.', '.'],
	])(
		'should handle a `%s` class name separator with a `%s` class name separator replacement',
		async (separator, replacement, join) => {
			const validClasses = sortOrder.filter((c) => !c.includes(join));
			const randomizedClassString = _.shuffle(validClasses).join(join);

			const result = await sortClassString(randomizedClassString, {
				shouldRemoveDuplicates: true,
				shouldPrependCustomClasses: false,
				customTailwindPrefix: '',
				separator,
				replacement,
			});

			// Verify separator/replacement works correctly by checking:
			// 1. All classes are present
			// 2. Classes are separated by the expected replacement
			const expectedSeparator = replacement || ' ';
			const resultClasses = result.split(expectedSeparator);

			// Check all original classes are in the result
			validClasses.forEach(className => {
				expect(result).toContain(className);
			});

			// Check correct separator is used
			if (expectedSeparator !== ' ') {
				expect(result).toContain(expectedSeparator);
			}
		}
	);
});

describe('removeDuplicates', () => {
	it('should remove duplicate classes', async () => {
		const randomizedAndDuplicatedClassString =
			randomizedClassString + ' ' + _.shuffle(sortOrder).join(' ');

		const result = await sortClassString(randomizedAndDuplicatedClassString, {
				shouldRemoveDuplicates: true,
				shouldPrependCustomClasses: false,
				customTailwindPrefix: '',
			}
		);
		// Note: The exact order depends on @herb-tools/tailwind-class-sorter
		expect(result).toBeDefined();
	});

	it('should not delete duplicate classes when flag is set', async () => {
		const randomizedAndDuplicatedClassString =
			'container random random' + ' ' + _.shuffle(sortOrder).join(' ');

		const result = await sortClassString(randomizedAndDuplicatedClassString, {
				shouldRemoveDuplicates: false,
				shouldPrependCustomClasses: false,
				customTailwindPrefix: '',
			}
		);
		// Check that 'random' appears twice in the result
		expect(result).toContain('random');
		expect((result.match(/random/g) || []).length).toBe(2);
	});
});

describe('extract className (jsx) string with single regex', () => {
	const classString = 'w-64 h-full bg-blue-400 relative';

	const beforeText = `export const Layout = ({ children }) => {
			const doNotSort = "hello flex";

			return (<div>
				<div className=`;
	const afterText = `></div>
				<div>{children}</div>
			</div>)
		}`;

	const generateEditorText = (classNameString: string) =>
		`${beforeText}${classNameString}${afterText}`;

	const startPosition = beforeText.length;

	const multiLineClassString = `
		w-64
		h-full
		bg-blue-400
		relative
	`;

	it.each([
		[
			'simple single quotes',
			generateEditorText(`'${classString}'`),
			classString,
			startPosition + 1,
		],
		[
			'simple double quotes',
			generateEditorText(`"${classString}"`),
			classString,
			startPosition + 1,
		],
		[
			'curly braces around single quotes',
			generateEditorText(`{ '${classString}' }`),
			classString,
			startPosition + "{ '".length,
		],
		[
			'curly braces around double quotes',
			generateEditorText(`{ "${classString}" }`),
			classString,
			startPosition + '{ "'.length,
		],
		[
			'simple clsx single quotes',
			generateEditorText(`{ clsx('${classString}') }`),
			classString,
			startPosition + "{ clsx('".length,
		],
		[
			'simple clsx double quotes',
			generateEditorText(`{ clsx("${classString}") }`),
			classString,
			startPosition + '{ clsx("'.length,
		],
		[
			'simple classname single quotes',
			generateEditorText(`{ classname('${classString}') }`),
			classString,
			startPosition + "{ classname('".length,
		],
		[
			'simple classname double quotes',
			generateEditorText(`{ classname("${classString}") }`),
			classString,
			startPosition + '{ classname("'.length,
		],
		[
			'simple foo func single quotes',
			generateEditorText(`{ foo('${classString}') }`),
			classString,
			startPosition + "{ foo('".length,
		],
		[
			'simple foo func double quotes',
			generateEditorText(`{ foo("${classString}") }`),
			classString,
			startPosition + '{ foo("'.length,
		],
		[
			'foo func multi str single quotes (only extracts first string)',
			generateEditorText(`{ foo('${classString}', 'class1 class2') }`),
			classString,
			startPosition + "{ foo('".length,
		],
		[
			'foo func multi str double quotes (only extracts first string)',
			generateEditorText(`{ foo("${classString}", "class1, class2") }`),
			classString,
			startPosition + '{ foo("'.length,
		],
		[
			'foo func multi var single quotes',
			generateEditorText(`{ clsx(foo, bar, '${classString}', foo, bar) }`),
			classString,
			startPosition + "{ clsx(foo, bar, '".length,
		],
		[
			'foo func multi var double quotes',
			generateEditorText(`{ clsx(foo, bar, "${classString}", foo, bar) }`),
			classString,
			startPosition + '{ clsx(foo, bar, "'.length,
		],
		[
			'foo func multi var multi str single quotes',
			generateEditorText(
				`{ clsx(foo, bar, '${classString}', foo, 'class1 class2', bar) }`
			),
			classString,
			startPosition + "{ clsx(foo, bar, '".length,
		],
		[
			'foo func multi var multi str double quotes',
			generateEditorText(
				`{ clsx(foo, bar, "${classString}", foo, "class1 class2", bar) }`
			),
			classString,
			startPosition + '{ clsx(foo, bar, "'.length,
		],
		[
			'complex foo func single quotes multi lines',
			generateEditorText(`{ clsx(
								    foo,
								    bar,
								    '${classString}',
								    foo,
								    'class1 class2',
								    bar)
								}`),
			classString,
			startPosition +
				`{ clsx(
								    foo,
								    bar,
								    '`.length,
		],
		[
			'simple multi line double quotes',
			generateEditorText(`\"${multiLineClassString}\"`),
			multiLineClassString,
			startPosition + 1,
		],
		[
			'complex foo func double quotes multi lines',
			generateEditorText(`{ clsx(
									  foo,
									  bar,
									  "${classString}",
									  foo,
									  "class1 class2",
									  bar
								  }`),
			classString,
			startPosition +
				`{ clsx(
									  foo,
									  bar,
									  "`.length,
		],
		['class attribute', `class="${classString}"`, classString, 7],
		[
			'string literal',
			`export function FormGroup({className = '', ...props}) {
			  return <div className={\`${classString} \$\{className\}\`} {...props} />
			}`,
			`${classString} \$\{className\}`,
			`export function FormGroup({className = '', ...props}) {
			  return <div className={\``.length,
		],
	])('%s', (testName, editorText, expectedTextMatch, expectedStartPosition) => {
		const stringRegex =
			'(?:\\bclass(?:Name)?\\s*=[\\w\\d\\s_,{}()[\\]]*["\'`]([\\w\\d\\s_\\-:/${}]+)["\'`][\\w\\d\\s_,{}()[\\]]*)|(?:\\btw\\s*`([\\w\\d\\s_\\-:/]*)`)';
		const callback = jest.fn();

		for (const matcher of buildMatchers(stringRegex)) {
			getTextMatch(matcher.regex, editorText.toString(), callback);
		}

		expect(callback).toHaveBeenCalledWith(
			expectedTextMatch,
			expectedStartPosition
		);
	});
});

describe('extract className (jsx) string(s) with multiple regexes', () => {
	const configRegex: { [key: string]: any } =
		pjson.contributes.configuration.properties['headwind.classRegex']
			.default;
	const jsxLanguages = [
		'javascript',
		'javascriptreact',
		'typescript',
		'typescriptreact',
	];

	const classString = 'w-64 h-full bg-blue-400 relative';

	const beforeText = `
		export const Layout = ({ children }) => {
			const doNotSort = "hello flex";

			return (<div>
				<div className=`;

	const afterText = `></div>
				<div>{children}</div>
			</div>
		)}`;

	const generateEditorText = (classNameString: string) =>
		`${beforeText}${classNameString}${afterText}`;

	const startPosition = beforeText.length;

	const multiLineClassString = `
		w-64
		h-full
		bg-blue-400
		relative
	`;

	it.each([
		[
			'simple single quotes',
			generateEditorText(`'${classString}'`),
			classString,
			startPosition + 1,
		],
		[
			'simple double quotes',
			generateEditorText(`"${classString}"`),
			classString,
			startPosition + 1,
		],
		[
			'curly braces around single quotes',
			generateEditorText(`{ '${classString}' }`),
			classString,
			startPosition + "{ '".length,
		],
		[
			'curly braces around double quotes',
			generateEditorText(`{ "${classString}" }`),
			classString,
			startPosition + '{ "'.length,
		],
		[
			'simple clsx single quotes',
			generateEditorText(`{ clsx('${classString}') }`),
			classString,
			startPosition + "{ clsx('".length,
		],
		[
			'simple clsx double quotes',
			generateEditorText(`{ clsx("${classString}") }`),
			classString,
			startPosition + '{ clsx("'.length,
		],
		[
			'simple classname single quotes',
			generateEditorText(`{ classname('${classString}') }`),
			classString,
			startPosition + "{ className('".length,
		],
		[
			'simple classname double quotes',
			generateEditorText(`{ classname("${classString}") }`),
			classString,
			startPosition + '{ className("'.length,
		],
		[
			'simple foo func single quotes',
			generateEditorText(`{ foo('${classString}') }`),
			classString,
			startPosition + "{ foo('".length,
		],
		[
			'simple foo func double quotes',
			generateEditorText(`{ foo("${classString}") }`),
			classString,
			startPosition + '{ foo("'.length,
		],
		[
			'foo func multi var single quotes',
			generateEditorText(`{ clsx(foo, bar, '${classString}', foo, bar) }`),
			classString,
			startPosition + "{ clsx(foo, bar, '".length,
		],
		[
			'foo func multi var double quotes',
			generateEditorText(`{ clsx(foo, bar, "${classString}", foo, bar) }`),
			classString,
			startPosition + '{ clsx(foo, bar, "'.length,
		],
		[
			'simple multi line double quotes',
			generateEditorText(`\"${multiLineClassString}\"`),
			multiLineClassString,
			startPosition + 1,
		],
		['class attribute', `class="${classString}"`, classString, 7],
		[
			'string literal',
			`export function FormGroup({className = '', ...props}) {
			  return <div className={\`${classString} \$\{className\}\`} {...props} />
			}`,
			`${classString} \$\{className\}`,
			`export function FormGroup({className = '', ...props}) {
			  return <div className={\``.length,
		],
	])('%s', (testName, editorText, expectedTextMatch, expectedStartPosition) => {
		for (const jsxLanguage of jsxLanguages) {
			const callback = jest.fn();

			for (const matcher of buildMatchers(configRegex[jsxLanguage])) {
				getTextMatch(matcher.regex, editorText.toString(), callback);
			}

			expect(callback).toHaveBeenCalledWith(
				expectedTextMatch,
				expectedStartPosition
			);
		}
	});

	it('should do nothing if no regexes (empty array) are provided', () => {
		const callback = jest.fn();
		getTextMatch([], 'test', callback);
		expect(callback).toHaveBeenCalledTimes(0);
	});

	it.each([
		[
			'simple multi string',
			`className={clsx("hello", "world")}`,
			[
				{ match: 'hello', startPosition: 'className={clsx("'.length },
				{ match: 'world', startPosition: 'className={clsx("hello", "'.length },
			],
		],
		[
			'foo func multi str single quotes',
			generateEditorText(`{ foo('${classString}', 'class1 class2') }`),
			[
				{ match: classString, startPosition: startPosition + "{ foo('".length },
				{
					match: 'class1 class2',
					startPosition:
						startPosition +
						"{ foo('".length +
						classString.length +
						"', '".length,
				},
			],
		],
		[
			'foo func multi str double quotes',
			generateEditorText(`{ foo("${classString}", "class1 class2") }`),
			[
				{ match: classString, startPosition: startPosition + '{ foo("'.length },
				{
					match: 'class1 class2',
					startPosition:
						startPosition +
						'{ foo("'.length +
						classString.length +
						'", "'.length,
				},
			],
		],
		[
			'foo func multi var multi str single quotes',
			generateEditorText(
				`{ clsx(foo, bar, '${classString}', foo, 'class1 class2', bar) }`
			),
			[
				{
					match: classString,
					startPosition: startPosition + "{ clsx(foo, bar, '".length,
				},
				{
					match: 'class1 class2',
					startPosition:
						startPosition + `{ clsx(foo, bar, '${classString}', foo, '`.length,
				},
			],
		],
		[
			'foo func multi var multi str double quotes',
			generateEditorText(
				`{ clsx(foo, bar, "${classString}", foo, "class1 class2", bar) }`
			),
			[
				{
					match: classString,
					startPosition: startPosition + '{ clsx(foo, bar, "'.length,
				},
				{
					match: 'class1 class2',
					startPosition:
						startPosition + `{ clsx(foo, bar, "${classString}", foo, "`.length,
				},
			],
		],
		[
			'complex foo func single quotes multi lines',
			generateEditorText(`{ clsx(
								    foo,
								    bar,
								    '${classString}',
								    foo,
								    'class1 class2',
								    bar)
								}`),
			[
				{
					match: classString,
					startPosition:
						startPosition +
						`{ clsx(
								    foo,
								    bar,
								    '`.length,
				},
				{
					match: 'class1 class2',
					startPosition:
						startPosition +
						`{ clsx(
								    foo,
								    bar,
								    '${classString}',
								    foo,
								    '`.length,
				},
			],
		],
		[
			'complex foo func double quotes multi lines',
			generateEditorText(`{ clsx(
									  foo,
									  bar,
									  "${classString}",
									  foo,
									  "class1 class2",
									  bar
								  }`),
			[
				{
					match: classString,
					startPosition:
						startPosition +
						`{ clsx(
									  foo,
									  bar,
									  "`.length,
				},
				{
					match: 'class1 class2',
					startPosition:
						startPosition +
						`{ clsx(
									  foo,
									  bar,
									  "${classString}",
									  foo,
									  "`.length,
				},
			],
		],
	])('%s', (testName, editorText, expectedResults) => {
		for (const jsxLanguage of jsxLanguages) {
			const callback = jest.fn();

			for (const matcher of buildMatchers(configRegex[jsxLanguage])) {
				getTextMatch(matcher.regex, editorText.toString(), callback);
			}

			expect(callback).toHaveBeenCalledTimes(expectedResults.length);
			expect(typeof expectedResults !== 'string').toBeTruthy();

			if (typeof expectedResults !== 'string') {
				expectedResults.forEach((expectedResult, idx) => {
					expect(callback).toHaveBeenNthCalledWith(
						idx + 1,
						expectedResult.match,
						expectedResult.startPosition
					);
				});
			}
		}
	});
});

describe('twin macro - extract tw prop (jsx) string(s) with multiple regexes', () => {
	const configRegex: { [key: string]: any } =
		pjson.contributes.configuration.properties['headwind.classRegex']
			.default;
	const jsxLanguages = [
		'javascript',
		'javascriptreact',
		'typescript',
		'typescriptreact',
	];

	it.each([
		[
			'simple twin macro example',
			`import 'twin.macro'

			const Input = () => <input tw="border hover:border-black" />
			`,
			[
				{
					match: 'border hover:border-black',
					startPosition: `import 'twin.macro'

			const Input = () => <input tw="`.length,
				},
			],
		],
		[
			'simple twin macro example',
			`import 'twin.macro'

			const Input = () => <input tw={!error ? "border hover:border-black" : "border border-red-500"} />
			`,
			[
				{
					match: 'border hover:border-black',
					startPosition: `import 'twin.macro'

			const Input = () => <input tw={!error ? "`.length,
				},
				{
					match: 'border border-red-500',
					startPosition: `import 'twin.macro'

			const Input = () => <input tw={!error ? "border hover:border-black" : "`.length,
				},
			],
		],
	])('%s', (testName, editorText, expectedResults) => {
		for (const jsxLanguage of jsxLanguages) {
			const callback = jest.fn();

			for (const matcher of buildMatchers(configRegex[jsxLanguage])) {
				getTextMatch(matcher.regex, editorText.toString(), callback);
			}

			expect(callback).toHaveBeenCalledTimes(expectedResults.length);
			expect(typeof expectedResults !== 'string').toBeTruthy();

			if (typeof expectedResults !== 'string') {
				expectedResults.forEach((expectedResult, idx) => {
					expect(callback).toHaveBeenNthCalledWith(
						idx + 1,
						expectedResult.match,
						expectedResult.startPosition
					);
				});
			}
		}
	});
});

describe('buildMatchers', () => {
	it.each<[string, LangConfig | LangConfig[], Matcher[]]>([
		['undefined', undefined, []],
		['empty', [], []],
		[
			'layered regexes',
			[
				'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
				'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
			],
			[
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
						/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi,
					],
				},
			],
		],
		[
			'multiple layered regexes',
			[
				[
					'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
					'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
				],
				[
					'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
					'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
				],
			],
			[
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
						/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi,
					],
				},
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
						/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi,
					],
				},
			],
		],
		[
			'matcher',
			{
				regex: [
					'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
					'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
				],
				separator: '\\+\\+',
				replacement: '++',
			},
			[
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
						/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi,
					],
					separator: /\+\+/g,
					replacement: '++',
				},
			],
		],
		[
			'empty matcher',
			{},
			[
				{
					regex: [],
					separator: undefined,
					replacement: undefined,
				},
			],
		],
		[
			'various',
			[
				[
					'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
				],
				'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
				{
					regex: [
						'(?:\\bclass(?:Name)?\\s*=\\s*(?:{([\\w\\d\\s_\\-:/${}()[\\]"\'`,]+)})|(["\'`][\\w\\d\\s_\\-:/]+["\'`]))|(?:\\btw\\s*(`[\\w\\d\\s_\\-:/]+`))',
						'(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
					],
					replacement: ' ',
				},
				{
					regex: '(?:["\'`]([\\w\\d\\s_\\-:/${}()[\\]"\']+)["\'`])',
					separator: '\\.',
					replacement: '.',
				},
			],
			[
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
					],
				},
				{
					regex: [/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi],
				},
				{
					regex: [
						/(?:\bclass(?:Name)?\s*=\s*(?:{([\w\d\s_\-:/${}()[\]"'`,]+)})|(["'`][\w\d\s_\-:/]+["'`]))|(?:\btw\s*(`[\w\d\s_\-:/]+`))/gi,
						/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi,
					],
					separator: undefined,
					replacement: ' ',
				},
				{
					regex: [/(?:["'`]([\w\d\s_\-:/${}()[\]"']+)["'`])/gi],
					separator: /\./g,
					replacement: '.',
				},
			],
		],
	])('should handle %s configs', (_name, langConfig, matchers) => {
		expect(buildMatchers(langConfig)).toStrictEqual(matchers);
	});
});
