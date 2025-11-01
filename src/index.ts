import app from './app';
import connectDB from './config/mongoose';
import http from "http";
import { Server } from "socket.io";


const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: "*", // 👈 allow Expo/React Native clients
    },
});

io.on("connection", (socket) => {
    console.log("📲 Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);

        // start background jobs after server & DB are up
        try {
          const jobs = require('./jobs/check-late-tasks');
          if (jobs && typeof jobs.startLateTaskChecker === 'function') {
            jobs.startLateTaskChecker();
          }
        } catch (e) {
          console.error('Failed to start background jobs', e);
        }
    });
});