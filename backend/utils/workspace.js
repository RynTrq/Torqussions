import { HttpError } from './http-error.js';

const MAX_FILE_COUNT = 60;
const MAX_GENERATED_FILE_COUNT = 8;
const MAX_FILE_PATH_LENGTH = 120;
const MAX_FILE_CONTENT_LENGTH = 40_000;
const FILE_PATH_PATTERN = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]+$/;

const FILE_LANGUAGE_MAP = {
    c: 'c',
    cc: 'cpp',
    css: 'css',
    cpp: 'cpp',
    cxx: 'cpp',
    html: 'html',
    java: 'java',
    js: 'javascript',
    json: 'json',
    jsx: 'javascript',
    md: 'markdown',
    mjs: 'javascript',
    py: 'python',
    ts: 'typescript',
    tsx: 'typescript',
    txt: 'text',
};

const normalizeLineEndings = (value) => value.replace(/\r\n?/g, '\n');

export const normalizeWorkspaceFilePath = (rawPath = '') => {
    if (typeof rawPath !== 'string') {
        return '';
    }

    const normalizedPath = rawPath
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/+/g, '/');

    if (!normalizedPath) {
        return '';
    }

    if (
        normalizedPath.length > MAX_FILE_PATH_LENGTH ||
        normalizedPath.endsWith('/') ||
        !FILE_PATH_PATTERN.test(normalizedPath)
    ) {
        return '';
    }

    return normalizedPath;
};

export const getWorkspaceFileLanguage = (filePath = '') => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';

    return FILE_LANGUAGE_MAP[extension] || 'text';
};

export const sanitizeWorkspaceFileContents = (value = '') => {
    if (typeof value !== 'string') {
        return '';
    }

    return normalizeLineEndings(value).slice(0, MAX_FILE_CONTENT_LENGTH);
};

export const createWorkspaceFileEntry = (filePath, contents = '', extraFileData = {}) => ({
    file: {
        contents: sanitizeWorkspaceFileContents(contents),
        language: getWorkspaceFileLanguage(filePath),
        ...extraFileData,
    },
});

export const normalizeWorkspaceFileTree = (
    fileTree,
    { fallbackEntries = {}, allowEmpty = false } = {},
) => {
    const safeTree = {};
    const rawEntries =
        fileTree && typeof fileTree === 'object' && !Array.isArray(fileTree)
            ? Object.entries(fileTree)
            : [];

    for (const [ rawPath, rawValue ] of rawEntries.slice(0, MAX_FILE_COUNT)) {
        const normalizedPath = normalizeWorkspaceFilePath(rawPath);

        if (!normalizedPath) {
            continue;
        }

        const contents = sanitizeWorkspaceFileContents(rawValue?.file?.contents || '');

        safeTree[ normalizedPath ] = createWorkspaceFileEntry(normalizedPath, contents, {
            updatedAt: rawValue?.file?.updatedAt || undefined,
        });
    }

    if (Object.keys(safeTree).length) {
        return safeTree;
    }

    if (allowEmpty) {
        return {};
    }

    const normalizedFallback = normalizeWorkspaceFileTree(fallbackEntries, {
        allowEmpty: true,
    });

    if (Object.keys(normalizedFallback).length) {
        return normalizedFallback;
    }

    return {
        'README.md': createWorkspaceFileEntry(
            'README.md',
            '# Workspace\n\nStart outlining the plan, build, and next milestones here.\n',
        ),
    };
};

export const normalizeGeneratedFiles = (files = []) => {
    if (!Array.isArray(files)) {
        return [];
    }

    const uniqueFiles = [];
    const seenPaths = new Set();

    for (const candidate of files) {
        const normalizedPath = normalizeWorkspaceFilePath(candidate?.path || candidate?.name || '');

        if (!normalizedPath || seenPaths.has(normalizedPath)) {
            continue;
        }

        seenPaths.add(normalizedPath);

        uniqueFiles.push({
            path: normalizedPath,
            contents: sanitizeWorkspaceFileContents(candidate?.contents || ''),
            description:
                typeof candidate?.description === 'string'
                    ? candidate.description.trim().slice(0, 220)
                    : '',
            language: getWorkspaceFileLanguage(normalizedPath),
        });

        if (uniqueFiles.length >= MAX_GENERATED_FILE_COUNT) {
            break;
        }
    }

    return uniqueFiles;
};

export const mergeGeneratedFilesIntoTree = (fileTree, generatedFiles = []) => {
    const normalizedTree = normalizeWorkspaceFileTree(fileTree);
    const normalizedGeneratedFiles = normalizeGeneratedFiles(generatedFiles);

    for (const generatedFile of normalizedGeneratedFiles) {
        normalizedTree[ generatedFile.path ] = createWorkspaceFileEntry(
            generatedFile.path,
            generatedFile.contents,
            {
                updatedAt: new Date().toISOString(),
            },
        );
    }

    return {
        fileTree: normalizeWorkspaceFileTree(normalizedTree),
        generatedFiles: normalizedGeneratedFiles,
    };
};

export const inferPreviewEntryPath = (generatedFiles = []) => {
    const paths = generatedFiles.map((file) => file.path);
    const preferredEntries = [
        'index.html',
        'app.html',
        'preview.html',
        'demo.html',
    ];

    const directMatch = preferredEntries.find((path) => paths.includes(path));

    if (directMatch) {
        return directMatch;
    }

    return (
        paths.find((path) => path.endsWith('.html')) ||
        paths.find((path) => path.endsWith('.md')) ||
        paths[ 0 ] ||
        ''
    );
};

export const assertWorkspaceFileTreePayload = (fileTree) => {
    if (!fileTree || typeof fileTree !== 'object' || Array.isArray(fileTree)) {
        throw new HttpError(400, 'fileTree must be an object');
    }

    const normalizedTree = normalizeWorkspaceFileTree(fileTree, { allowEmpty: true });

    if (Object.keys(normalizedTree).length > MAX_FILE_COUNT) {
        throw new HttpError(400, `A workspace can contain up to ${MAX_FILE_COUNT} files.`);
    }

    return normalizedTree;
};
