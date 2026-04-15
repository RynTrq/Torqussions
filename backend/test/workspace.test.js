import test from 'node:test';
import assert from 'node:assert/strict';

import {
    assertWorkspaceFileTreePayload,
    mergeGeneratedFilesIntoTree,
    normalizeWorkspaceFilePath,
} from '../utils/workspace.js';

test('normalizeWorkspaceFilePath rejects traversal and normalizes separators', () => {
    assert.equal(normalizeWorkspaceFilePath('../secret.txt'), '');
    assert.equal(normalizeWorkspaceFilePath('/absolute.txt'), '');
    assert.equal(normalizeWorkspaceFilePath('src\\app.js'), 'src/app.js');
});

test('mergeGeneratedFilesIntoTree keeps sanitized workspace entries', () => {
    const result = mergeGeneratedFilesIntoTree(
        {
            'README.md': {
                file: {
                    contents: '# Hello\n',
                },
            },
        },
        [
            {
                path: 'src/index.js',
                contents: 'console.log("hi")\r\n',
                description: 'Entry point',
            },
            {
                path: '../bad.js',
                contents: 'bad',
            },
        ],
    );

    assert.deepEqual(Object.keys(result.fileTree).sort(), ['README.md', 'src/index.js']);
    assert.equal(result.fileTree['src/index.js'].file.contents, 'console.log("hi")\n');
    assert.equal(result.generatedFiles.length, 1);
});

test('assertWorkspaceFileTreePayload rejects invalid payloads', () => {
    assert.throws(() => assertWorkspaceFileTreePayload(null), /must be an object/i);
    assert.throws(() => assertWorkspaceFileTreePayload([]), /must be an object/i);
});
