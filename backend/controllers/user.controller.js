import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import * as projectService from '../services/project.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';
import { getTokenFromRequest } from '../utils/auth.js';
import { sendError } from '../utils/http-error.js';
import { serializeProject, serializeProjectInvite } from '../utils/serializers.js';


export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const user = await userService.createUser(req.body);
        const token = await user.generateJWT();
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });
        res.status(201).json({ user, token });
    } catch (error) {
        return sendError(res, error);
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({
            email: email.trim().toLowerCase()
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            })
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid credentials'
            })
        }

        const token = await user.generateJWT();
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        res.status(200).json({ user, token });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const profileController = async (req, res) => {
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async (req, res) => {
    try {
        const token = req.authToken || getTokenFromRequest(req);

        if (token) {
            await redisClient.set(token, 'logout', 'EX', 60 * 60 * 24);
        }

        res.clearCookie('token');
        res.status(200).json({
            message: 'Logged out successfully'
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const getAllUsersController = async (req, res) => {
    try{
        const allUsers = await userService.getAllUsers({
            userId: req.user._id,
            search: req.query.search,
        });

        return res.status(200).json({
            users: allUsers
        })
    }catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}

export const listUserInvitationsController = async (req, res) => {
    try {
        const invitations = await projectService.listUserProjectInvites({
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

export const respondToInvitationController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const result = await projectService.respondToProjectInvite({
            action: req.body.action,
            inviteId: req.params.inviteId,
            userId: req.user._id,
        });

        return res.status(200).json({
            ...result,
            project: result.project ? serializeProject(result.project, req.user._id) : null,
        });
    } catch (err) {
        console.log(err);
        return sendError(res, err);
    }
}
