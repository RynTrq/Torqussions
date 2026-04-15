import test from 'node:test';
import assert from 'node:assert/strict';

const originalEnv = { ...process.env };

test.afterEach(() => {
    for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) {
            delete process.env[ key ];
        }
    }

    for (const [ key, value ] of Object.entries(originalEnv)) {
        process.env[ key ] = value;
    }
});

test('getDefaultAiProvider prefers configured AI_PROVIDER when its key is present', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';

    const { getDefaultAiProvider, getResolvedAssistantSettings } = await import(
        '../services/ai.service.js'
    );

    assert.equal(getDefaultAiProvider(), 'groq');
    assert.equal(getResolvedAssistantSettings().model, 'llama-3.3-70b-versatile');
});

test('getResolvedAssistantSettings falls back to the first configured provider', async () => {
    delete process.env.AI_PROVIDER;
    delete process.env.XAI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-pro';

    const { getResolvedAssistantSettings } = await import('../services/ai.service.js');
    const settings = getResolvedAssistantSettings();

    assert.equal(settings.provider, 'gemini');
    assert.equal(settings.model, 'gemini-2.5-pro');
    assert.equal(settings.configured, true);
});

test('getResolvedAssistantSettings ignores a saved provider when its key is missing', async () => {
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
    delete process.env.GEMINI_API_KEY;

    const { getResolvedAssistantSettings } = await import('../services/ai.service.js');
    const settings = getResolvedAssistantSettings({
        assistant: {
            model: 'gemini-2.5-flash',
            provider: 'gemini',
        },
    });

    assert.equal(settings.provider, 'groq');
    assert.equal(settings.model, 'llama-3.3-70b-versatile');
    assert.equal(settings.configured, true);
});


test('validateAssistantSettingsInput rejects unsupported or unconfigured providers', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.XAI_API_KEY;

    const { validateAssistantSettingsInput } = await import('../services/ai.service.js');

    assert.throws(
        () => validateAssistantSettingsInput({ provider: 'groq', model: 'llama-3.3-70b-versatile' }),
        /not configured/i,
    );
    assert.throws(
        () => validateAssistantSettingsInput({ provider: 'bogus', model: 'anything' }),
        /supported AI provider/i,
    );
});
