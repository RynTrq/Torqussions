import * as projectService from '../services/project.service.js';
import * as codeExecutionService from '../services/code-execution.service.js';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/http-error.js';
import { getAiAssistantSettings, validateAiPromptContent } from '../services/ai.service.js';
import { serializeProject, serializeProjectInvite } from '../utils/serializers.js';


export const createProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, description } = req.body;
        const newProject = await projectService.createProject({
            name,
            description,
            userId: req.user._id
        });

        res.status(201).json({ project: serializeProject(newProject, req.user._id) });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const getAllProject = async (req, res) => {
    try {
        const allUserProjects = await projectService.getAllProjectByUserId({
            userId: req.user._id
        })

        return res.status(200).json({
            projects: allUserProjects.map((project) =>
                serializeProject(project, req.user._id),
            )
        })
    } catch (err) {
        console.log(err)
        return sendError(res, err);
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const projectId = req.body.projectId || req.params.projectId;
        const { users } = req.body

        const invitations = await projectService.createProjectInvitations({
            projectId,
            users,
            userId: req.user._id
        })

        return res.status(200).json({
            invitations: invitations.map((invite) =>
                serializeProjectInvite(invite, req.user._id),
            ),
        })
    } catch (err) {
        console.log(err)
        return sendError(res, err);
    }
}

export const getProjectById = async (req, res) => {
    const { projectId } = req.params;

    try{
        const project = await projectService.getProjectById({
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            project: serializeProject(project, req.user._id)
        })
    }catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const projectId = req.body.projectId || req.params.projectId;
        const { fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree,
            userId: req.user._id,
        });

        return res.status(200).json({
            project: serializeProject(project, req.user._id)
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const updateProjectAssistantSettings = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;

    try {
        const project = await projectService.updateProjectAssistantSettings({
            projectId,
            userId: req.user._id,
            provider: req.body.provider,
            model: req.body.model,
        });

        return res.status(200).json({
            assistant: getAiAssistantSettings(project),
            project: serializeProject(project, req.user._id),
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const getProjectWorkspace = async (req, res) => {
    const { projectId } = req.params;

    try {
        const workspace = await projectService.getProjectWorkspace({
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            assistant: workspace.assistant,
            invitations: (workspace.invitations || []).map((invite) =>
                serializeProjectInvite(invite, req.user._id),
            ),
            messages: workspace.messages,
            project: serializeProject(workspace.project, req.user._id),
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const createProjectMessage = async (req, res) => {
    const { projectId } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const content = req.body.content || req.body.message;

        validateAiPromptContent(content);

        const result = await projectService.buildProjectMessageResponse({
            projectId,
            userId: req.user._id,
            content,
        });

        return res.status(201).json(result);
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const executeProjectCode = async (req, res) => {
    const { projectId } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const execution = await codeExecutionService.executeProjectCode({
            entryFile: req.body.entryFile,
            fileTree: req.body.fileTree,
            projectId,
            runtime: req.body.runtime,
            stdin: req.body.stdin,
            userId: req.user._id,
        });

        return res.status(200).json(execution);
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const listProjectInvitations = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;

    try {
        const invitations = await projectService.listProjectInvitations({
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            invitations: invitations.map((invite) =>
                serializeProjectInvite(invite, req.user._id),
            ),
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const cancelProjectInvitation = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { inviteId, projectId } = req.params;

    try {
        const result = await projectService.cancelProjectInvitation({
            inviteId,
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const promoteProjectAdmin = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { memberId, projectId } = req.params;

    try {
        const project = await projectService.promoteProjectAdmin({
            memberId,
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            project: serializeProject(project, req.user._id),
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const removeProjectMember = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { memberId, projectId } = req.params;

    try {
        const project = await projectService.removeProjectMember({
            memberId,
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            project: serializeProject(project, req.user._id),
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const leaveProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;

    try {
        const result = await projectService.leaveProject({
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json({
            ...result,
            project: result.project
                ? serializeProject(result.project, req.user._id)
                : null,
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const deleteProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;

    try {
        const result = await projectService.deleteProject({
            projectId,
            userId: req.user._id,
        });

        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}
