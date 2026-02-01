import {
	sortClassString as baseSortClassString,
	buildMatchers,
	getTextMatch,
	processText as baseProcessText,
	Options,
	LangConfig,
	Matcher
} from 'tailwind-sort';
import * as fs from 'fs/promises';

export {
	sortClassString,
	buildMatchers,
	getTextMatch,
	Options,
	LangConfig,
	Matcher
};

/**
 * Sorts a string of CSS classes using @herb-tools/tailwind-class-sorter.
 */
async function sortClassString(classString: string, options: Options): Promise<string> {
	return baseSortClassString(classString, options);
}

/**
 * Processes text and sorts Tailwind CSS classes found using language-specific regex.
 */
export async function processText(
	text: string,
	langConfig: LangConfig | LangConfig[],
	options: Options
): Promise<string> {
	// Check for headwind-ignore-all
	if (text.includes('headwind-ignore-all')) {
		return text;
	}

	const matchers = buildMatchers(langConfig);
	console.log('[Headwind DEBUG] Built', matchers.length, 'matchers for language');
	const matches: {
		classString: string;
		startPosition: number;
		separator?: RegExp;
		replacement?: string;
	}[] = [];

	for (const matcher of matchers) {
		getTextMatch(matcher.regex, text, (classString, startPosition) => {
			// Skip if has headwind-ignore
			if (!classString.includes('headwind-ignore')) {
				console.log('[Headwind DEBUG] Raw match:', classString.substring(0, 50), 'at', startPosition);
				matches.push({
					classString,
					startPosition,
					separator: matcher.separator,
					replacement: matcher.replacement,
				});
			}
		});
	}

	console.log('[Headwind DEBUG] Total raw matches:', matches.length);

	// If no matches, return original text
	if (matches.length === 0) {
		console.log('[Headwind DEBUG] No matches found, returning original text');
		return text;
	}

	// Filter overlapping matches: keep only the longest match for any given range
	// This fixes issues where multiple matchers (like in HAML) match overlapping parts
	const sortedMatches = matches.sort((a, b) => {
		if (a.startPosition !== b.startPosition) return a.startPosition - b.startPosition;
		return b.classString.length - a.classString.length; // Longest first
	});

	const filteredMatches: typeof matches = [];
	let lastMatchEnd = -1;

	for (const match of sortedMatches) {
		const matchEnd = match.startPosition + match.classString.length;
		if (match.startPosition >= lastMatchEnd) {
			filteredMatches.push(match);
			lastMatchEnd = matchEnd;
		} else if (matchEnd > lastMatchEnd) {
			// This match overlaps and extends beyond the current one.
			// This case is tricky, but for Headwind usually inner matches are fully contained.
			// If we found a longer match that started at the same position, we already took it.
			// If it starts later but ends later, it's a partial overlap.
			// For now, we strictly prefer the first/longer match that starts earlier.
		}
	}

	// Sort in reverse order for safe replacement
	filteredMatches.sort((a, b) => b.startPosition - a.startPosition);

	let result = text;
	console.log('[Headwind DEBUG] Found', filteredMatches.length, 'matches to process');

	for (const match of filteredMatches) {
		console.log('[Headwind DEBUG] Processing:', match.classString.substring(0, 50));
		console.log('[Headwind DEBUG] Separator:', match.separator, 'Replacement:', match.replacement);
		console.log('[Headwind DEBUG] Options:', JSON.stringify(options).substring(0, 150));
		const sorted = await sortClassString(match.classString, {
			...options,
			separator: match.separator || options.separator,
			replacement: match.replacement || options.replacement,
		});

		console.log('[Headwind DEBUG] Original:', match.classString.substring(0, 50));
		console.log('[Headwind DEBUG] Sorted:  ', sorted.substring(0, 50));
		console.log('[Headwind DEBUG] Changed: ', sorted !== match.classString);

		if (sorted !== match.classString) {
			result =
				result.slice(0, match.startPosition) +
				sorted +
				result.slice(match.startPosition + match.classString.length);
		}
	}

	return result;
}

/**
 * Processes a file and sorts Tailwind CSS classes.
 */
export async function processFile(
	filePath: string,
	langConfig: LangConfig | LangConfig[],
	options: Options
): Promise<void> {
	const content = await fs.readFile(filePath, 'utf-8');
	const processed = await processText(content, langConfig, options);

	if (processed !== content) {
		await fs.writeFile(filePath, processed, 'utf-8');
	}
}
