import {Schema, model} from "mongoose";
import {User} from "./user.interface";

const UserSchema: Schema = new Schema<User>({
    name: {type: String, required: true},
    idNumber: {type: String, required: true, unique: true}, // Unique login ID
    password: {type: String, required: true}, // Hashed password
    role: {type: String, enum: ['admin', 'employee'], required: true}, // User role
    active: {type: Boolean, default: true},
}, {timestamps: true});

export default model<User>("User", UserSchema);
