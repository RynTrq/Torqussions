import { HttpError } from '../utils/http-error.js';
import {
    inferPreviewEntryPath,
    normalizeGeneratedFiles,
    normalizeWorkspaceFilePath,
} from '../utils/workspace.js';

export const AI_TRIGGER_PREFIX = '@ai';
export const AI_SENDER_ID = 'ai';
export const AI_SENDER_LABEL = 'Torq AI';

const AI_TRIGGER_PATTERN = /^@ai\b/i;
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_FILES = 10;
const MAX_MESSAGE_CHARS = 560;
const MAX_FILE_CHARS = 900;
const MAX_REPLY_CHARS = 12_000;

const getGeminiApiKey = () =>
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_KEY?.trim() || '';

const truncateText = (value, maxLength) => {
    if (typeof value !== 'string') {
        return '';
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length <= maxLength) {
        return normalizedValue;
    }

    return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
};

const getMessageAuthorLabel = (message) => {
    if (message?.type === 'ai') {
        return message?.senderLabel || AI_SENDER_LABEL;
    }

    return (
        message?.sender?.name?.trim() ||
        message?.sender?.email ||
        message?.senderLabel ||
        'Collaborator'
    );
};

const summarizeRecentMessages = (messages = []) => {
    if (!Array.isArray(messages) || !messages.length) {
        return 'No previous project conversation is available yet.';
    }

    return messages
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((message) => {
            const createdAt = message?.createdAt
                ? new Date(message.createdAt).toISOString()
                : 'unknown-time';

            return `- [${createdAt}] ${getMessageAuthorLabel(message)}: ${truncateText(
                message?.content || '',
                MAX_MESSAGE_CHARS,
            )}`;
        })
        .join('\n');
};

const summarizeFileTree = (fileTree = {}) => {
    const entries = Object.entries(fileTree || {});

    if (!entries.length) {
        return 'No shared files are currently stored in the workspace.';
    }

    return entries
        .slice(0, MAX_CONTEXT_FILES)
        .map(([ fileName, fileValue ]) => {
            const contents = truncateText(fileValue?.file?.contents || '', MAX_FILE_CHARS);
            const language = fileValue?.file?.language || fileName.split('.').pop() || 'text';

            return [
                `File: ${fileName}`,
                `Language: ${language}`,
                contents ? `Preview:\n${contents}` : 'Preview: Empty file',
            ].join('\n');
        })
        .join('\n\n');
};

const buildSystemInstruction = () =>
    `
You are ${AI_SENDER_LABEL}, the built-in AI collaborator inside Torqussions.

You join a live project room whenever a collaborator starts a message with ${AI_TRIGGER_PREFIX}.
You are helping a team discuss, plan, and build together in a shared workspace.

You must return valid JSON only. Do not use markdown code fences. Do not add commentary outside the JSON.

Return this exact top-level shape:
{
  "reply": "string",
  "mode": "chat" | "workspace_update",
  "summary": "short string",
  "files": [
    {
      "path": "relative/file/name.ext",
      "contents": "full file contents",
      "description": "what this file is for"
    }
  ],
  "preview": {
    "entry": "index.html",
    "instructions": "short note about how collaborators can run or review the result"
  }
}

Rules:
- Use "chat" when the user only needs an answer in the timeline.
- Use "workspace_update" when the user asks for code, file edits, UI, prototypes, docs, plans, or anything that should become a workspace file.
- When generating runnable UI or code for the in-app preview, prefer a simple HTML, CSS, and JavaScript bundle with an "index.html" entry file.
- Reuse existing workspace file names when the request clearly sounds like an update.
- Keep the reply collaborative, concise, and actionable.
- Keep file count to 6 or fewer unless the request absolutely requires more.
- Never invent project facts that are not supported by the provided context.
`.trim();

const buildUserPrompt = ({ project, prompt, recentMessages }) =>
    `
Current date: ${new Date().toISOString()}

Project name: ${project?.name || 'Untitled project'}
Project description: ${project?.description || 'No description provided.'}

Current workspace files:
${summarizeFileTree(project?.fileTree)}

Recent project conversation:
${summarizeRecentMessages(recentMessages)}

Collaborator request after ${AI_TRIGGER_PREFIX}:
${prompt}

Respond as ${AI_SENDER_LABEL}.
`.trim();

const extractGeminiText = (payload) =>
    payload?.candidates?.[ 0 ]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('')
        .trim() || '';

const stripCodeFenceWrapper = (value = '') =>
    value
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

const parseJsonCandidate = (value = '') => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(stripCodeFenceWrapper(value));
    } catch {
        return null;
    }
};

const extractJsonPayload = (value = '') => {
    const directParse = parseJsonCandidate(value);

    if (directParse) {
        return directParse;
    }

    const trimmed = stripCodeFenceWrapper(value);
    const firstBraceIndex = trimmed.indexOf('{');
    const lastBraceIndex = trimmed.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
        return null;
    }

    return parseJsonCandidate(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
};

const buildFallbackReply = (rawText) => ({
    reply: truncateText(rawText, MAX_REPLY_CHARS),
    mode: 'chat',
    summary: '',
    files: [],
    preview: null,
});

const normalizeAssistantPreview = (preview, files) => {
    if (!files.length) {
        return null;
    }

    const normalizedEntry = normalizeWorkspaceFilePath(
        preview?.entry || preview?.file || inferPreviewEntryPath(files),
    );

    return {
        entry: normalizedEntry || inferPreviewEntryPath(files),
        instructions: truncateText(preview?.instructions || '', 220),
    };
};

const normalizeAssistantResponse = (rawText = '') => {
    const parsedPayload = extractJsonPayload(rawText);

    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
        return buildFallbackReply(rawText);
    }

    const normalizedFiles = normalizeGeneratedFiles(parsedPayload.files);
    const normalizedReply = truncateText(parsedPayload.reply || rawText, MAX_REPLY_CHARS);
    const normalizedMode =
        normalizedFiles.length || parsedPayload.mode === 'workspace_update'
            ? 'workspace_update'
            : 'chat';

    return {
        reply:
            normalizedReply ||
            (normalizedFiles.length
                ? 'I added new workspace files for the team and noted how to use them.'
                : ''),
        mode: normalizedMode,
        summary: truncateText(parsedPayload.summary || '', 180),
        files: normalizedFiles,
        preview: normalizeAssistantPreview(parsedPayload.preview, normalizedFiles),
    };
};

export const getAiAssistantSettings = () => ({
    configured: Boolean(getGeminiApiKey()),
    provider: 'Gemini',
    model: DEFAULT_GEMINI_MODEL,
    trigger: AI_TRIGGER_PREFIX,
    label: AI_SENDER_LABEL,
    capabilities: {
        chat: true,
        workspaceUpdates: true,
        preview: true,
    },
});

export const isAiTriggeredContent = (content = '') =>
    typeof content === 'string' && AI_TRIGGER_PATTERN.test(content.trim());

export const extractAiPrompt = (content = '') => {
    if (typeof content !== 'string') {
        return '';
    }

    return content.trim().replace(AI_TRIGGER_PATTERN, '').trim();
};

export const validateAiPromptContent = (content = '') => {
    if (isAiTriggeredContent(content) && !extractAiPrompt(content)) {
        throw new HttpError(400, `Add a request after ${AI_TRIGGER_PREFIX} to prompt Torq AI.`);
    }
};

export const generateProjectAssistantReply = async ({
    project,
    prompt,
    recentMessages = [],
}) => {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
        throw new HttpError(
            503,
            'Torq AI is not configured yet. Add GEMINI_API_KEY on the backend to enable @ai replies.',
        );
    }

    const trimmedPrompt = prompt?.trim();

    if (!trimmedPrompt) {
        throw new HttpError(400, `Add a request after ${AI_TRIGGER_PREFIX} to prompt Torq AI.`);
    }

    const requestBody = {
        system_instruction: {
            parts: [
                {
                    text: buildSystemInstruction(),
                },
            ],
        },
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: buildUserPrompt({
                            project,
                            prompt: trimmedPrompt,
                            recentMessages,
                        }),
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.55,
            topP: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
    };

    let response;

    try {
        response = await fetch(
            `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(
                DEFAULT_GEMINI_MODEL,
            )}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify(requestBody),
            },
        );
    } catch (error) {
        throw new HttpError(502, 'Gemini could not be reached right now.', {
            cause: error.message,
        });
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new HttpError(
            response.status >= 500 ? 502 : response.status,
            payload?.error?.message || 'Gemini could not generate a response right now.',
        );
    }

    if (payload?.promptFeedback?.blockReason) {
        throw new HttpError(
            422,
            `Gemini blocked this request: ${payload.promptFeedback.blockReason.toLowerCase()}.`,
        );
    }

    const rawText = extractGeminiText(payload);

    if (!rawText) {
        throw new HttpError(502, 'Gemini returned an empty response.');
    }

    const normalizedReply = normalizeAssistantResponse(rawText);

    if (!normalizedReply.reply) {
        throw new HttpError(502, 'Gemini returned an unusable response.');
    }

    return {
        content: normalizedReply.reply,
        model: DEFAULT_GEMINI_MODEL,
        mode: normalizedReply.mode,
        summary: normalizedReply.summary,
        files: normalizedReply.files,
        preview: normalizedReply.preview,
    };
};
