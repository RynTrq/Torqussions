import userModel from '../models/user.model.js';
import { HttpError } from '../utils/http-error.js';

const deriveNameFromEmail = (email) => {
    const localPart = email.split('@')[ 0 ] || 'Torqussions User';

    return localPart
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const createUser = async ({
    name, email, password
}) => {
    if (!email || !password) {
        throw new HttpError(400, 'Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userModel.findOne({ email: normalizedEmail });

    if (existingUser) {
        throw new HttpError(409, 'An account with this email already exists');
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userModel.create({
        name: name?.trim() || deriveNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        password: hashedPassword
    });

    return user;
}

export const getAllUsers = async ({ userId, search }) => {
    const query = {
        _id: { $ne: userId }
    };

    if (search?.trim()) {
        const searchRegex = { $regex: search.trim(), $options: 'i' };
        query.$or = [
            { email: searchRegex },
            { name: searchRegex },
        ];
    }

    const users = await userModel.find(query)
        .select('name email createdAt')
        .sort({ name: 1, email: 1 });

    return users;
}
