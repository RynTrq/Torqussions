import mongoose from 'mongoose';

const projectInviteSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'project',
            required: true,
        },
        invitedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

projectInviteSchema.index(
    { project: 1, invitedUser: 1 },
    {
        unique: true,
    },
);

projectInviteSchema.index({ invitedUser: 1, createdAt: -1 });

const ProjectInvite = mongoose.model('projectInvite', projectInviteSchema);

export default ProjectInvite;
