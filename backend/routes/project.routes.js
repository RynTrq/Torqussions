import { Router } from 'express';
import { body, param } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import * as authMiddleWare from '../middleware/auth.middleware.js';

const router = Router();

const projectPayloadValidators = [
    body('name').trim().isLength({ min: 3, max: 60 }).withMessage('Name must be between 3 and 60 characters'),
    body('description').optional().isString().trim().isLength({ min: 10, max: 400 }).withMessage('Description must be between 10 and 400 characters'),
];

const collaboratorValidators = [
    body('projectId').optional().isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
];

const fileTreeValidators = [
    body('projectId').optional().isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree is required'),
];

const executionValidators = [
    body('entryFile').isString().trim().isLength({ min: 1, max: 120 }).withMessage('Entry file is required'),
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

const projectIdParamValidator = param('projectId').isMongoId().withMessage('Project ID must be valid');
const inviteIdParamValidator = param('inviteId').isMongoId().withMessage('Invitation ID must be valid');
const memberIdParamValidator = param('memberId').isMongoId().withMessage('Member ID must be valid');

router.post('/create',
    authMiddleWare.authUser,
    ...projectPayloadValidators,
    projectController.createProject
)

router.get('/all',
    authMiddleWare.authUser,
    projectController.getAllProject
)

router.put('/add-user',
    authMiddleWare.authUser,
    ...collaboratorValidators,
    projectController.addUserToProject
)

router.get('/get-project/:projectId',
    authMiddleWare.authUser,
    param('projectId').isMongoId().withMessage('Project ID must be valid'),
    projectController.getProjectById
)

router.put('/update-file-tree',
    authMiddleWare.authUser,
    ...fileTreeValidators,
    projectController.updateFileTree
)

router.post('/',
    authMiddleWare.authUser,
    ...projectPayloadValidators,
    projectController.createProject
)

router.get('/',
    authMiddleWare.authUser,
    projectController.getAllProject
)

router.get('/:projectId/workspace',
    authMiddleWare.authUser,
    projectIdParamValidator,
    projectController.getProjectWorkspace
)

router.get('/:projectId',
    authMiddleWare.authUser,
    projectIdParamValidator,
    projectController.getProjectById
)

router.post('/:projectId/messages',
    authMiddleWare.authUser,
    projectIdParamValidator,
    body('content').optional().isString().trim().isLength({ min: 1, max: 4000 }).withMessage('Message must be between 1 and 4000 characters'),
    body('message').optional().isString().trim().isLength({ min: 1, max: 4000 }).withMessage('Message must be between 1 and 4000 characters'),
    projectController.createProjectMessage
)

router.post('/:projectId/execute',
    authMiddleWare.authUser,
    projectIdParamValidator,
    ...executionValidators,
    projectController.executeProjectCode
)

router.put('/:projectId/collaborators',
    authMiddleWare.authUser,
    projectIdParamValidator,
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.addUserToProject
)

router.put('/:projectId/file-tree',
    authMiddleWare.authUser,
    projectIdParamValidator,
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTree
)

router.get('/:projectId/invitations',
    authMiddleWare.authUser,
    projectIdParamValidator,
    projectController.listProjectInvitations
)

router.delete('/:projectId/invitations/:inviteId',
    authMiddleWare.authUser,
    projectIdParamValidator,
    inviteIdParamValidator,
    projectController.cancelProjectInvitation
)

router.put('/:projectId/admins/:memberId',
    authMiddleWare.authUser,
    projectIdParamValidator,
    memberIdParamValidator,
    projectController.promoteProjectAdmin
)

router.delete('/:projectId/members/:memberId',
    authMiddleWare.authUser,
    projectIdParamValidator,
    memberIdParamValidator,
    projectController.removeProjectMember
)

router.post('/:projectId/leave',
    authMiddleWare.authUser,
    projectIdParamValidator,
    projectController.leaveProject
)

router.delete('/:projectId',
    authMiddleWare.authUser,
    projectIdParamValidator,
    projectController.deleteProject
)

export default router;
