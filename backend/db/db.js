import mongoose from "mongoose";

let isConnected = false;

async function connect() {
    if (isConnected) {
        return mongoose.connection;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not configured');
    }

    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("Connected to MongoDB");

    return mongoose.connection;
}

export default connect;
