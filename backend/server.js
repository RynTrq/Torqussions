import './env.js'
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connect from './db/db.js';
import userModel from './models/user.model.js';
import * as projectService from './services/project.service.js';
import { getProjectIdFromSocket, getTokenFromSocket, verifyAccessToken } from './utils/auth.js';
import { corsOptions } from './utils/cors.js';
import { HttpError } from './utils/http-error.js';
import { isAiTriggeredContent, validateAiPromptContent } from './services/ai.service.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: corsOptions
});

io.use( async(socket, next) => {
    try{
        const token = getTokenFromSocket(socket);
        const projectId = getProjectIdFromSocket(socket);

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new HttpError(400, 'Invalid projectId'));
        }
        
        if(!token){
            return next(new HttpError(401, 'Authentication error - No token for handshake'))
        }

        const decoded = verifyAccessToken(token);
        const userId = decoded.sub || decoded.id;
        const user = userId
            ? await userModel.findById(userId)
            : await userModel.findOne({ email: decoded.email });

        if(!user){
            return next(new HttpError(401, 'Authentication error'));
        }

        await projectService.getProjectById({
            projectId,
            userId: user._id,
        });

        socket.user = {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
        };
        socket.userId = user._id.toString();
        socket.projectId = projectId;

        next();
    }catch(error){
        next(error);
    }
})

io.on('connection', socket => {
    socket.join(socket.projectId);

    socket.on('project-message', async (data, maybeAck) => {
        const ack = typeof maybeAck === 'function' ? maybeAck : null;

        try {
            const content = data?.content || data?.message;

            validateAiPromptContent(content);

            const message = await projectService.createProjectMessage({
                projectId: socket.projectId,
                userId: socket.userId,
                content,
            });

            io.to(socket.projectId).emit('project-message', message);
            ack?.({ ok: true, message });

            if (isAiTriggeredContent(content)) {
                void projectService.createAiProjectReply({
                    projectId: socket.projectId,
                    userId: socket.userId,
                    content,
                })
                    .then((aiResult) => {
                        if (aiResult?.fileTreeUpdate) {
                            io.to(socket.projectId).emit('project:file-tree:update', {
                                projectId: socket.projectId,
                                ...aiResult.fileTreeUpdate,
                            });
                        }

                        if (aiResult?.message) {
                            io.to(socket.projectId).emit('project-message', aiResult.message);
                        }
                    })
                    .catch((error) => {
                        socket.emit('project:error', { error: error.message, source: 'ai' });
                    });
            }
        } catch (error) {
            socket.emit('project:error', { error: error.message });
            ack?.({ ok: false, error: error.message });
        }
    });

    socket.on('project:file-tree:update', async (data, maybeAck) => {
        const ack = typeof maybeAck === 'function' ? maybeAck : null;

        try {
            const project = await projectService.updateFileTree({
                projectId: socket.projectId,
                userId: socket.userId,
                fileTree: data?.fileTree,
            });

            const update = {
                projectId: socket.projectId,
                fileTree: project.fileTree,
                updatedAt: project.updatedAt,
            };

            socket.to(socket.projectId).emit('project:file-tree:update', update);
            ack?.({ ok: true, ...update });
        } catch (error) {
            socket.emit('project:error', { error: error.message });
            ack?.({ ok: false, error: error.message });
        }
    });

    socket.on('disconnect', () => {
        socket.leave(socket.projectId);
    });
});

const bootstrap = async () => {
    await connect();
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
};

bootstrap().catch((error) => {
    console.error('Failed to start Torqussions backend', error);
    process.exit(1);
});
