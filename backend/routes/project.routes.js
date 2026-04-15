import { Router } from 'express';
import { body, param } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import * as authMiddleWare from '../middleware/auth.middleware.js';

const router = Router();

const projectIdParamValidator = param('projectId')
    .isMongoId()
    .withMessage('Project ID must be valid');

const inviteIdParamValidator = param('inviteId')
    .isMongoId()
    .withMessage('Invitation ID must be valid');

const memberIdParamValidator = param('memberId')
    .isMongoId()
    .withMessage('Member ID must be valid');

const projectPayloadValidators = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 60 })
        .withMessage('Name must be between 3 and 60 characters'),
    body('description')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 10, max: 400 })
        .withMessage('Description must be between 10 and 400 characters'),
];

const collaboratorValidators = [
    body('users')
        .isArray({ min: 1 })
        .withMessage('Users must be an array of strings')
        .bail()
        .custom((users) => users.every((user) => typeof user === 'string'))
        .withMessage('Each user must be a string'),
];

const fileTreeValidators = [
    body('fileTree').isObject().withMessage('File tree is required'),
];

const executionValidators = [
    body('entryFile')
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Entry file is required'),
    body('runtime')
        .optional()
        .isIn([ 'python', 'javascript', 'c', 'cpp', 'c++', 'java' ])
        .withMessage('Runtime must be Python, JavaScript, C, C++, or Java'),
    body('stdin')
        .optional()
        .isString()
        .isLength({ max: 8000 })
        .withMessage('Program input must be under 8000 characters'),
    body('fileTree')
        .optional()
        .isObject()
        .withMessage('fileTree must be an object'),
];

const assistantValidators = [
    body('provider')
        .isString()
        .trim()
        .isIn([ 'gemini', 'grok' ])
        .withMessage('Provider must be Gemini or Grok'),
    body('model')
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Model must be between 1 and 120 characters'),
];

router.use(authMiddleWare.authUser);

router.post('/', ...projectPayloadValidators, projectController.createProject);
router.get('/', projectController.getAllProject);

router.get('/:projectId/workspace', projectIdParamValidator, projectController.getProjectWorkspace);
router.get('/:projectId', projectIdParamValidator, projectController.getProjectById);

router.post(
    '/:projectId/messages',
    projectIdParamValidator,
    body('content')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage('Message must be between 1 and 4000 characters'),
    body('message')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage('Message must be between 1 and 4000 characters'),
    projectController.createProjectMessage,
);

router.post(
    '/:projectId/execute',
    projectIdParamValidator,
    ...executionValidators,
    projectController.executeProjectCode,
);

router.put(
    '/:projectId/file-tree',
    projectIdParamValidator,
    ...fileTreeValidators,
    projectController.updateFileTree,
);

router.put(
    '/:projectId/assistant',
    projectIdParamValidator,
    ...assistantValidators,
    projectController.updateProjectAssistantSettings,
);

router.put(
    '/:projectId/collaborators',
    projectIdParamValidator,
    ...collaboratorValidators,
    projectController.addUserToProject,
);

router.get('/:projectId/invitations', projectIdParamValidator, projectController.listProjectInvitations);
router.delete(
    '/:projectId/invitations/:inviteId',
    projectIdParamValidator,
    inviteIdParamValidator,
    projectController.cancelProjectInvitation,
);

router.put(
    '/:projectId/admins/:memberId',
    projectIdParamValidator,
    memberIdParamValidator,
    projectController.promoteProjectAdmin,
);

router.delete(
    '/:projectId/members/:memberId',
    projectIdParamValidator,
    memberIdParamValidator,
    projectController.removeProjectMember,
);

router.post('/:projectId/leave', projectIdParamValidator, projectController.leaveProject);
router.delete('/:projectId', projectIdParamValidator, projectController.deleteProject);

export default router;
