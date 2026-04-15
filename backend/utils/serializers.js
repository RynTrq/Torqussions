import { AI_SENDER_ID, AI_SENDER_LABEL } from '../services/ai.service.js';

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

  if (typeof value?.toString === 'function') {
    return value.toString();
  }

  return String(value);
};

export const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  if (typeof user !== 'object') {
    return {
      _id: asStringId(user),
    };
  }

  const plainUser = typeof user.toObject === 'function' ? user.toObject() : user;
  const { password, __v, ...safeUser } = plainUser;

  return safeUser;
};

const getProjectAdminIds = (project) => {
  const plainProject =
    typeof project?.toObject === 'function' ? project.toObject() : project || {};
  const rawAdmins =
    Array.isArray(plainProject.admins) && plainProject.admins.length
      ? plainProject.admins
      : [plainProject.createdBy];

  return Array.from(new Set(rawAdmins.map(asStringId).filter(Boolean)));
};

const getProjectUserIds = (project) =>
  Array.from(
    new Set(
      Array.isArray(project?.users) ? project.users.map(asStringId).filter(Boolean) : [],
    ),
  );

const buildProjectPermissions = (project, currentUserId) => {
  const safeCurrentUserId = asStringId(currentUserId);
  const adminIds = getProjectAdminIds(project);
  const userIds = getProjectUserIds(project);
  const isMember = userIds.includes(safeCurrentUserId);
  const isAdmin = adminIds.includes(safeCurrentUserId);
  const hasOtherMembers = userIds.length > 1;
  const isLastAdmin = isAdmin && adminIds.length === 1;

  return {
    canDeleteProject: isAdmin,
    canInvite: isAdmin,
    canLeave: isMember,
    canManageAdmins: isAdmin,
    canManageMembers: isAdmin,
    isAdmin,
    isMember,
    mustAssignAdminBeforeLeaving: isLastAdmin && hasOtherMembers,
  };
};

export const serializeProject = (project, currentUserId, extra = {}) => {
  if (!project) {
    return null;
  }

  const plainProject =
    typeof project.toObject === 'function' ? project.toObject() : project;

  return {
    ...plainProject,
    adminIds: getProjectAdminIds(plainProject),
    createdBy: sanitizeUser(plainProject.createdBy),
    permissions: buildProjectPermissions(plainProject, currentUserId),
    users: Array.isArray(plainProject.users)
      ? plainProject.users.map((user) => sanitizeUser(user))
      : [],
    ...extra,
  };
};

export const serializeProjectInvite = (invite, currentUserId) => {
  if (!invite) {
    return null;
  }

  const plainInvite =
    typeof invite.toObject === 'function' ? invite.toObject() : invite;

  return {
    _id: plainInvite._id,
    createdAt: plainInvite.createdAt,
    invitedBy: sanitizeUser(plainInvite.invitedBy),
    invitedUser: sanitizeUser(plainInvite.invitedUser),
    project: serializeProject(plainInvite.project, currentUserId),
    updatedAt: plainInvite.updatedAt,
  };
};

export const serializeProjectMessage = (message) => {
  const plainMessage =
    typeof message.toObject === 'function' ? message.toObject() : message;

  const sender =
    sanitizeUser(plainMessage.sender) ||
    (plainMessage.type === 'ai' || plainMessage.senderLabel
      ? {
          _id: AI_SENDER_ID,
          name: plainMessage.senderLabel || AI_SENDER_LABEL,
          email: 'ai@torqussions.local',
        }
      : null);

  return {
    _id: plainMessage._id,
    project: plainMessage.project,
    content: plainMessage.content,
    type: plainMessage.type,
    sender,
    senderLabel: plainMessage.senderLabel,
    metadata: plainMessage.metadata || null,
    createdAt: plainMessage.createdAt,
    updatedAt: plainMessage.updatedAt,
  };
};
