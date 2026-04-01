import mongoose from 'mongoose';

const projectMessageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'project',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    senderLabel: {
      type: String,
      trim: true,
      maxlength: [80, 'Sender label must not be longer than 80 characters'],
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [12000, 'Message must not be longer than 12000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'system', 'ai'],
      default: 'text',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

projectMessageSchema.index({ project: 1, createdAt: 1 });

const ProjectMessage = mongoose.model('projectMessage', projectMessageSchema);

export default ProjectMessage;
