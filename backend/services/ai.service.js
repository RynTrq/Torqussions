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
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_FILES = 10;
const MAX_MESSAGE_CHARS = 560;
const MAX_FILE_CHARS = 900;
const MAX_REPLY_CHARS = 12_000;

const AI_PROVIDER_LABELS = {
    gemini: 'Gemini',
    grok: 'Grok',
};

const AI_PROVIDER_MODEL_OPTIONS = {
    gemini: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
    ],
    grok: [
        'grok-4',
        'grok-4-fast-reasoning',
    ],
};

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GROK_API_BASE_URL = 'https://api.x.ai/v1';

const getTrimmedEnv = (key) => process.env[key]?.trim() || '';

const AI_PROVIDER_CONFIG = {
    gemini: {
        apiKey: () => getTrimmedEnv('GEMINI_API_KEY') || getTrimmedEnv('GOOGLE_AI_KEY'),
        defaultModel: () => getTrimmedEnv('GEMINI_MODEL') || AI_PROVIDER_MODEL_OPTIONS.gemini[0],
        label: AI_PROVIDER_LABELS.gemini,
        models: AI_PROVIDER_MODEL_OPTIONS.gemini,
    },
    grok: {
        apiKey: () => getTrimmedEnv('XAI_API_KEY') || getTrimmedEnv('GROK_API_KEY'),
        defaultModel: () => getTrimmedEnv('GROK_MODEL') || AI_PROVIDER_MODEL_OPTIONS.grok[0],
        label: AI_PROVIDER_LABELS.grok,
        models: AI_PROVIDER_MODEL_OPTIONS.grok,
    },
};

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

const extractGeminiText = (payload) =>
    payload?.candidates?.[ 0 ]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('')
        .trim() || '';

const extractGrokText = (payload) =>
    payload?.output
        ?.flatMap((item) => item?.content || [])
        .map((part) => part?.text || '')
        .join('')
        .trim() || '';

export const normalizeAiProvider = (value = '') => {
    const normalizedProvider = String(value || '').trim().toLowerCase();
    return AI_PROVIDER_CONFIG[ normalizedProvider ] ? normalizedProvider : '';
};

export const getAiProviderLabel = (provider = '') =>
    AI_PROVIDER_CONFIG[ provider ]?.label || AI_PROVIDER_LABELS[ provider ] || 'AI';

export const getDefaultAiProvider = () => {
    const preferredProvider = normalizeAiProvider(getTrimmedEnv('AI_PROVIDER'));

    if (preferredProvider && AI_PROVIDER_CONFIG[ preferredProvider ]?.apiKey()) {
        return preferredProvider;
    }

    return Object.keys(AI_PROVIDER_CONFIG).find(
        (provider) => AI_PROVIDER_CONFIG[ provider ].apiKey(),
    ) || 'gemini';
};

export const getDefaultAiModel = (provider = getDefaultAiProvider()) =>
    AI_PROVIDER_CONFIG[ provider ]?.defaultModel() || '';

export const getAvailableAiProviders = () =>
    Object.entries(AI_PROVIDER_CONFIG).map(([ id, config ]) => ({
        configured: Boolean(config.apiKey()),
        defaultModel: config.defaultModel(),
        id,
        label: config.label,
        models: config.models,
    }));

export const getRecommendedAiModels = (provider = '') =>
    AI_PROVIDER_CONFIG[ provider ]?.models || [];

export const getResolvedAssistantSettings = (project = null) => {
    const projectProvider = normalizeAiProvider(project?.assistant?.provider);
    const defaultProvider = getDefaultAiProvider();
    const provider = projectProvider || defaultProvider;
    const model =
        truncateText(project?.assistant?.model || '', 120) || getDefaultAiModel(provider);
    const providerConfig = AI_PROVIDER_CONFIG[ provider ];
    const availableProviders = getAvailableAiProviders();

    return {
        availableProviders,
        configured: Boolean(providerConfig?.apiKey()),
        label: AI_SENDER_LABEL,
        model,
        provider,
        providerLabel: getAiProviderLabel(provider),
        recommendedModels: getRecommendedAiModels(provider),
        trigger: AI_TRIGGER_PREFIX,
    };
};

export const validateAssistantSettingsInput = ({ provider, model }) => {
    const normalizedProvider = normalizeAiProvider(provider);
    const normalizedModel = truncateText(model || '', 120);

    if (!normalizedProvider) {
        throw new HttpError(400, 'Choose a supported AI provider.');
    }

    if (!AI_PROVIDER_CONFIG[ normalizedProvider ]?.apiKey()) {
        throw new HttpError(
            400,
            `${getAiProviderLabel(normalizedProvider)} is not configured on the backend yet.`,
        );
    }

    if (!normalizedModel) {
        throw new HttpError(400, 'Choose an AI model.');
    }

    return {
        model: normalizedModel,
        provider: normalizedProvider,
    };
};

export const getAiAssistantSettings = (project = null) => {
    const resolved = getResolvedAssistantSettings(project);

    return {
        capabilities: {
            chat: true,
            preview: true,
            workspaceUpdates: true,
        },
        configured: resolved.configured,
        label: resolved.label,
        model: resolved.model,
        provider: resolved.provider,
        providerLabel: resolved.providerLabel,
        recommendedModels: resolved.recommendedModels,
        trigger: resolved.trigger,
        availableProviders: resolved.availableProviders,
    };
};

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

const generateGeminiReply = async ({ apiKey, model, project, prompt, recentMessages }) => {
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
                            prompt,
                            recentMessages,
                        }),
                    },
                ],
            },
        ],
        generationConfig: {
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            temperature: 0.55,
            topP: 0.9,
        },
    };

    let response;

    try {
        response = await fetch(
            `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
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

    return extractGeminiText(payload);
};

const generateGrokReply = async ({ apiKey, model, project, prompt, recentMessages }) => {
    const requestBody = {
        input: [
            {
                content: buildSystemInstruction(),
                role: 'system',
            },
            {
                content: buildUserPrompt({
                    project,
                    prompt,
                    recentMessages,
                }),
                role: 'user',
            },
        ],
        max_output_tokens: 4096,
        model,
        temperature: 0.55,
    };

    let response;

    try {
        response = await fetch(`${GROK_API_BASE_URL}/responses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        throw new HttpError(502, 'Grok could not be reached right now.', {
            cause: error.message,
        });
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new HttpError(
            response.status >= 500 ? 502 : response.status,
            payload?.error?.message || 'Grok could not generate a response right now.',
        );
    }

    return extractGrokText(payload);
};

const generateRawProviderReply = async ({
    apiKey,
    model,
    project,
    prompt,
    provider,
    recentMessages,
}) => {
    if (provider === 'grok') {
        return generateGrokReply({
            apiKey,
            model,
            project,
            prompt,
            recentMessages,
        });
    }

    return generateGeminiReply({
        apiKey,
        model,
        project,
        prompt,
        recentMessages,
    });
};

export const generateProjectAssistantReply = async ({
    project,
    prompt,
    recentMessages = [],
}) => {
    const resolvedSettings = getResolvedAssistantSettings(project);
    const trimmedPrompt = prompt?.trim();

    if (!trimmedPrompt) {
        throw new HttpError(400, `Add a request after ${AI_TRIGGER_PREFIX} to prompt Torq AI.`);
    }

    const providerConfig = AI_PROVIDER_CONFIG[ resolvedSettings.provider ];
    const apiKey = providerConfig?.apiKey();

    if (!apiKey) {
        throw new HttpError(
            503,
            `${resolvedSettings.providerLabel} is not configured yet. Add the backend API key to enable ${AI_TRIGGER_PREFIX} replies.`,
        );
    }

    const rawText = await generateRawProviderReply({
        apiKey,
        model: resolvedSettings.model,
        project,
        prompt: trimmedPrompt,
        provider: resolvedSettings.provider,
        recentMessages,
    });

    if (!rawText) {
        throw new HttpError(
            502,
            `${resolvedSettings.providerLabel} returned an empty response.`,
        );
    }

    const normalizedReply = normalizeAssistantResponse(rawText);

    if (!normalizedReply.reply) {
        throw new HttpError(
            502,
            `${resolvedSettings.providerLabel} returned an unusable response.`,
        );
    }

    return {
        content: normalizedReply.reply,
        mode: normalizedReply.mode,
        model: resolvedSettings.model,
        preview: normalizedReply.preview,
        provider: resolvedSettings.providerLabel,
        summary: normalizedReply.summary,
        files: normalizedReply.files,
    };
};
