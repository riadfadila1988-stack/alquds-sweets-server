import {Document} from "mongoose";

export interface User extends Document {
    name: string;
    idNumber: string; // Unique identifier for login
    password: string; // Hashed password
    role: 'admin' | 'employee'; // User role
    active: boolean;
}