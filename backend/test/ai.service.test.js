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
    process.env.AI_PROVIDER = 'grok';
    process.env.XAI_API_KEY = 'test-grok-key';
    process.env.GROK_MODEL = 'grok-4';

    const { getDefaultAiProvider, getResolvedAssistantSettings } = await import(
        '../services/ai.service.js'
    );

    assert.equal(getDefaultAiProvider(), 'grok');
    assert.equal(getResolvedAssistantSettings().model, 'grok-4');
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

test('validateAssistantSettingsInput rejects unsupported or unconfigured providers', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.XAI_API_KEY;

    const { validateAssistantSettingsInput } = await import('../services/ai.service.js');

    assert.throws(
        () => validateAssistantSettingsInput({ provider: 'grok', model: 'grok-4' }),
        /not configured/i,
    );
    assert.throws(
        () => validateAssistantSettingsInput({ provider: 'bogus', model: 'anything' }),
        /supported AI provider/i,
    );
});
