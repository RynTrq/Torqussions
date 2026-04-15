import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: [ true, 'Project name must be unique' ],
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: [ 'planning', 'active', 'archived' ],
        default: 'active',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    admins: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    fileTree: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    assistant: {
        model: {
            type: String,
            trim: true,
            maxlength: [ 120, 'Assistant model must not be longer than 120 characters' ],
        },
        provider: {
            type: String,
            enum: [ 'gemini', 'grok' ],
            lowercase: true,
            trim: true,
        },
    },
    lastActivityAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
})

projectSchema.index({ users: 1, lastActivityAt: -1 });
projectSchema.index({ admins: 1, lastActivityAt: -1 });

const Project = mongoose.model('project', projectSchema)

export default Project;
