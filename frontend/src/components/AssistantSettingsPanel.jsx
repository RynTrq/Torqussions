import React from 'react'
import { formatAiModelLabel, getAiProviderLabel } from '../utils/workspace'

const AssistantSettingsPanel = ({
  assistantInfo,
  canManage,
  modelInput,
  onModelInputChange,
  onProviderChange,
  onSave,
  providerValue,
  saveError,
  saveStatus,
}) => {
  const availableProviders = assistantInfo?.availableProviders || []
  const selectedProviderConfig =
    availableProviders.find((provider) => provider.id === providerValue) || null
  const recommendedModels = selectedProviderConfig?.models || assistantInfo?.recommendedModels || []
  const isSaving = saveStatus === 'loading'

  return (
    <section className="torq-shell torq-panel-rise rounded-[1.8rem] p-5">
      <div className="border-b border-[var(--torq-line)] pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="torq-eyebrow">AI settings</p>
            <h3 className="torq-heading mt-3 text-3xl">Choose the model for this project</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--torq-ink-soft)]">
              Switch providers, change models, and keep the project on the assistant
              setup your team wants to use.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`torq-badge ${
                assistantInfo?.configured ? 'torq-badge-live' : 'torq-badge-warn'
              }`}
            >
              {assistantInfo?.configured ? 'Configured' : 'Needs API key'}
            </span>
            <span className="torq-badge torq-badge-neutral">
              {formatAiModelLabel({
                model: assistantInfo?.model,
                provider: assistantInfo?.provider,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr,1.08fr]">
        <div className="space-y-4">
          <div className="torq-shell-soft rounded-[1.25rem] p-4">
            <label className="text-sm font-medium text-[var(--torq-ink)]" htmlFor="assistant-provider">
              Provider
            </label>
            <select
              className="torq-select mt-2 px-4 py-3 text-sm"
              disabled={!canManage || isSaving}
              id="assistant-provider"
              onChange={(event) => onProviderChange(event.target.value)}
              value={providerValue}
            >
              {availableProviders.map((provider) => (
                <option
                  disabled={!provider.configured}
                  key={provider.id}
                  value={provider.id}
                >
                  {provider.label}
                  {provider.configured ? '' : ' (backend key missing)'}
                </option>
              ))}
            </select>
          </div>

          <div className="torq-shell-soft rounded-[1.25rem] p-4">
            <label className="text-sm font-medium text-[var(--torq-ink)]" htmlFor="assistant-model">
              Model
            </label>
            <input
              className="torq-input mt-2 px-4 py-3 text-sm"
              disabled={!canManage || isSaving}
              id="assistant-model"
              onChange={(event) => onModelInputChange(event.target.value)}
              placeholder="Enter a model id"
              type="text"
              value={modelInput}
            />
            <p className="mt-3 text-xs leading-6 text-[var(--torq-ink-soft)]">
              Recommended models appear on the right, but you can also paste a custom
              model id if your provider account exposes a newer one.
            </p>
          </div>

          <button
            className="torq-primary-button w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canManage || isSaving || !providerValue || !modelInput.trim()}
            onClick={onSave}
            type="button"
          >
            {isSaving ? 'Saving AI settings...' : 'Save AI settings'}
          </button>

          {!canManage ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-4 text-sm text-[var(--torq-ink-soft)]">
              Only project admins can change the shared AI provider and model.
            </div>
          ) : null}

          {saveError ? (
            <div className="torq-danger-panel rounded-[1rem] px-4 py-3 text-sm">
              {saveError}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="torq-shell-soft rounded-[1.25rem] p-4">
            <p className="torq-eyebrow">Current project assistant</p>
            <p className="mt-3 text-xl font-semibold text-[var(--torq-ink)]">
              {formatAiModelLabel({
                model: assistantInfo?.model,
                provider: assistantInfo?.provider,
              })}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Messages that start with {assistantInfo?.trigger || '@ai'} will use this
              provider and model.
            </p>
          </div>

          <div className="torq-shell-soft rounded-[1.25rem] p-4">
            <p className="torq-eyebrow">Recommended models</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendedModels.length ? (
                recommendedModels.map((model) => (
                  <button
                    className="rounded-full border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-3 py-2 text-xs font-medium text-[var(--torq-ink-soft)] transition hover:border-[rgba(13,156,138,0.22)] hover:text-[var(--torq-teal)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canManage || isSaving}
                    key={model}
                    onClick={() => onModelInputChange(model)}
                    type="button"
                  >
                    {formatAiModelLabel({ model, provider: providerValue })}
                  </button>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-4 text-sm text-[var(--torq-ink-soft)]">
                  No recommended models are available for {getAiProviderLabel(providerValue)} yet.
                </div>
              )}
            </div>
          </div>

          <div className="torq-shell-soft rounded-[1.25rem] p-4">
            <p className="torq-eyebrow">Backend availability</p>
            <div className="mt-4 space-y-2">
              {availableProviders.map((provider) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-3"
                  key={provider.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--torq-ink)]">
                      {provider.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--torq-ink-soft)]">
                      Default model: {provider.defaultModel || 'Not set'}
                    </p>
                  </div>
                  <span
                    className={`torq-badge ${
                      provider.configured ? 'torq-badge-live' : 'torq-badge-warn'
                    }`}
                  >
                    {provider.configured ? 'Ready' : 'Missing key'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AssistantSettingsPanel
