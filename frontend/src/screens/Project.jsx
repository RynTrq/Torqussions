import React, {
  useCallback,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Chats from '../components/Chats.jsx'
import WorkspaceFilesPanel from '../components/WorkspaceFilesPanel'
import CollaboratorsPanel from '../components/CollaboratorsPanel'
import WorkspacePreviewPanel from '../components/WorkspacePreviewPanel'
import CodeExecutionPanel from '../components/CodeExecutionPanel'
import TorqScene from '../components/TorqScene'
import axios from '../config/axios'
import {
  disconnectSocket,
  emitWithAck,
  getSocket,
  initializeSocket,
  subscribeToEvent,
} from '../config/socket'
import { UserContext } from '../context/user-context'
import {
  createFileEntry,
  extractAiPrompt,
  getFirstFileName,
  getMessageWorkspaceUpdate,
  getNewFileStarterContents,
  isAiMessage,
  isAiTriggeredDraft,
  isPreviewableFile,
  normalizeFileName,
  normalizeFileTree,
} from '../utils/workspace'

const defaultAssistantInfo = {
  configured: false,
  provider: 'Gemini',
  model: 'gemini-2.5-flash',
  trigger: '@ai',
  label: 'Torq AI',
  capabilities: {
    chat: true,
    workspaceUpdates: true,
    preview: true,
  },
}

const getSuggestedFileFromWorkspaceUpdate = (workspaceUpdate) =>
  workspaceUpdate?.preview?.entry || workspaceUpdate?.files?.[0]?.path || ''

const workspacePanels = [
  { id: 'files', label: 'Files' },
  { id: 'preview', label: 'Preview' },
  { id: 'run', label: 'Run' },
  { id: 'team', label: 'Team' },
]

const Project = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { projectId } = useParams()
  const seedProject = location.state?.project || location.state?.projectProp || null
  const initialFileTree = normalizeFileTree(seedProject?.fileTree)
  const { user } = useContext(UserContext)

  const [project, setProject] = useState(seedProject)
  const [messages, setMessages] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [projectInvitations, setProjectInvitations] = useState([])
  const [workspaceStatus, setWorkspaceStatus] = useState('loading')
  const [workspaceError, setWorkspaceError] = useState('')
  const [notice, setNotice] = useState('')
  const [assistantInfo, setAssistantInfo] = useState(defaultAssistantInfo)
  const [assistantStatus, setAssistantStatus] = useState('idle')

  const [draftMessage, setDraftMessage] = useState('')
  const [messageStatus, setMessageStatus] = useState('idle')
  const [sendError, setSendError] = useState('')

  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [inviteStatus, setInviteStatus] = useState('idle')
  const [inviteError, setInviteError] = useState('')
  const [teamActionStatus, setTeamActionStatus] = useState('idle')

  const [fileTree, setFileTree] = useState(initialFileTree)
  const [activeFile, setActiveFile] = useState(getFirstFileName(initialFileTree))
  const [preferredPreviewEntry, setPreferredPreviewEntry] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [socketConnected, setSocketConnected] = useState(false)
  const [activeWorkspacePanel, setActiveWorkspacePanel] = useState('files')

  const pendingSuggestedFileRef = useRef('')

  const queueSuggestedFile = useCallback((filePath) => {
    if (!filePath) {
      return
    }

    pendingSuggestedFileRef.current = filePath

    if (isPreviewableFile(filePath)) {
      setPreferredPreviewEntry(filePath)
    }
  }, [])

  const applyIncomingFileTree = useCallback((nextFileTree, updatedAt) => {
    const safeFileTree = normalizeFileTree(nextFileTree)
    const suggestedFile =
      pendingSuggestedFileRef.current && safeFileTree[pendingSuggestedFileRef.current]
        ? pendingSuggestedFileRef.current
        : ''

    pendingSuggestedFileRef.current = ''

    startTransition(() => {
      setFileTree(safeFileTree)
      setActiveFile((currentFile) =>
        suggestedFile
          ? suggestedFile
          : currentFile && safeFileTree[currentFile]
            ? currentFile
            : getFirstFileName(safeFileTree),
      )
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              fileTree: safeFileTree,
              updatedAt: updatedAt || currentProject.updatedAt,
            }
          : currentProject,
      )
      setSaveState('saved')
    })
  }, [])

  const loadWorkspace = useCallback(async () => {
    setWorkspaceStatus('loading')
    setWorkspaceError('')

    try {
      const [workspaceResponse, usersResponse] = await Promise.all([
        axios.get(`/projects/${projectId}/workspace`),
        axios.get('/users/all'),
      ])

      const safeFileTree = normalizeFileTree(workspaceResponse.data.project.fileTree)
      const nextAssistantInfo = workspaceResponse.data.assistant || defaultAssistantInfo

      startTransition(() => {
        setProject(workspaceResponse.data.project)
        setProjectInvitations(workspaceResponse.data.invitations || [])
        setMessages(workspaceResponse.data.messages || [])
        setAllUsers(usersResponse.data.users || [])
        setFileTree(safeFileTree)
        setAssistantInfo(nextAssistantInfo)
        setAssistantStatus('idle')
        setPreferredPreviewEntry('')
        setActiveFile((currentFile) =>
          currentFile && safeFileTree[currentFile]
            ? currentFile
            : getFirstFileName(safeFileTree),
        )
        setSaveState('saved')
        setWorkspaceStatus('ready')
      })
    } catch (requestError) {
      setWorkspaceStatus('error')
      setWorkspaceError(
        requestError.response?.data?.error ||
          'Unable to load this project right now.',
      )
    }
  }, [projectId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const handleIncomingMessage = useEffectEvent((incomingMessage) => {
    if (isAiMessage(incomingMessage)) {
      setAssistantStatus('idle')
    }

    const workspaceUpdate = getMessageWorkspaceUpdate(incomingMessage)

    if (workspaceUpdate?.files?.length) {
      const suggestedFile = getSuggestedFileFromWorkspaceUpdate(workspaceUpdate)
      queueSuggestedFile(suggestedFile)
      setActiveWorkspacePanel(
        suggestedFile && isPreviewableFile(suggestedFile) ? 'preview' : 'files',
      )
      setNotice(
        `${incomingMessage?.senderLabel || incomingMessage?.sender?.name || 'Torq AI'} added ${
          workspaceUpdate.files.length
        } file${workspaceUpdate.files.length === 1 ? '' : 's'} to the project.`,
      )
    }

    startTransition(() => {
      setMessages((currentMessages) => [...currentMessages, incomingMessage])
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              lastActivityAt: incomingMessage.createdAt || new Date().toISOString(),
            }
          : currentProject,
      )
    })
  })

  const handleIncomingFileTree = useEffectEvent((payload) => {
    if (!payload?.fileTree) {
      return
    }

    applyIncomingFileTree(payload.fileTree, payload.updatedAt)
  })

  const handleProjectSocketError = useEffectEvent((payload) => {
    if (payload?.source === 'ai') {
      setAssistantStatus('idle')
    }

    setNotice(payload?.error || 'Realtime sync is temporarily unavailable.')
  })

  useEffect(() => {
    const socket = initializeSocket(projectId)

    const handleConnect = () => {
      setSocketConnected(true)
      setNotice('')
    }

    const handleDisconnect = () => {
      setSocketConnected(false)
    }

    const handleConnectError = (error) => {
      setSocketConnected(false)
      setNotice(error.message || 'Realtime sync is unavailable right now.')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    const unsubscribeFromMessages = subscribeToEvent(
      'project-message',
      handleIncomingMessage,
    )
    const unsubscribeFromFiles = subscribeToEvent(
      'project:file-tree:update',
      handleIncomingFileTree,
    )
    const unsubscribeFromErrors = subscribeToEvent(
      'project:error',
      handleProjectSocketError,
    )

    return () => {
      unsubscribeFromMessages()
      unsubscribeFromFiles()
      unsubscribeFromErrors()
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      disconnectSocket()
    }
  }, [projectId])

  const persistFileTree = useCallback(async (nextFileTree) => {
    setSaveState('saving')

    try {
      if (socketConnected && getSocket()?.connected) {
        await emitWithAck('project:file-tree:update', { fileTree: nextFileTree })
      } else {
        await axios.put(`/projects/${projectId}/file-tree`, {
          fileTree: nextFileTree,
        })
      }

      setSaveState('saved')
      setNotice('Project files saved.')
    } catch (requestError) {
      setSaveState('error')
      setNotice(
        requestError.response?.data?.error ||
          requestError.message ||
          'Unable to save project files.',
      )
    }
  }, [projectId, socketConnected])

  const handleSaveFiles = async () => {
    if (workspaceStatus !== 'ready' || !['dirty', 'error'].includes(saveState)) {
      return
    }

    if (!window.confirm('Save the current file changes to this project?')) {
      return
    }

    await persistFileTree(fileTree)
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    const content = draftMessage.trim()
    const wantsAiReply = isAiTriggeredDraft(content)
    const aiTrigger = assistantInfo?.trigger || '@ai'

    if (!content) {
      return
    }

    if (wantsAiReply && !extractAiPrompt(content)) {
      setSendError(`Add a request after ${aiTrigger} before sending.`)
      return
    }

    setMessageStatus('loading')
    setSendError('')

    try {
      if (socketConnected && getSocket()?.connected) {
        await emitWithAck('project-message', { content })

        if (wantsAiReply) {
          setAssistantStatus('thinking')
        }
      } else {
        const { data } = await axios.post(`/projects/${projectId}/messages`, {
          content,
        })

        const returnedMessages = Array.isArray(data.messages)
          ? data.messages.filter(Boolean)
          : [data.message].filter(Boolean)

        const lastReturnedMessage =
          returnedMessages[returnedMessages.length - 1] || data.aiMessage || data.message
        const aiWorkspaceUpdate = getMessageWorkspaceUpdate(data.aiMessage)
        const suggestedFile = getSuggestedFileFromWorkspaceUpdate(aiWorkspaceUpdate)

        if (suggestedFile) {
          queueSuggestedFile(suggestedFile)
          setActiveWorkspacePanel(
            isPreviewableFile(suggestedFile) ? 'preview' : 'files',
          )
        }

        startTransition(() => {
          setMessages((currentMessages) => [...currentMessages, ...returnedMessages])
          setProject((currentProject) =>
            currentProject
              ? {
                  ...currentProject,
                  lastActivityAt:
                    lastReturnedMessage?.createdAt || new Date().toISOString(),
                }
              : currentProject,
          )
        })

        if (data.fileTreeUpdate?.fileTree) {
          applyIncomingFileTree(data.fileTreeUpdate.fileTree, data.fileTreeUpdate.updatedAt)
        }

        if (aiWorkspaceUpdate?.files?.length) {
          setNotice(
            `${assistantInfo?.label || 'Torq AI'} added ${aiWorkspaceUpdate.files.length} file${
              aiWorkspaceUpdate.files.length === 1 ? '' : 's'
            } to the project.`,
          )
        } else if (data.aiError) {
          setNotice(data.aiError)
          setAssistantStatus('idle')
        } else if (wantsAiReply) {
          setNotice('')
          setAssistantStatus(data.aiMessage ? 'idle' : 'thinking')
        }
      }

      setDraftMessage('')
      if (!wantsAiReply) {
        setNotice('')
      }
    } catch (requestError) {
      setAssistantStatus('idle')
      setSendError(
        requestError.response?.data?.error ||
          requestError.message ||
          'Unable to send your message.',
      )
    } finally {
      setMessageStatus('idle')
    }
  }

  const handlePromptExampleInsert = (value) => {
    setDraftMessage(value)
    setSendError('')
  }

  const handleDraftMessageChange = (value) => {
    setDraftMessage(value)
    setSendError('')
  }

  const handleToggleUser = (userId) => {
    setInviteError('')
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((candidateId) => candidateId !== userId)
        : [...current, userId],
    )
  }

  const handleInviteSearchChange = (value) => {
    setInviteError('')
    setInviteSearch(value)
  }

  const handleInviteSubmit = async () => {
    if (!selectedUsers.length || !project?.permissions?.canInvite) {
      return
    }

    if (
      !window.confirm(
        `Send ${selectedUsers.length} project invitation${
          selectedUsers.length === 1 ? '' : 's'
        }? People will join only after they accept.`,
      )
    ) {
      return
    }

    setInviteStatus('loading')
    setInviteError('')

    try {
      const { data } = await axios.put(`/projects/${projectId}/collaborators`, {
        users: selectedUsers,
      })

      startTransition(() => {
        setProjectInvitations((currentInvitations) => {
          const seenInviteIds = new Set(currentInvitations.map((invite) => invite._id))
          const nextInvites = [...currentInvitations]

          for (const invite of data.invitations || []) {
            if (!seenInviteIds.has(invite._id)) {
              nextInvites.push(invite)
            }
          }

          return nextInvites
        })
        setSelectedUsers([])
        setInviteSearch('')
      })
      setNotice(
        data.invitations?.length
          ? 'Invitation sent. Teammates will join once they accept.'
          : 'No new invitations were created.',
      )
      setActiveWorkspacePanel('team')
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to send invitations right now.',
      )
    } finally {
      setInviteStatus('idle')
    }
  }

  const handleCreateFile = () => {
    const safeFileName = normalizeFileName(newFileName)

    if (!safeFileName) {
      setNotice('Choose a valid file name before adding a file.')
      return
    }

    if (fileTree[safeFileName]) {
      setNotice('That file already exists in this project.')
      return
    }

    const nextFileTree = {
      ...fileTree,
      ...createFileEntry(
        safeFileName,
        getNewFileStarterContents(safeFileName),
      ),
    }

    setNotice('')
    setNewFileName('')
    setSaveState('dirty')

    if (isPreviewableFile(safeFileName)) {
      setPreferredPreviewEntry(safeFileName)
    }

    startTransition(() => {
      setFileTree(nextFileTree)
      setActiveFile(safeFileName)
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              fileTree: nextFileTree,
            }
          : currentProject,
      )
    })
    setActiveWorkspacePanel('files')
  }

  const handleDeleteFile = (fileName) => {
    if (!fileName || !fileTree[fileName]) {
      return
    }

    if (!window.confirm(`Delete ${fileName}?`)) {
      return
    }

    const nextFileTree = { ...fileTree }
    delete nextFileTree[fileName]

    const normalizedTree = normalizeFileTree(nextFileTree)
    setSaveState('dirty')

    if (preferredPreviewEntry === fileName) {
      setPreferredPreviewEntry('')
    }

    startTransition(() => {
      setFileTree(normalizedTree)
      setActiveFile((currentFile) =>
        currentFile && normalizedTree[currentFile]
          ? currentFile
          : getFirstFileName(normalizedTree),
      )
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              fileTree: normalizedTree,
            }
          : currentProject,
      )
    })
  }

  const handleFileUpdate = (contents) => {
    if (!activeFile) {
      return
    }

    setSaveState('dirty')
    setNotice('')

    setFileTree((currentTree) => ({
      ...currentTree,
      [activeFile]: {
        file: {
          ...currentTree[activeFile]?.file,
          contents,
        },
      },
    }))
  }

  const handleOpenFile = (fileName) => {
    if (!fileName || !fileTree[fileName]) {
      return
    }

    setActiveFile(fileName)
    setActiveWorkspacePanel('files')

    if (isPreviewableFile(fileName)) {
      setPreferredPreviewEntry(fileName)
    }
  }

  const handleRunFileSelect = (fileName) => {
    if (!fileName || !fileTree[fileName]) {
      return
    }

    setActiveFile(fileName)

    if (isPreviewableFile(fileName)) {
      setPreferredPreviewEntry(fileName)
    }
  }

  const handleCancelInvite = async (invite) => {
    if (!invite?._id) {
      return
    }

    if (
      !window.confirm(
        `Cancel the pending invitation for ${
          invite.invitedUser?.email || invite.invitedUser?.name || 'this user'
        }?`,
      )
    ) {
      return
    }

    setTeamActionStatus('loading')
    setInviteError('')

    try {
      await axios.delete(`/projects/${projectId}/invitations/${invite._id}`)
      setProjectInvitations((currentInvitations) =>
        currentInvitations.filter((currentInvite) => currentInvite._id !== invite._id),
      )
      setNotice('Invitation cancelled.')
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to cancel that invitation right now.',
      )
    } finally {
      setTeamActionStatus('idle')
    }
  }

  const handlePromoteAdmin = async (member) => {
    if (!member?._id) {
      return
    }

    if (
      !window.confirm(
        `Make ${member.name || member.email || 'this collaborator'} an admin for this project?`,
      )
    ) {
      return
    }

    setTeamActionStatus('loading')
    setInviteError('')

    try {
      const { data } = await axios.put(`/projects/${projectId}/admins/${member._id}`)
      setProject(data.project)
      setNotice(`${member.name || member.email || 'Collaborator'} is now an admin.`)
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to update admin access right now.',
      )
    } finally {
      setTeamActionStatus('idle')
    }
  }

  const handleRemoveMember = async (member) => {
    if (!member?._id) {
      return
    }

    if (
      !window.confirm(
        `Remove ${member.name || member.email || 'this collaborator'} from the project?`,
      )
    ) {
      return
    }

    setTeamActionStatus('loading')
    setInviteError('')

    try {
      const { data } = await axios.delete(`/projects/${projectId}/members/${member._id}`)
      setProject(data.project)
      setNotice(`${member.name || member.email || 'Collaborator'} was removed.`)
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to remove that collaborator right now.',
      )
    } finally {
      setTeamActionStatus('idle')
    }
  }

  const handleLeaveProject = async () => {
    if (!project?.permissions?.canLeave) {
      return
    }

    const isLastMember = (project?.users?.length || 0) === 1
    const confirmationMessage = isLastMember
      ? 'You are the last person in this project. Leaving will permanently delete the project. Continue?'
      : 'Leave this project? You will lose access right away.'

    if (!window.confirm(confirmationMessage)) {
      return
    }

    setTeamActionStatus('loading')
    setInviteError('')

    try {
      await axios.post(`/projects/${projectId}/leave`)
      navigate('/')
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to leave this project right now.',
      )
    } finally {
      setTeamActionStatus('idle')
    }
  }

  const handleDeleteProject = async () => {
    if (!project?.permissions?.canDeleteProject) {
      return
    }

    if (
      !window.confirm(
        'Delete this project for everyone? This removes the project, its messages, invites, and files permanently.',
      )
    ) {
      return
    }

    setTeamActionStatus('loading')
    setInviteError('')

    try {
      await axios.delete(`/projects/${projectId}`)
      navigate('/')
    } catch (requestError) {
      setInviteError(
        requestError.response?.data?.error ||
          'Unable to delete this project right now.',
      )
    } finally {
      setTeamActionStatus('idle')
    }
  }

  const pendingInviteUserIds = new Set(
    projectInvitations.map((invite) => invite.invitedUser?._id).filter(Boolean),
  )
  const usersToInvite = allUsers.filter((candidate) => {
    const query = inviteSearch.trim().toLowerCase()
    const alreadyInProject = project?.users?.some(
      (projectUser) => projectUser._id === candidate._id,
    )

    if (alreadyInProject) {
      return false
    }

    if (pendingInviteUserIds.has(candidate._id)) {
      return false
    }

    if (!query) {
      return true
    }

    return `${candidate.name || ''} ${candidate.email || ''}`
      .toLowerCase()
      .includes(query)
  })

  const collaboratorCount = project?.users?.length || 0
  const fileCount = Object.keys(fileTree || {}).length
  const messageCount = messages.length
  const pendingInvitationCount = projectInvitations.length
  const previewableFileCount = Object.keys(fileTree || {}).filter((fileName) =>
    isPreviewableFile(fileName),
  ).length

  if (workspaceStatus === 'loading') {
    return (
      <div className="torq-page">
        <div className="relative">
          <Header
            backLabel="Dashboard"
            backLink="/"
            compact
            subtitle="Loading the project, collaborators, and shared files."
            title="Project"
          />
          <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 lg:px-8">
            <div className="torq-shell w-full max-w-xl rounded-[2rem] p-10 text-center">
              <p className="torq-eyebrow">Loading</p>
              <h2 className="torq-heading mt-4 text-3xl">Opening your project</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
                Pulling messages, collaborators, and shared files so everything
                opens in a ready state.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (workspaceStatus === 'error') {
    return (
      <div className="torq-page">
        <div className="relative">
          <Header
            backLabel="Dashboard"
            backLink="/"
            compact
            subtitle="This project could not be opened with your current session."
            title="Project unavailable"
          />
          <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 lg:px-8">
            <div className="torq-shell torq-danger-panel w-full max-w-xl rounded-[2rem] p-10 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-[#a5352d]">
                Couldn&apos;t open project
              </p>
              <h2 className="torq-heading mt-4 text-3xl">Project access failed</h2>
              <p className="mt-3 text-sm leading-7 text-[#a5352d]">
                {workspaceError}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  className="torq-primary-button px-5 py-3 text-sm font-semibold"
                  onClick={() => void loadWorkspace()}
                  type="button"
                >
                  Retry
                </button>
                <button
                  className="torq-secondary-button px-5 py-3 text-sm font-semibold"
                  onClick={() => navigate('/')}
                  type="button"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="torq-page pb-10">
      <div className="pointer-events-none fixed left-[-3rem] top-10 h-72 w-72 rounded-full bg-[rgba(13,156,138,0.12)] blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-2rem] right-[-1rem] h-80 w-80 rounded-full bg-[rgba(216,140,52,0.12)] blur-3xl" />

      <div className="relative">
        <Header
          backLabel="Dashboard"
          backLink="/"
          compact
          sticky={false}
          subtitle={project?.description}
          title={project?.name || 'Project'}
        />

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 lg:px-8">
          {notice ? (
            <div className="mb-6 rounded-[1.2rem] border border-[rgba(216,140,52,0.16)] bg-[var(--torq-amber-soft)] px-5 py-4 text-sm text-[var(--torq-amber)]">
              {notice}
            </div>
          ) : null}

          <section className="mb-6 grid gap-6 2xl:grid-cols-[1.08fr,0.92fr]">
            <div className="torq-shell-strong rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <div
                  className={`torq-badge ${
                    socketConnected ? 'torq-badge-live' : 'torq-badge-warn'
                  }`}
                >
                  {socketConnected ? 'Realtime on' : 'Offline fallback'}
                </div>
                <div
                  className={`torq-badge ${
                    assistantInfo?.configured ? 'torq-badge-live' : 'torq-badge-warn'
                  }`}
                >
                  {assistantInfo?.configured ? 'AI available' : 'AI unavailable'}
                </div>
                <div className="torq-badge border border-white/12 bg-white/10 text-white">
                  {project?.permissions?.isAdmin ? 'Admin' : 'Member'}
                </div>
              </div>

              <p className="torq-eyebrow mt-6">Project overview</p>
              <h2 className="torq-heading mt-4 text-3xl text-white sm:text-4xl">
                {project?.name || 'Project'}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/76">
                {project?.description ||
                  'Discuss ideas, manage project files, and use AI when you want help generating something.'}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
                  <p className="torq-eyebrow text-white/70">Collaborators</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {collaboratorCount}
                  </p>
                </div>
                <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
                  <p className="torq-eyebrow text-white/70">Files</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{fileCount}</p>
                </div>
                <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
                  <p className="torq-eyebrow text-white/70">Previewable</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {previewableFileCount}
                  </p>
                </div>
                <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
                  <p className="torq-eyebrow text-white/70">Messages</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{messageCount}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-white/10 px-4 py-4 text-sm text-white/84">
                Use <span className="font-semibold">{assistantInfo?.trigger || '@ai'}</span>{' '}
                at the start of a message when you want Torq AI to reply or add project files.
                {project?.permissions?.canInvite ? (
                  <span className="mt-1 block text-white/64">
                    {pendingInvitationCount} invitation
                    {pendingInvitationCount === 1 ? '' : 's'} currently pending.
                  </span>
                ) : null}
              </div>
            </div>

            <TorqScene
              badge="Project surface"
              compact
              description="Messages, files, previews, execution, and teammates stay on one responsive control surface."
              heading="A workspace that keeps the whole project in view."
              stats={[
                { label: 'People', value: String(collaboratorCount) },
                { label: 'Pending invites', value: String(pendingInvitationCount) },
                { label: 'AI trigger', value: assistantInfo?.trigger || '@ai' },
              ]}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr),minmax(21rem,0.82fr)]">
            <div className="space-y-6">
              <Chats
                assistantInfo={assistantInfo}
                assistantStatus={assistantStatus}
                draftMessage={draftMessage}
                isSending={messageStatus === 'loading'}
                messages={messages}
                onDraftMessageChange={handleDraftMessageChange}
                onInsertPromptExample={handlePromptExampleInsert}
                onOpenFile={handleOpenFile}
                onSendMessage={handleSendMessage}
                projectName={project?.name || 'Project chat'}
                sendError={sendError}
                socketConnected={socketConnected}
                userId={user?._id}
              />
            </div>

            <div className="space-y-6">
              <section className="torq-shell rounded-[1.6rem] p-4">
                <div className="mb-4">
                  <p className="torq-eyebrow">Workspace tools</p>
                  <h3 className="torq-heading mt-3 text-2xl">Files, preview, execution, and team</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspacePanels.map((panel) => (
                    <button
                      className="torq-tab-button"
                      data-active={String(activeWorkspacePanel === panel.id)}
                      key={panel.id}
                      onClick={() => setActiveWorkspacePanel(panel.id)}
                      type="button"
                    >
                      {panel.label}
                    </button>
                  ))}
                </div>
              </section>

              {activeWorkspacePanel === 'files' ? (
                <WorkspaceFilesPanel
                  activeFile={activeFile}
                  fileTree={fileTree}
                  newFileName={newFileName}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                  onFileNameChange={setNewFileName}
                  onFileSelect={handleOpenFile}
                  onSaveFiles={handleSaveFiles}
                  onFileUpdate={handleFileUpdate}
                  saveState={saveState}
                />
              ) : null}

              {activeWorkspacePanel === 'preview' ? (
                <WorkspacePreviewPanel
                  activeFile={activeFile}
                  fileTree={fileTree}
                  onFileSelect={handleOpenFile}
                  preferredEntry={preferredPreviewEntry}
                  key={preferredPreviewEntry || activeFile || 'workspace-preview'}
                />
              ) : null}

              {activeWorkspacePanel === 'run' ? (
                <CodeExecutionPanel
                  activeFile={activeFile}
                  fileTree={fileTree}
                  onFileSelect={handleRunFileSelect}
                  projectId={projectId}
                />
              ) : null}

              {activeWorkspacePanel === 'team' ? (
                <CollaboratorsPanel
                  actionStatus={teamActionStatus}
                  currentUserId={user?._id}
                  inviteError={inviteError}
                  inviteSearch={inviteSearch}
                  inviteStatus={inviteStatus}
                  onCancelInvite={handleCancelInvite}
                  onDeleteProject={handleDeleteProject}
                  onInviteSearchChange={handleInviteSearchChange}
                  onLeaveProject={handleLeaveProject}
                  onPromoteAdmin={handlePromoteAdmin}
                  onRemoveMember={handleRemoveMember}
                  onSubmitInvites={handleInviteSubmit}
                  onToggleUser={handleToggleUser}
                  pendingInvitations={projectInvitations}
                  project={project}
                  selectedUsers={selectedUsers}
                  usersToInvite={usersToInvite}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Project
