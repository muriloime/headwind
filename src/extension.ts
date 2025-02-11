'use strict';

import { commands, workspace, ExtensionContext, Range, window, TextEditorEdit } from 'vscode';
import { sortClassString, getTextMatch, buildMatchers } from './utils';
import { spawn } from 'child_process';
import { rustyWindPath } from 'rustywind';

export type LangConfig =
    | string
    | string[]
    | { regex?: string | string[]; separator?: string; replacement?: string }
    | undefined;

const config = workspace.getConfiguration();
const langConfig: { [key: string]: LangConfig | LangConfig[] } =
    config.get('headwind.classRegex') || {};

const sortOrder = config.get('headwind.defaultSortOrder');

const customTailwindPrefixConfig = config.get('headwind.customTailwindPrefix');
const customTailwindPrefix =
    typeof customTailwindPrefixConfig === 'string'
        ? customTailwindPrefixConfig
        : '';

const shouldRemoveDuplicatesConfig = config.get('headwind.removeDuplicates');
const shouldRemoveDuplicates =
    typeof shouldRemoveDuplicatesConfig === 'boolean'
        ? shouldRemoveDuplicatesConfig
        : true;

const shouldPrependCustomClassesConfig = config.get(
    'headwind.prependCustomClasses'
);
const shouldPrependCustomClasses =
    typeof shouldPrependCustomClassesConfig === 'boolean'
        ? shouldPrependCustomClassesConfig
        : false;

export function activate(context: ExtensionContext) {
    let disposable = commands.registerTextEditorCommand(
        'headwind.sortTailwindClasses',
        function (editor, edit) {
            const editorText = editor.document.getText();
            const editorLangId = editor.document.languageId;

            const matchers = buildMatchers(
                langConfig[editorLangId] || langConfig['html']
            );

            const edits: { range: Range; sorted: string }[] = [];

            for (const matcher of matchers) {
                // skip if text contains headwind-ignore-all
                if (editorText.includes('headwind-ignore-all')) {
                    return;
                }
                getTextMatch(matcher.regex, editorText, (text, startPosition) => {
                    //skip if text contains headwind-ignore
                    if (text.includes('headwind-ignore')) {
                        return;
                    }
                    const endPosition = startPosition + text.length;
                    const range = new Range(
                        editor.document.positionAt(startPosition),
                        editor.document.positionAt(endPosition)
                    );
                    const options = {
                        shouldRemoveDuplicates,
                        shouldPrependCustomClasses,
                        customTailwindPrefix,
                        separator: matcher.separator,
                        replacement: matcher.replacement,
                    };
                    const sorted = sortClassString(
                        text,
                        Array.isArray(sortOrder) ? sortOrder : [],
                        options
                    );
                    if (sorted != text) {
                        edits.push({ range, sorted });
                    }
                });
            }

            editor.edit((editBuilder: TextEditorEdit) => {
                for (const { range, sorted } of edits) {
                    editBuilder.replace(range, sorted);
                }
            }).then(success => {
                if (!success) {
                    console.log('Failed to apply edits!');
                } else {
                    console.log('Edits applied successfully!');
                }
            });
        }
    );

    let runOnProject = commands.registerCommand(
        'headwind.sortTailwindClassesOnWorkspace',
        async () => {
            let workspaceFolder = workspace.workspaceFolders || [];
            for (const folder of workspaceFolder) {

                // Call sortTailwindClasses for all workspace files with extensions ['jade', 'haml']
                const extensionFiles = await workspace.findFiles('**/*.{jade,haml}');

                window.showInformationMessage(
                    `Running Headwind on: ${folder.uri.fsPath}, ${extensionFiles.length} files found.`
                );

                let rustyWindArgs = [
                    folder.uri.fsPath,
                    '--write',
                    shouldRemoveDuplicates ? '' : '--allow-duplicates',
                ].filter((arg) => arg !== '');

                let rustyWindProc = spawn(rustyWindPath, rustyWindArgs);

                rustyWindProc.stdout.on(
                    'data',
                    (data) =>
                        data &&
                        data.toString() !== '' &&
                        console.log('rustywind stdout:\n', data.toString())
                );

                rustyWindProc.stderr.on('data', (data) => {
                    if (data && data.toString() !== '') {
                        console.log('rustywind stderr:\n', data.toString());
                        window.showErrorMessage(`Headwind error: ${data.toString()}`);
                    }
                });

                for (const file of extensionFiles) {
                    const document = await workspace.openTextDocument(file);
                    const editor = await window.showTextDocument(document);
                    await commands.executeCommand('headwind.sortTailwindClasses', editor);
                }
            }
        }
    );

    context.subscriptions.push(runOnProject);
    context.subscriptions.push(disposable);

    // if runOnSave is enabled organize tailwind classes before saving
    if (config.get('headwind.runOnSave')) {
        context.subscriptions.push(
            workspace.onWillSaveTextDocument((_e) => {
                commands.executeCommand('headwind.sortTailwindClasses');
            })
        );
    }
}