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

        // Log initial memory usage snapshot
        try {
          const mu = process.memoryUsage();
          console.log('[startup] memoryUsage (bytes):', mu);
        } catch (e) {
          // ignore
        }

        // start background jobs after server & DB are up unless explicitly disabled
        try {
          const disableJobs = process.env.DISABLE_BG_JOBS === '1' || process.env.DISABLE_BG_JOBS === 'true';
          if (!disableJobs) {
            const jobs = require('./jobs/check-late-tasks');
            if (jobs && typeof jobs.startLateTaskChecker === 'function') {
              jobs.startLateTaskChecker();
            }
          } else {
            console.log('[startup] background jobs disabled via DISABLE_BG_JOBS');
          }
        } catch (e) {
          console.error('Failed to start background jobs', e);
        }
    });
});