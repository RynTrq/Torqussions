import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import iconProjects from '../assets/icon.png'
import ThemeToggle from './ThemeToggle'
import { UserContext } from '../context/user-context'
import { getInitials, getUserDisplayName } from '../utils/workspace'

const MENU_VIEWPORT_GAP = 16
const MENU_OFFSET = 12
const MENU_WIDTH = 352

const Header = ({
  title,
  subtitle,
  backLink,
  backLabel,
  actions,
  compact = false,
  sticky = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [invites, setInvites] = useState([])
  const [inviteStatus, setInviteStatus] = useState('idle')
  const [inviteActionId, setInviteActionId] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [menuPosition, setMenuPosition] = useState({
    left: MENU_VIEWPORT_GAP,
    top: 0,
    width: MENU_WIDTH,
  })
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const navigate = useNavigate()
  const { user, clearSession } = useContext(UserContext)

  const loadInvites = useCallback(async () => {
    if (!user?._id) {
      return
    }

    setInviteStatus('loading')
    setInviteError('')

    try {
      const { data } = await axios.get('/users/invites')
      setInvites(data.invitations || [])
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to load invitations right now.',
      )
    } finally {
      setInviteStatus('idle')
    }
  }, [user?._id])

  useEffect(() => {
    void loadInvites()
  }, [loadInvites])

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const updateMenuPosition = () => {
      const trigger = menuButtonRef.current

      if (!trigger) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const width = Math.min(MENU_WIDTH, window.innerWidth - MENU_VIEWPORT_GAP * 2)
      const left = Math.min(
        Math.max(MENU_VIEWPORT_GAP, rect.right - width),
        window.innerWidth - width - MENU_VIEWPORT_GAP,
      )

      setMenuPosition({
        left,
        top: rect.bottom + MENU_OFFSET,
        width,
      })
    }

    const handlePointerDown = (event) => {
      const target = event.target

      if (
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    updateMenuPosition()
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isMenuOpen])

  const handleLogout = async () => {
    setIsMenuOpen(false)
    await clearSession()
    navigate('/login')
  }

  const handleRespondToInvite = async (invite, action) => {
    const projectName = invite?.project?.name || 'this project'
    const confirmationMessage =
      action === 'accept'
        ? `Accept the invitation to join ${projectName}?`
        : `Decline the invitation to ${projectName}?`

    if (!window.confirm(confirmationMessage)) {
      return
    }

    setInviteActionId(invite._id)
    setInviteError('')

    try {
      const { data } = await axios.post(`/users/invites/${invite._id}/respond`, {
        action,
      })

      setInvites((currentInvites) =>
        currentInvites.filter((currentInvite) => currentInvite._id !== invite._id),
      )

      if (action === 'accept' && data.project?._id) {
        setIsMenuOpen(false)
        navigate(`/project/${data.project._id}`, {
          state: { project: data.project },
        })
      }
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to respond to that invitation right now.',
      )
    } finally {
      setInviteActionId('')
    }
  }

  const menuContent = isMenuOpen
    ? createPortal(
        <div
          className="fixed z-[140] transition"
          ref={menuRef}
          style={{
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`,
            width: `${menuPosition.width}px`,
          }}
        >
          <div className="torq-shell rounded-[1.6rem] p-3">
            <div className="torq-muted-panel rounded-[1.15rem] p-4">
              <p className="torq-eyebrow">Account</p>
              <p className="mt-2 text-base font-semibold text-[var(--torq-ink)]">
                {getUserDisplayName(user)}
              </p>
              <p className="mt-1 text-sm text-[var(--torq-ink-soft)]">{user?.email}</p>
            </div>

            <div className="torq-muted-panel mt-3 rounded-[1.15rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="torq-eyebrow">Invites</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--torq-ink)]">
                    Pending project invitations
                  </p>
                </div>

                <button
                  className="text-xs font-semibold text-[var(--torq-teal)]"
                  onClick={() => void loadInvites()}
                  type="button"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {inviteStatus === 'loading' ? (
                  <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-3 py-3 text-sm text-[var(--torq-ink-soft)]">
                    Loading invitations...
                  </div>
                ) : invites.length ? (
                  invites.map((invite) => {
                    const isResponding = inviteActionId === invite._id

                    return (
                      <div
                        className="rounded-[1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-3"
                        key={invite._id}
                      >
                        <p className="text-sm font-semibold text-[var(--torq-ink)]">
                          {invite.project?.name || 'Project invitation'}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--torq-ink-soft)]">
                          Invited by {getUserDisplayName(invite.invitedBy)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="torq-primary-button flex-1 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={Boolean(inviteActionId)}
                            onClick={() => void handleRespondToInvite(invite, 'accept')}
                            type="button"
                          >
                            {isResponding ? 'Working...' : 'Accept'}
                          </button>
                          <button
                            className="torq-secondary-button flex-1 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={Boolean(inviteActionId)}
                            onClick={() => void handleRespondToInvite(invite, 'decline')}
                            type="button"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-3 py-3 text-sm text-[var(--torq-ink-soft)]">
                    No pending invitations.
                  </div>
                )}
              </div>

              {inviteError ? (
                <div className="torq-danger-panel mt-3 rounded-[1rem] px-3 py-3 text-sm">
                  {inviteError}
                </div>
              ) : null}
            </div>

            <button
              className="torq-secondary-button mt-3 w-full px-4 py-3 text-sm font-medium"
              onClick={() => {
                setIsMenuOpen(false)
                navigate('/')
              }}
              type="button"
            >
              Open dashboard
            </button>

            <button
              className="torq-danger-button mt-2 w-full px-4 py-3 text-sm font-medium"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <header className={`${sticky ? 'sticky top-0 z-40' : 'relative z-20'} px-4 pt-4 lg:px-8`}>
        <div className="mx-auto max-w-7xl">
          <div className="torq-shell rounded-[1.8rem] px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex items-center gap-3">
              <Link
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] shadow-[0_14px_28px_rgba(13,25,44,0.08)] transition hover:-translate-y-0.5 ${
                  compact ? 'h-11 w-11' : 'h-12 w-12'
                }`}
                to="/"
              >
                <img
                  alt="Torqussions"
                  className={`transition duration-300 ${compact ? 'scale-[1.1]' : 'scale-[1.18]'}`}
                  src={iconProjects}
                />
              </Link>

              <div className="min-w-0">
                {backLink ? (
                  <Link className="torq-eyebrow transition hover:opacity-75" to={backLink}>
                    {backLabel || 'Back'}
                  </Link>
                ) : (
                  <p className="torq-eyebrow">Collaborative cockpit</p>
                )}

                <h1
                  className={`torq-heading truncate ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}
                >
                  {title}
                </h1>

                {subtitle ? (
                  <p
                    className={`mt-1 max-w-2xl text-sm leading-7 text-[var(--torq-ink-soft)] ${
                      compact ? 'hidden sm:block' : ''
                    }`}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="hidden md:flex md:items-center md:gap-2">{actions}</div>

                <ThemeToggle compact={compact} />

                <button
                  className={`relative flex items-center gap-2 rounded-[1.1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-1.5 py-1.5 shadow-[0_14px_28px_rgba(13,25,44,0.08)] transition hover:-translate-y-0.5 ${
                    compact ? 'pr-2' : 'pr-3'
                  }`}
                  onClick={() => setIsMenuOpen((current) => !current)}
                  ref={menuButtonRef}
                  type="button"
                >
                  {invites.length ? (
                    <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--torq-teal)] px-1 text-[0.68rem] font-semibold text-white">
                      {invites.length}
                    </span>
                  ) : null}

                  <div
                    className={`flex items-center justify-center rounded-[0.95rem] bg-[var(--torq-teal-soft)] font-semibold text-[var(--torq-teal)] ${
                      compact ? 'h-8 w-8 text-[0.7rem]' : 'h-9 w-9 text-xs'
                    }`}
                  >
                    {getInitials(user)}
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="max-w-32 truncate text-sm font-semibold leading-5 text-[var(--torq-ink)]">
                      {getUserDisplayName(user)}
                    </p>
                    {!compact ? (
                      <p className="text-xs text-[var(--torq-ink-soft)]">
                        {invites.length
                          ? `${invites.length} pending invite${invites.length === 1 ? '' : 's'}`
                          : 'Signed in'}
                      </p>
                    ) : null}
                  </div>
                </button>
              </div>
            </div>

            {actions ? (
              <div className="mt-3 border-t border-[var(--torq-line)] pt-3 md:hidden">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {menuContent}
    </>
  )
}

export default Header
