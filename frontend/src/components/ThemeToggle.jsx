import React from 'react'
import { useTheme } from '../context/theme.context'

const ThemeToggle = ({ compact = false }) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`torq-theme-toggle ${compact ? 'torq-theme-toggle--compact' : ''}`}
      onClick={toggleTheme}
      type="button"
    >
      <span className="torq-theme-toggle__track">
        <span className="torq-theme-toggle__icon" aria-hidden="true">
          {isDark ? (
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <path
                d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          ) : (
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2.75v2.5M12 18.75v2.5M5.46 5.46l1.77 1.77M16.77 16.77l1.77 1.77M2.75 12h2.5M18.75 12h2.5M5.46 18.54l1.77-1.77M16.77 7.23l1.77-1.77"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          )}
        </span>
        <span className="torq-theme-toggle__copy">
          <span className="torq-theme-toggle__label">
            {isDark ? 'Dark mode' : 'Light mode'}
          </span>
          {!compact ? (
            <span className="torq-theme-toggle__hint">
              Switch to {isDark ? 'light' : 'dark'}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}

export default ThemeToggle

