import React from 'react'
import {
  formatAbsoluteDate,
  getInitials,
  getUserDisplayName,
} from '../utils/workspace'

const CollaboratorsPanel = ({
  actionStatus,
  currentUserId,
  inviteError,
  inviteSearch,
  inviteStatus,
  onCancelInvite,
  onDeleteProject,
  onInviteSearchChange,
  onLeaveProject,
  onPromoteAdmin,
  onRemoveMember,
  onSubmitInvites,
  onToggleUser,
  pendingInvitations,
  project,
  selectedUsers,
  usersToInvite,
}) => {
  const adminIds = project?.adminIds || []
  const canInvite = Boolean(project?.permissions?.canInvite)
  const canDeleteProject = Boolean(project?.permissions?.canDeleteProject)
  const mustAssignAdminBeforeLeaving = Boolean(
    project?.permissions?.mustAssignAdminBeforeLeaving,
  )
  const isBusy = inviteStatus === 'loading' || actionStatus === 'loading'

  return (
    <section className="torq-shell torq-panel-rise rounded-[1.8rem] p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--torq-line)] pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="torq-eyebrow">Team</p>
            <h3 className="torq-heading mt-3 text-3xl">People on this project</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Created by {getUserDisplayName(project?.createdBy)}. Last active{' '}
              {formatAbsoluteDate(project?.lastActivityAt || project?.updatedAt)}.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className="torq-badge torq-badge-neutral">
              {project?.users?.length || 0} people
            </span>
            {canInvite ? (
              <span className="torq-badge torq-badge-live">Admin controls</span>
            ) : (
              <span className="torq-badge torq-badge-neutral">Member view</span>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {project?.users?.map((member) => {
            const isAdmin = adminIds.includes(member._id)
            const isCurrentUser = member._id === currentUserId

            return (
              <div
                className="torq-shell-soft flex items-center gap-3 rounded-[1.2rem] px-4 py-3"
                key={member._id}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[var(--torq-teal-soft)] text-sm font-semibold text-[var(--torq-teal)]">
                  {getInitials(member)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--torq-ink)]">
                      {getUserDisplayName(member)}
                    </p>
                    {isAdmin ? (
                      <span className="torq-badge torq-badge-live">admin</span>
                    ) : null}
                    {isCurrentUser ? (
                      <span className="torq-badge torq-badge-neutral">you</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--torq-ink-soft)]">{member.email}</p>
                </div>

                {canInvite && !isCurrentUser ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {!isAdmin ? (
                      <button
                        className="torq-secondary-button px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isBusy}
                        onClick={() => onPromoteAdmin(member)}
                        type="button"
                      >
                        Make admin
                      </button>
                    ) : null}
                    <button
                      className="torq-danger-button px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                      onClick={() => onRemoveMember(member)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {canInvite ? (
        <div className="border-b border-[var(--torq-line)] py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="torq-eyebrow">Pending invites</p>
              <h4 className="torq-heading mt-3 text-2xl">Invitation queue</h4>
              <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
                People only join after they accept the invitation from their inbox.
              </p>
            </div>
            <span className="torq-badge torq-badge-neutral">
              {pendingInvitations.length} pending
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {pendingInvitations.length ? (
              pendingInvitations.map((invite) => (
                <div
                  className="torq-shell-soft flex items-center gap-3 rounded-[1.15rem] px-4 py-3"
                  key={invite._id}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[var(--torq-teal-soft)] text-sm font-semibold text-[var(--torq-teal)]">
                    {getInitials(invite.invitedUser)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--torq-ink)]">
                      {getUserDisplayName(invite.invitedUser)}
                    </p>
                    <p className="truncate text-xs text-[var(--torq-ink-soft)]">
                      {invite.invitedUser?.email} • invited by{' '}
                      {getUserDisplayName(invite.invitedBy)}
                    </p>
                  </div>

                  <button
                    className="torq-danger-button px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    onClick={() => onCancelInvite(invite)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-4 text-sm text-[var(--torq-ink-soft)]">
                No invitations are waiting right now.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {canInvite ? (
        <div className="border-b border-[var(--torq-line)] py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="torq-eyebrow">Invite</p>
              <h4 className="torq-heading mt-3 text-2xl">Add teammates</h4>
            </div>
            <span className="torq-badge torq-badge-warn">
              {selectedUsers.length} selected
            </span>
          </div>

          <input
            className="torq-input mt-4 px-4 py-3 text-sm"
            onChange={(event) => onInviteSearchChange(event.target.value)}
            placeholder="Search people by name or email"
            type="text"
            value={inviteSearch}
          />

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {usersToInvite.length ? (
              usersToInvite.map((candidate) => {
                const isSelected = selectedUsers.includes(candidate._id)

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-[1.15rem] border px-4 py-3 text-left ${
                      isSelected
                        ? 'border-[rgba(13,156,138,0.2)] bg-[var(--torq-teal-soft)]'
                        : 'border-[var(--torq-line)] bg-[var(--torq-card-solid)]'
                    }`}
                    key={candidate._id}
                    onClick={() => onToggleUser(candidate._id)}
                    type="button"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[var(--torq-teal-soft)] text-sm font-semibold text-[var(--torq-teal)]">
                      {getInitials(candidate)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--torq-ink)]">
                        {getUserDisplayName(candidate)}
                      </p>
                      <p className="truncate text-xs text-[var(--torq-ink-soft)]">
                        {candidate.email}
                      </p>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border ${
                        isSelected
                          ? 'border-[var(--torq-teal)] bg-[rgba(13,156,138,0.18)]'
                          : 'border-[var(--torq-line-strong)]'
                      }`}
                    />
                  </button>
                )
              })
            ) : (
              <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-4 text-sm text-[var(--torq-ink-soft)]">
                Everyone eligible is already in the project or already has a pending invite.
              </div>
            )}
          </div>

          {inviteError ? (
            <div className="torq-danger-panel mt-4 rounded-[1rem] px-4 py-3 text-sm">
              {inviteError}
            </div>
          ) : null}

          <button
            className="torq-primary-button mt-4 w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedUsers.length || inviteStatus === 'loading'}
            onClick={onSubmitInvites}
            type="button"
          >
            {inviteStatus === 'loading'
              ? 'Sending invites...'
              : `Invite ${selectedUsers.length || ''} teammate${
                  selectedUsers.length === 1 ? '' : 's'
                }`}
          </button>
        </div>
      ) : null}

      <div className="pt-5">
        <div className="torq-shell-soft flex flex-col gap-3 rounded-[1.2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--torq-ink)]">
              {mustAssignAdminBeforeLeaving
                ? 'Promote another admin before you leave this project.'
                : 'Manage your own access to this project.'}
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--torq-ink-soft)]">
              Members can leave. Only admins can delete the project for everyone.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="torq-secondary-button px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy || mustAssignAdminBeforeLeaving}
              onClick={onLeaveProject}
              type="button"
            >
              Leave project
            </button>
            {canDeleteProject ? (
              <button
                className="torq-danger-button px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={onDeleteProject}
                type="button"
              >
                Delete project
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CollaboratorsPanel
