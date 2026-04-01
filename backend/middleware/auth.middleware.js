import userModel from "../models/user.model.js";
import redisClient from "../services/redis.service.js";
import { getTokenFromRequest, verifyAccessToken } from "../utils/auth.js";
import { sanitizeUser } from "../utils/serializers.js";

export const authUser = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized user' });
        }

        const isBlackListed = await redisClient.get(token);

        if (isBlackListed) {
            res.cookie('token', '');
            return res.status(401).json({ error: 'Unauthorized user' });
        }

        const decoded = verifyAccessToken(token);
        const userId = decoded.sub || decoded.id;

        const user = userId
            ? await userModel.findById(userId)
            : await userModel.findOne({ email: decoded.email });

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized user' });
        }

        req.user = sanitizeUser(user);
        req.authToken = token;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ error: 'Unauthorized user' });
    }
}
