import mongoose from 'mongoose';
import projectModel from '../models/project.model.js';
import projectInviteModel from '../models/project-invite.model.js';
import projectMessageModel from '../models/project-message.model.js';
import userModel from '../models/user.model.js';
import { HttpError } from '../utils/http-error.js';
import { serializeProjectMessage } from '../utils/serializers.js';
import {
    assertWorkspaceFileTreePayload,
    createWorkspaceFileEntry,
    mergeGeneratedFilesIntoTree,
    normalizeWorkspaceFileTree,
} from '../utils/workspace.js';
import {
    AI_SENDER_LABEL,
    extractAiPrompt,
    generateProjectAssistantReply,
    getAiAssistantSettings,
    isAiTriggeredContent,
    validateAssistantSettingsInput,
} from './ai.service.js';

const PROJECT_INVITE_LIMIT = 50;

const asStringId = (value) => {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value?._id?.toString === 'function') {
        return value._id.toString();
    }

    if (typeof value.toString === 'function') {
        return value.toString();
    }

    return String(value);
};

const validateObjectId = (value, fieldName) => {
    if (!value) {
        throw new HttpError(400, `${fieldName} is required`);
    }

    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new HttpError(400, `Invalid ${fieldName}`);
    }
};

const buildStarterFileTree = ({ name, description }) =>
    normalizeWorkspaceFileTree({
        'README.md': createWorkspaceFileEntry(
            'README.md',
            `# ${name}\n\n${description}\n`,
        ),
    });

const populateProject = (query) =>
    query
        .populate('users', 'name email createdAt')
        .populate('createdBy', 'name email');

const findAccessibleProjectQuery = ({ projectId, userId }) => ({
    _id: projectId,
    users: userId,
});

const touchProjectActivity = async (projectId) => {
    await projectModel.findByIdAndUpdate(projectId, {
        $set: {
            lastActivityAt: new Date(),
        },
    });
};

const getProjectAdminIds = (project) => {
    const rawAdmins =
        Array.isArray(project?.admins) && project.admins.length
            ? project.admins
            : [ project?.createdBy ];

    return Array.from(new Set(rawAdmins.map(asStringId).filter(Boolean)));
};

const getProjectUserIds = (project) =>
    Array.from(
        new Set(
            Array.isArray(project?.users)
                ? project.users.map(asStringId).filter(Boolean)
                : [],
        ),
    );

const isProjectAdmin = (project, userId) =>
    getProjectAdminIds(project).includes(asStringId(userId));

const normalizeProjectDocument = (project) => {
    if (!project) {
        return project;
    }

    project.fileTree = normalizeWorkspaceFileTree(project.fileTree);

    if (!Array.isArray(project.admins) || !project.admins.length) {
        project.admins = [ project.createdBy ].filter(Boolean);
    }

    if (!project.assistant || typeof project.assistant !== 'object') {
        project.assistant = {};
    }

    return project;
};

const ensureProjectExists = async (projectId) => {
    const project = normalizeProjectDocument(
        await populateProject(projectModel.findById(projectId)),
    );

    if (!project) {
        throw new HttpError(404, 'Project not found');
    }

    return project;
};

const assertProjectAdmin = (project, userId, actionLabel = 'manage this project') => {
    if (!isProjectAdmin(project, userId)) {
        throw new HttpError(403, `Only admins can ${actionLabel}.`);
    }
};

const deleteProjectResources = async (projectId) => {
    await Promise.all([
        projectMessageModel.deleteMany({ project: projectId }),
        projectInviteModel.deleteMany({ project: projectId }),
        projectModel.findByIdAndDelete(projectId),
    ]);
};

const ensureValidUsersExist = async (candidateIds) => {
    const existingUsers = await userModel.find({
        _id: { $in: candidateIds },
    }).select('_id');

    if (existingUsers.length !== candidateIds.length) {
        throw new HttpError(400, 'One or more users could not be found');
    }
};

const persistProjectFileTree = async ({ projectId, fileTree }) => {
    const project = normalizeProjectDocument(
        await populateProject(
            projectModel.findByIdAndUpdate(
                projectId,
                {
                    $set: {
                        fileTree: normalizeWorkspaceFileTree(fileTree),
                        lastActivityAt: new Date(),
                    },
                },
                {
                    new: true,
                },
            ),
        ),
    );

    if (!project) {
        throw new HttpError(404, 'Project not found');
    }

    return project;
};

export const createProject = async ({
    name,
    description,
    userId,
}) => {
    if (!name) {
        throw new HttpError(400, 'Name is required');
    }
    if (!userId) {
        throw new HttpError(400, 'UserId is required');
    }

    const safeName = name.trim();
    const safeDescription =
        description?.trim() ||
        'A collaborative workspace for ideas, notes, and execution.';
    const defaultAssistant = getAiAssistantSettings();

    let project;
    try {
        project = await projectModel.create({
            assistant: defaultAssistant.configured
                ? {
                    model: defaultAssistant.model,
                    provider: defaultAssistant.provider,
                }
                : undefined,
            admins: [ userId ],
            createdBy: userId,
            description: safeDescription,
            fileTree: buildStarterFileTree({
                name: safeName,
                description: safeDescription,
            }),
            lastActivityAt: new Date(),
            name: safeName,
            users: [ userId ],
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new HttpError(409, 'Project name already exists');
        }
        throw error;
    }

    return normalizeProjectDocument(
        await populateProject(projectModel.findById(project._id)),
    );
};

export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new HttpError(400, 'UserId is required');
    }

    const allUserProjects = await populateProject(
        projectModel
            .find({
                users: userId,
            })
            .sort({
                lastActivityAt: -1,
                updatedAt: -1,
            }),
    );

    return allUserProjects.map((project) => normalizeProjectDocument(project));
};

export const getProjectById = async ({ projectId, userId }) => {
    validateObjectId(projectId, 'projectId');
    validateObjectId(userId, 'userId');

    const project = normalizeProjectDocument(
        await populateProject(
            projectModel.findOne(findAccessibleProjectQuery({ projectId, userId })),
        ),
    );

    if (!project) {
        throw new HttpError(404, 'Project not found or access denied');
    }

    return project;
};

export const updateFileTree = async ({ projectId, fileTree, userId }) => {
    validateObjectId(projectId, 'projectId');
    validateObjectId(userId, 'userId');

    await getProjectById({ projectId, userId });
    const normalizedTree = assertWorkspaceFileTreePayload(fileTree);

    return persistProjectFileTree({
        projectId,
        fileTree: normalizedTree,
    });
};

export const listProjectMessages = async ({ projectId, userId, limit = 100 }) => {
    await getProjectById({ projectId, userId });

    const messages = await projectMessageModel
        .find({
            project: projectId,
        })
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 200))
        .populate('sender', 'name email');

    return messages.reverse().map(serializeProjectMessage);
};

export const createProjectMessage = async ({
    projectId,
    userId,
    content,
    type = 'text',
    senderLabel,
    metadata,
}) => {
    validateObjectId(projectId, 'projectId');

    const trimmedContent = content?.trim();

    if (!trimmedContent) {
        throw new HttpError(400, 'Message cannot be empty');
    }

    const hasHumanSender = type !== 'ai' && type !== 'system';

    if (hasHumanSender) {
        validateObjectId(userId, 'userId');
        await getProjectById({ projectId, userId });
    } else {
        await ensureProjectExists(projectId);
    }

    const message = await projectMessageModel.create({
        project: projectId,
        sender: hasHumanSender ? userId : null,
        senderLabel: senderLabel?.trim() || undefined,
        content: trimmedContent,
        type,
        metadata,
    });

    await touchProjectActivity(projectId);

    const populatedMessage = hasHumanSender
        ? await projectMessageModel.findById(message._id).populate('sender', 'name email')
        : message;

    return serializeProjectMessage(populatedMessage);
};

export const buildProjectMessageResponse = async ({
    projectId,
    userId,
    content,
}) => {
    const message = await createProjectMessage({
        projectId,
        userId,
        content,
    });

    let aiResult = null;
    let aiError = '';

    if (isAiTriggeredContent(content)) {
        try {
            aiResult = await createAiProjectReply({
                projectId,
                userId,
                content,
            });
        } catch (error) {
            aiError = error.message;
        }
    }

    return {
        message,
        aiMessage: aiResult?.message || null,
        aiError,
        messages: aiResult?.message ? [ message, aiResult.message ] : [ message ],
        fileTreeUpdate: aiResult?.fileTreeUpdate || null,
    };
};

export const createAiProjectReply = async ({
    projectId,
    userId,
    content,
}) => {
    validateObjectId(projectId, 'projectId');
    validateObjectId(userId, 'userId');

    const prompt = extractAiPrompt(content);

    if (!prompt) {
        throw new HttpError(400, 'Add a request after @ai to prompt Torq AI.');
    }

    const [ project, recentMessageDocs ] = await Promise.all([
        getProjectById({ projectId, userId }),
        projectMessageModel
            .find({
                project: projectId,
            })
            .sort({ createdAt: -1 })
            .limit(12)
            .populate('sender', 'name email'),
    ]);

    const recentMessages = recentMessageDocs.reverse().map(serializeProjectMessage);
    const aiReply = await generateProjectAssistantReply({
        project,
        prompt,
        recentMessages,
    });

    let fileTreeUpdate = null;
    let generatedFiles = [];

    if (aiReply.files.length) {
        const mergedWorkspace = mergeGeneratedFilesIntoTree(project.fileTree, aiReply.files);
        generatedFiles = mergedWorkspace.generatedFiles;

        const updatedProject = await persistProjectFileTree({
            projectId,
            fileTree: mergedWorkspace.fileTree,
        });

        fileTreeUpdate = {
            projectId,
            fileTree: updatedProject.fileTree,
            updatedAt: updatedProject.updatedAt,
        };
    }

    const message = await createProjectMessage({
        projectId,
        content: aiReply.content,
        type: 'ai',
        senderLabel: AI_SENDER_LABEL,
        metadata: {
            provider: aiReply.provider,
            model: aiReply.model,
            trigger: getAiAssistantSettings().trigger,
            workspaceUpdate: generatedFiles.length
                ? {
                    mode: aiReply.mode,
                    summary: aiReply.summary,
                    files: generatedFiles.map((file) => ({
                        path: file.path,
                        language: file.language,
                        description: file.description,
                    })),
                    preview: aiReply.preview,
                }
                : null,
        },
    });

    return {
        message,
        fileTreeUpdate,
    };
};

export const createProjectInvitations = async ({ projectId, users, userId }) => {
    validateObjectId(projectId, 'projectId');
    validateObjectId(userId, 'userId');

    if (
        !Array.isArray(users) ||
        !users.length ||
        users.some((candidateId) => !mongoose.Types.ObjectId.isValid(candidateId))
    ) {
        throw new HttpError(400, 'Users must be a valid array of user ids');
    }

    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'invite people to this project');

    const memberIds = getProjectUserIds(project);
    const uniqueCandidateIds = Array.from(new Set(users.map(asStringId)))
        .filter((candidateId) => candidateId !== asStringId(userId))
        .filter((candidateId) => !memberIds.includes(candidateId))
        .slice(0, PROJECT_INVITE_LIMIT);

    if (!uniqueCandidateIds.length) {
        return [];
    }

    await ensureValidUsersExist(uniqueCandidateIds);

    const existingInvites = await projectInviteModel.find({
        invitedUser: { $in: uniqueCandidateIds },
        project: projectId,
    }).select('invitedUser');

    const existingInviteUserIds = new Set(existingInvites.map((invite) => asStringId(invite.invitedUser)));
    const invitePayload = uniqueCandidateIds
        .filter((candidateId) => !existingInviteUserIds.has(candidateId))
        .map((candidateId) => ({
            invitedBy: userId,
            invitedUser: candidateId,
            project: projectId,
        }));

    if (!invitePayload.length) {
        return [];
    }

    await projectInviteModel.insertMany(invitePayload, { ordered: false });
    await touchProjectActivity(projectId);

    return projectInviteModel
        .find({
            invitedUser: { $in: invitePayload.map((invite) => invite.invitedUser) },
            project: projectId,
        })
        .populate('invitedBy', 'name email')
        .populate('invitedUser', 'name email');
};

export const listUserProjectInvites = async ({ userId }) => {
    validateObjectId(userId, 'userId');

    const invites = await projectInviteModel
        .find({
            invitedUser: userId,
        })
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'name email')
        .populate({
            path: 'project',
            populate: [
                { path: 'users', select: 'name email createdAt' },
                { path: 'createdBy', select: 'name email' },
            ],
        });

    const validInvites = [];

    for (const invite of invites) {
        if (!invite.project) {
            await projectInviteModel.findByIdAndDelete(invite._id);
            continue;
        }

        normalizeProjectDocument(invite.project);

        if (getProjectUserIds(invite.project).includes(asStringId(userId))) {
            await projectInviteModel.findByIdAndDelete(invite._id);
            continue;
        }

        validInvites.push(invite);
    }

    return validInvites;
};

export const listProjectInvitations = async ({ projectId, userId }) => {
    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'view pending invitations');

    return projectInviteModel
        .find({
            project: projectId,
        })
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'name email')
        .populate('invitedUser', 'name email');
};

export const respondToProjectInvite = async ({ action, inviteId, userId }) => {
    validateObjectId(inviteId, 'inviteId');
    validateObjectId(userId, 'userId');

    const normalizedAction = String(action || '').trim().toLowerCase();

    if (![ 'accept', 'decline' ].includes(normalizedAction)) {
        throw new HttpError(400, 'Action must be accept or decline');
    }

    const invite = await projectInviteModel
        .findOne({
            _id: inviteId,
            invitedUser: userId,
        })
        .populate('invitedBy', 'name email')
        .populate({
            path: 'project',
            populate: [
                { path: 'users', select: 'name email createdAt' },
                { path: 'createdBy', select: 'name email' },
            ],
        });

    if (!invite) {
        throw new HttpError(404, 'Invitation not found');
    }

    if (normalizedAction === 'decline') {
        await projectInviteModel.findByIdAndDelete(inviteId);
        return {
            action: normalizedAction,
            inviteId,
            project: invite.project ? normalizeProjectDocument(invite.project) : null,
        };
    }

    if (!invite.project) {
        await projectInviteModel.findByIdAndDelete(inviteId);
        throw new HttpError(404, 'This project invitation is no longer available');
    }

    const project = normalizeProjectDocument(
        await populateProject(projectModel.findById(invite.project._id)),
    );

    if (!project) {
        await projectInviteModel.findByIdAndDelete(inviteId);
        throw new HttpError(404, 'This project invitation is no longer available');
    }

    if (!getProjectUserIds(project).includes(asStringId(userId))) {
        await projectModel.findByIdAndUpdate(project._id, {
            $addToSet: {
                users: userId,
            },
            $set: {
                lastActivityAt: new Date(),
            },
        });
    }

    await projectInviteModel.findByIdAndDelete(inviteId);

    return {
        action: normalizedAction,
        inviteId,
        project: normalizeProjectDocument(
            await populateProject(projectModel.findById(project._id)),
        ),
    };
};

export const cancelProjectInvitation = async ({ inviteId, projectId, userId }) => {
    validateObjectId(inviteId, 'inviteId');

    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'cancel project invitations');

    const invite = await projectInviteModel.findOneAndDelete({
        _id: inviteId,
        project: projectId,
    });

    if (!invite) {
        throw new HttpError(404, 'Invitation not found');
    }

    return { inviteId };
};

export const promoteProjectAdmin = async ({ memberId, projectId, userId }) => {
    validateObjectId(memberId, 'memberId');

    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'manage admins on this project');

    if (!getProjectUserIds(project).includes(asStringId(memberId))) {
        throw new HttpError(400, 'Only current collaborators can be promoted to admin');
    }

    const updatedProject = normalizeProjectDocument(
        await populateProject(
            projectModel.findByIdAndUpdate(
                projectId,
                {
                    $addToSet: {
                        admins: memberId,
                    },
                    $set: {
                        lastActivityAt: new Date(),
                    },
                },
                {
                    new: true,
                },
            ),
        ),
    );

    return updatedProject;
};

export const removeProjectMember = async ({ memberId, projectId, userId }) => {
    validateObjectId(memberId, 'memberId');

    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'remove people from this project');

    if (asStringId(memberId) === asStringId(userId)) {
        throw new HttpError(400, 'Use the leave project action to remove yourself');
    }

    const memberIds = getProjectUserIds(project);

    if (!memberIds.includes(asStringId(memberId))) {
        throw new HttpError(404, 'This person is not part of the project');
    }

    if (memberIds.length === 1) {
        throw new HttpError(400, 'Delete the project instead of removing the last person');
    }

    const remainingAdminIds = getProjectAdminIds(project).filter(
        (adminId) => adminId !== asStringId(memberId),
    );
    const remainingMemberIds = memberIds.filter(
        (candidateId) => candidateId !== asStringId(memberId),
    );

    if (!remainingAdminIds.length && remainingMemberIds.length) {
        throw new HttpError(400, 'Assign another admin before removing this person');
    }

    const updatedProject = normalizeProjectDocument(
        await populateProject(
            projectModel.findByIdAndUpdate(
                projectId,
                {
                    $pull: {
                        admins: memberId,
                        users: memberId,
                    },
                    $set: {
                        lastActivityAt: new Date(),
                    },
                },
                {
                    new: true,
                },
            ),
        ),
    );

    await projectInviteModel.deleteMany({
        invitedUser: memberId,
        project: projectId,
    });

    return updatedProject;
};

export const leaveProject = async ({ projectId, userId }) => {
    const project = await getProjectById({ projectId, userId });
    const memberIds = getProjectUserIds(project);
    const adminIds = getProjectAdminIds(project);
    const safeUserId = asStringId(userId);

    if (!memberIds.includes(safeUserId)) {
        throw new HttpError(404, 'You are not part of this project');
    }

    if (memberIds.length === 1) {
        await deleteProjectResources(projectId);
        return {
            deletedProject: true,
        };
    }

    if (adminIds.includes(safeUserId) && adminIds.length === 1) {
        throw new HttpError(
            400,
            'Assign another admin before leaving this project',
        );
    }

    const updatedProject = normalizeProjectDocument(
        await populateProject(
            projectModel.findByIdAndUpdate(
                projectId,
                {
                    $pull: {
                        admins: userId,
                        users: userId,
                    },
                    $set: {
                        lastActivityAt: new Date(),
                    },
                },
                {
                    new: true,
                },
            ),
        ),
    );

    await projectInviteModel.deleteMany({
        invitedUser: userId,
        project: projectId,
    });

    return {
        deletedProject: false,
        project: updatedProject,
    };
};

export const deleteProject = async ({ projectId, userId }) => {
    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'delete this project');

    await deleteProjectResources(projectId);

    return {
        deletedProject: true,
        projectId,
    };
};

export const getProjectWorkspace = async ({ projectId, userId }) => {
    const [ project, messages ] = await Promise.all([
        getProjectById({ projectId, userId }),
        listProjectMessages({ projectId, userId }),
    ]);

    const invites = isProjectAdmin(project, userId)
        ? await listProjectInvitations({ projectId, userId })
        : [];

    return {
        assistant: getAiAssistantSettings(project),
        invitations: invites,
        messages,
        project,
    };
};

export const updateProjectAssistantSettings = async ({
    projectId,
    userId,
    provider,
    model,
}) => {
    validateObjectId(projectId, 'projectId');
    validateObjectId(userId, 'userId');

    const project = await getProjectById({ projectId, userId });
    assertProjectAdmin(project, userId, 'change AI settings for this project');

    const validatedSettings = validateAssistantSettingsInput({
        provider,
        model,
    });

    const updatedProject = normalizeProjectDocument(
        await populateProject(
            projectModel.findByIdAndUpdate(
                projectId,
                {
                    $set: {
                        assistant: validatedSettings,
                        lastActivityAt: new Date(),
                    },
                },
                {
                    new: true,
                },
            ),
        ),
    );

    if (!updatedProject) {
        throw new HttpError(404, 'Project not found');
    }

    return updatedProject;
};
