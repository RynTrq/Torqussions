import React, {
  useCallback,
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import axios from '../config/axios'
import ProjectCard from './ProjectCard'
import { isPreviewableFile } from '../utils/workspace'

const PROJECTS_PER_PAGE = 6

const ProjectList = () => {
  const [projects, setProjects] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const deferredSearch = useDeferredValue(search)

  const loadProjects = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const { data } = await axios.get('/projects')

      startTransition(() => {
        setProjects(data.projects || [])
        setStatus('ready')
      })
    } catch (requestError) {
      setStatus('error')
      setError(
        requestError.response?.data?.error ||
          'Unable to load your projects right now.',
      )
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const filteredProjects = projects.filter((project) => {
    const query = deferredSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return (
      project.name?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE))
  const currentSafePage = Math.min(currentPage, totalPages)
  const startIndex = (currentSafePage - 1) * PROJECTS_PER_PAGE
  const visibleProjects = filteredProjects.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE,
  )

  const totalCollaborators = projects.reduce(
    (total, project) => total + (project.users?.length || 0),
    0,
  )
  const previewReadyProjects = projects.filter((project) =>
    Object.keys(project.fileTree || {}).some((fileName) => isPreviewableFile(fileName)),
  ).length

  const createProject = async (event) => {
    event.preventDefault()
    setCreateError('')
    setIsCreating(true)

    try {
      const { data } = await axios.post('/projects', {
        name: projectName,
        description: projectDesc,
      })

      startTransition(() => {
        setProjects((currentProjects) => [data.project, ...currentProjects])
        setCurrentPage(1)
      })

      setProjectName('')
      setProjectDesc('')
      setIsModalOpen(false)
    } catch (requestError) {
      setCreateError(
        requestError.response?.data?.error ||
          'Project creation failed. Try a different name or description.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="pb-8 pt-8">
      <div className="torq-shell rounded-[2rem] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <div>
            <p className="torq-eyebrow">Workspace index</p>
            <h3 className="torq-heading mt-3 text-3xl">Pick up where the team left off.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--torq-ink-soft)]">
              Search across projects, jump back into any room, or spin up a new
              workspace with chat, files, preview, execution, and AI help ready to go.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto] md:items-end">
            <div>
              <label className="torq-eyebrow" htmlFor="project-search">
                Search projects
              </label>
              <input
                className="torq-input mt-3 px-4 py-3 text-sm"
                id="project-search"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search by project name or description"
                type="text"
                value={search}
              />
            </div>

            <button
              className="torq-primary-button h-[3.25rem] px-5 text-sm font-semibold"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              Create project
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="torq-shell-soft torq-highlight-card rounded-[1.5rem] p-5">
            <p className="torq-eyebrow">Projects</p>
            <p className="mt-3 text-4xl font-semibold text-[var(--torq-ink)]">
              {projects.length}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Total spaces currently available in your dashboard.
            </p>
          </div>

          <div className="torq-shell-soft torq-highlight-card rounded-[1.5rem] p-5">
            <p className="torq-eyebrow">Collaborators</p>
            <p className="mt-3 text-4xl font-semibold text-[var(--torq-ink)]">
              {totalCollaborators}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
              People actively distributed across your project rooms.
            </p>
          </div>

          <div className="torq-shell-soft torq-highlight-card rounded-[1.5rem] p-5">
            <p className="torq-eyebrow">Preview ready</p>
            <p className="mt-3 text-4xl font-semibold text-[var(--torq-ink)]">
              {previewReadyProjects}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Projects that already contain previewable files.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="torq-eyebrow">Your projects</p>
            <h4 className="torq-heading mt-3 text-2xl">Active project rooms</h4>
          </div>

          <div className="torq-shell-soft rounded-[1rem] px-4 py-3 text-sm text-[var(--torq-ink-soft)]">
            {filteredProjects.length} visible project
            {filteredProjects.length === 1 ? '' : 's'}
          </div>
        </div>

        {status === 'loading' ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="min-h-[18rem] animate-pulse rounded-[1.8rem] border border-[var(--torq-line)] bg-[rgba(255,255,255,0.42)]"
                key={index}
              />
            ))}
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="torq-danger-panel mt-8 rounded-[1.5rem] p-5">
            <p className="text-lg font-semibold">Couldn&apos;t load projects</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              className="torq-secondary-button mt-4 px-4 py-2 text-sm"
              onClick={() => void loadProjects()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}

        {status === 'ready' && !filteredProjects.length ? (
          <div className="torq-shell mt-8 rounded-[1.8rem] p-10 text-center">
            <p className="torq-eyebrow">Nothing here yet</p>
            <h4 className="torq-heading mt-4 text-3xl">
              {projects.length ? 'No project matches your search.' : 'Create your first project.'}
            </h4>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--torq-ink-soft)]">
              Start with a simple brief and your new room will be ready with
              collaboration, files, previews, execution, and AI assistance.
            </p>
            <button
              className="torq-primary-button mt-6 px-5 py-3 text-sm font-semibold"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              Create project
            </button>
          </div>
        ) : null}

        {status === 'ready' && visibleProjects.length ? (
          <>
            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        page === currentSafePage
                          ? 'bg-[var(--torq-teal)] text-white shadow-[0_14px_26px_rgba(8,116,101,0.24)]'
                          : 'border border-[var(--torq-line)] bg-[var(--torq-card-solid)] text-[var(--torq-ink-soft)]'
                      }`}
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition ${
          isModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className="absolute inset-0 bg-[var(--torq-overlay)] backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        />

        <div className="torq-shell relative z-10 w-full max-w-xl rounded-[2rem] p-6 sm:p-7">
          <p className="torq-eyebrow">New project</p>
          <h3 className="torq-heading mt-3 text-3xl">Start a new room</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            Give it a clear name and a focused description so the team has context
            from the first message onward.
          </p>

          <form className="mt-7 space-y-4" onSubmit={createProject}>
            <div>
              <label className="text-sm font-medium text-[var(--torq-ink)]" htmlFor="project-name">
                Project name
              </label>
              <input
                className="torq-input mt-2 px-4 py-3 text-sm"
                id="project-name"
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Trial project"
                required
                type="text"
                value={projectName}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--torq-ink)]"
                htmlFor="project-description"
              >
                Project description
              </label>
              <textarea
                className="torq-textarea mt-2 min-h-32 px-4 py-3 text-sm"
                id="project-description"
                onChange={(event) => setProjectDesc(event.target.value)}
                placeholder="What is this project for?"
                required
                value={projectDesc}
              />
            </div>

            {createError ? (
              <div className="torq-danger-panel rounded-[1rem] px-4 py-3 text-sm">
                {createError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                className="torq-secondary-button px-4 py-3 text-sm font-medium"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="torq-primary-button px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? 'Creating project...' : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default ProjectList
