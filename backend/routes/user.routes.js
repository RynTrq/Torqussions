import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { body, param } from 'express-validator';
import * as authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register',
    body('name').optional().trim().isLength({ min: 2, max: 40 }).withMessage('Name must be between 2 and 40 characters'),
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    userController.createUserController);

router.post('/login',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    userController.loginController);

router.get('/profile', authMiddleware.authUser, userController.profileController);
router.get('/me', authMiddleware.authUser, userController.profileController);

router.post('/logout', authMiddleware.authUser, userController.logoutController);
router.get('/logout', authMiddleware.authUser, userController.logoutController);

router.get('/all', authMiddleware.authUser, userController.getAllUsersController);
router.get('/invites', authMiddleware.authUser, userController.listUserInvitationsController);
router.post(
    '/invites/:inviteId/respond',
    authMiddleware.authUser,
    param('inviteId').isMongoId().withMessage('Invitation ID must be valid'),
    body('action').isIn([ 'accept', 'decline' ]).withMessage('Action must be accept or decline'),
    userController.respondToInvitationController,
);

export default router;
