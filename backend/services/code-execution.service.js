import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { HttpError } from '../utils/http-error.js';
import {
    assertWorkspaceFileTreePayload,
    getWorkspaceFileLanguage,
    normalizeWorkspaceFilePath,
    sanitizeWorkspaceFileContents,
} from '../utils/workspace.js';
import { getProjectById } from './project.service.js';

const EXECUTION_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_LENGTH = 24_000;
const MAX_STDIN_LENGTH = 8_000;

export const SUPPORTED_EXECUTION_RUNTIMES = [
    'python',
    'javascript',
    'c',
    'cpp',
    'java',
];

const RUNTIME_CONFIG = {
    c: {
        command: 'gcc',
        compileArgs: [ '-std=c11', '-O0' ],
        extension: '.c',
        missingCommandMessage: 'C execution is unavailable because gcc is not installed.',
        runLabel: 'C',
    },
    cpp: {
        command: 'g++',
        compileArgs: [ '-std=c++17', '-O0' ],
        extension: '.cpp',
        missingCommandMessage: 'C++ execution is unavailable because g++ is not installed.',
        runLabel: 'C++',
    },
    javascript: {
        command: 'node',
        extension: '.js',
        missingCommandMessage: 'JavaScript execution is unavailable because Node.js is not installed.',
        runLabel: 'JavaScript',
    },
    java: {
        command: 'javac',
        extension: '.java',
        missingCommandMessage: 'Java execution is unavailable because javac is not installed.',
        runCommand: 'java',
        runLabel: 'Java',
    },
    python: {
        command: 'python3',
        extension: '.py',
        missingCommandMessage: 'Python execution is unavailable because python3 is not installed.',
        runLabel: 'Python',
    },
};

const normalizeRuntime = (runtime = '') => {
    const safeRuntime = String(runtime || '').trim().toLowerCase();

    if (safeRuntime === 'c++') {
        return 'cpp';
    }

    return SUPPORTED_EXECUTION_RUNTIMES.includes(safeRuntime) ? safeRuntime : '';
};

const inferRuntimeFromEntryFile = (entryFile = '') => {
    const fileLanguage = getWorkspaceFileLanguage(entryFile);

    return SUPPORTED_EXECUTION_RUNTIMES.includes(fileLanguage) ? fileLanguage : '';
};

const appendOutputChunk = (state, chunk) => {
    const value = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');

    if (!value) {
        return;
    }

    if (state.value.length >= MAX_OUTPUT_LENGTH) {
        state.truncated = true;
        return;
    }

    const remaining = MAX_OUTPUT_LENGTH - state.value.length;

    if (value.length > remaining) {
        state.value += value.slice(0, remaining);
        state.truncated = true;
        return;
    }

    state.value += value;
};

const finalizeOutput = (state) =>
    state.truncated ? `${state.value}\n\n[output truncated]` : state.value;

const buildCommandLabel = (command, args = []) =>
    [ command, ...args ].filter(Boolean).join(' ');

const extractJavaPackageName = (contents = '') => {
    const packageMatch = contents.match(/^\s*package\s+([A-Za-z_][\w.]*)\s*;/m);

    return packageMatch?.[1] || '';
};

const extractJavaClassName = (contents = '') => {
    const classMatch = contents.match(/^\s*(?:public\s+)?class\s+([A-Za-z_]\w*)\b/m);

    return classMatch?.[1] || '';
};

const getJavaMainClassName = ({ entryFile, contents }) => {
    const packageName = extractJavaPackageName(contents);
    const className =
        extractJavaClassName(contents) ||
        path.basename(entryFile, path.extname(entryFile));

    return packageName ? `${packageName}.${className}` : className;
};

const runCommand = ({
    command,
    args = [],
    cwd,
    stdin = '',
    missingCommandMessage,
}) =>
    new Promise((resolve, reject) => {
        const stdout = { truncated: false, value: '' };
        const stderr = { truncated: false, value: '' };
        let timedOut = false;

        const child = spawn(command, args, {
            cwd,
            stdio: 'pipe',
        });

        const timeoutId = setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
        }, EXECUTION_TIMEOUT_MS);

        child.on('error', (error) => {
            clearTimeout(timeoutId);

            if (error.code === 'ENOENT') {
                reject(new HttpError(500, missingCommandMessage));
                return;
            }

            reject(error);
        });

        child.stdout.on('data', (chunk) => {
            appendOutputChunk(stdout, chunk);
        });

        child.stderr.on('data', (chunk) => {
            appendOutputChunk(stderr, chunk);
        });

        child.stdin.on('error', () => {
            // Ignore broken pipe errors when a process exits before reading stdin.
        });

        child.on('close', (code, signal) => {
            clearTimeout(timeoutId);
            resolve({
                exitCode: typeof code === 'number' ? code : signal ? 1 : 0,
                signal,
                stderr: finalizeOutput(stderr),
                stdout: finalizeOutput(stdout),
                timedOut,
            });
        });

        const safeInput = sanitizeWorkspaceFileContents(stdin).slice(0, MAX_STDIN_LENGTH);
        if (safeInput) {
            child.stdin.write(safeInput);
        }
        child.stdin.end();
    });

const writeWorkspaceTree = async (workspaceDir, fileTree) => {
    const writeOperations = Object.entries(fileTree).map(async ([ filePath, fileValue ]) => {
        const absolutePath = path.join(workspaceDir, filePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, fileValue?.file?.contents || '', 'utf8');
    });

    await Promise.all(writeOperations);
};

const resolveEntryPath = async ({
    workspaceDir,
    runtime,
    fileTree,
    entryFile,
}) => {
    const absoluteEntryPath = path.join(workspaceDir, entryFile);
    const fileLanguage = getWorkspaceFileLanguage(entryFile);

    if (fileLanguage === runtime) {
        return {
            absolutePath: absoluteEntryPath,
            relativePath: entryFile,
        };
    }

    const config = RUNTIME_CONFIG[ runtime ];
    const syntheticRelativePath = path.join('__torq_exec__', `entry${config.extension}`);
    const syntheticAbsolutePath = path.join(workspaceDir, syntheticRelativePath);

    await fs.mkdir(path.dirname(syntheticAbsolutePath), { recursive: true });
    await fs.writeFile(
        syntheticAbsolutePath,
        fileTree[ entryFile ]?.file?.contents || '',
        'utf8',
    );

    return {
        absolutePath: syntheticAbsolutePath,
        relativePath: syntheticRelativePath,
    };
};

const buildExecutionResponse = ({
    command,
    durationMs,
    exitCode,
    runtime,
    stage,
    stderr,
    stdout,
    timedOut,
}) => ({
    command,
    durationMs,
    exitCode,
    runtime,
    stage,
    stderr,
    stdout,
    success: !timedOut && exitCode === 0,
    timedOut,
});

export const executeWorkspaceCode = async ({
    entryFile,
    fileTree,
    runtime,
    stdin = '',
}) => {
    const normalizedTree = assertWorkspaceFileTreePayload(fileTree);
    const safeEntryFile = normalizeWorkspaceFilePath(entryFile);

    if (!safeEntryFile || !normalizedTree[ safeEntryFile ]) {
        throw new HttpError(400, 'Choose a valid project file to run.');
    }

    const resolvedRuntime = normalizeRuntime(runtime) || inferRuntimeFromEntryFile(safeEntryFile);

    if (!resolvedRuntime) {
        throw new HttpError(400, 'Select a supported language before running this file.');
    }

    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'torq-run-'));
    const startTime = Date.now();

    try {
        await writeWorkspaceTree(workspaceDir, normalizedTree);

        const entryInfo = await resolveEntryPath({
            workspaceDir,
            runtime: resolvedRuntime,
            fileTree: normalizedTree,
            entryFile: safeEntryFile,
        });
        const runtimeConfig = RUNTIME_CONFIG[ resolvedRuntime ];

        if (
            resolvedRuntime === 'javascript' ||
            resolvedRuntime === 'python'
        ) {
            const args = [ entryInfo.relativePath ];
            const result = await runCommand({
                command: runtimeConfig.command,
                args,
                cwd: workspaceDir,
                stdin,
                missingCommandMessage: runtimeConfig.missingCommandMessage,
            });

            return buildExecutionResponse({
                command: buildCommandLabel(runtimeConfig.command, args),
                durationMs: Date.now() - startTime,
                exitCode: result.exitCode,
                runtime: resolvedRuntime,
                stage: 'run',
                stderr: result.stderr,
                stdout: result.stdout,
                timedOut: result.timedOut,
            });
        }

        if (resolvedRuntime === 'java') {
            const outputDirectory = path.join('__torq_exec__', 'java-out');
            const outputAbsoluteDirectory = path.join(workspaceDir, outputDirectory);
            await fs.mkdir(outputAbsoluteDirectory, { recursive: true });

            const compileArgs = [
                '-d',
                outputDirectory,
                entryInfo.relativePath,
            ];
            const compileResult = await runCommand({
                command: runtimeConfig.command,
                args: compileArgs,
                cwd: workspaceDir,
                missingCommandMessage: runtimeConfig.missingCommandMessage,
            });

            if (compileResult.timedOut || compileResult.exitCode !== 0) {
                return buildExecutionResponse({
                    command: buildCommandLabel(runtimeConfig.command, compileArgs),
                    durationMs: Date.now() - startTime,
                    exitCode: compileResult.exitCode,
                    runtime: resolvedRuntime,
                    stage: 'compile',
                    stderr: compileResult.stderr,
                    stdout: compileResult.stdout,
                    timedOut: compileResult.timedOut,
                });
            }

            const mainClassName = getJavaMainClassName({
                entryFile: safeEntryFile,
                contents: normalizedTree[ safeEntryFile ]?.file?.contents || '',
            });
            const runArgs = [ '-cp', outputDirectory, mainClassName ];
            const runResult = await runCommand({
                command: runtimeConfig.runCommand,
                args: runArgs,
                cwd: workspaceDir,
                stdin,
                missingCommandMessage: 'Java execution is unavailable because java is not installed.',
            });

            return buildExecutionResponse({
                command: buildCommandLabel(runtimeConfig.runCommand, runArgs),
                durationMs: Date.now() - startTime,
                exitCode: runResult.exitCode,
                runtime: resolvedRuntime,
                stage: 'run',
                stderr: runResult.stderr,
                stdout: runResult.stdout,
                timedOut: runResult.timedOut,
            });
        }

        const binaryRelativePath = path.join('__torq_exec__', 'program');
        const binaryAbsolutePath = path.join(workspaceDir, binaryRelativePath);
        await fs.mkdir(path.dirname(binaryAbsolutePath), { recursive: true });

        const compileArgs = [
            ...runtimeConfig.compileArgs,
            entryInfo.relativePath,
            '-o',
            binaryRelativePath,
        ];
        const compileResult = await runCommand({
            command: runtimeConfig.command,
            args: compileArgs,
            cwd: workspaceDir,
            missingCommandMessage: runtimeConfig.missingCommandMessage,
        });

        if (compileResult.timedOut || compileResult.exitCode !== 0) {
            return buildExecutionResponse({
                command: buildCommandLabel(runtimeConfig.command, compileArgs),
                durationMs: Date.now() - startTime,
                exitCode: compileResult.exitCode,
                runtime: resolvedRuntime,
                stage: 'compile',
                stderr: compileResult.stderr,
                stdout: compileResult.stdout,
                timedOut: compileResult.timedOut,
            });
        }

        const runResult = await runCommand({
            command: binaryAbsolutePath,
            cwd: workspaceDir,
            stdin,
            missingCommandMessage: `${runtimeConfig.runLabel} execution failed to start.`,
        });

        return buildExecutionResponse({
            command: buildCommandLabel(binaryRelativePath),
            durationMs: Date.now() - startTime,
            exitCode: runResult.exitCode,
            runtime: resolvedRuntime,
            stage: 'run',
            stderr: runResult.stderr,
            stdout: runResult.stdout,
            timedOut: runResult.timedOut,
        });
    } finally {
        await fs.rm(workspaceDir, { force: true, recursive: true });
    }
};

export const executeProjectCode = async ({
    entryFile,
    fileTree,
    projectId,
    runtime,
    stdin = '',
    userId,
}) => {
    const project = await getProjectById({ projectId, userId });

    return executeWorkspaceCode({
        entryFile,
        fileTree: fileTree || project.fileTree,
        runtime,
        stdin,
    });
};
