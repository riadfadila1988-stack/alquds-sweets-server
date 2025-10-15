import mongoose from 'mongoose';
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.MONGO_URI as string;
const connectDB = async () => {
    try {
        await mongoose.connect(dbUrl);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;