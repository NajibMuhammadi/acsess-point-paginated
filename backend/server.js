import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { connectDB } from "./config/db.js";
import stationRouter from "./routes/stationRoutes.js";
import userRouter from "./routes/userRoutes.js";
import buildingRouter from "./routes/buildingRoutes.js";
import alarmRouter from "./routes/alarmRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import { startHeartbeatMonitor } from "./controllers/stationController.js";

dotenv.config();
const PORT = process.env.PORT || 5001;

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: ["https://checkpoint.app.serima.se", "http://localhost:3000"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});

// 3️⃣ Global CORS – Express
app.use(
    cors({
        origin: ["https://checkpoint.app.serima.se", "http://localhost:3000"],
        credentials: true,
    })
);

// 4️⃣ Manuella headers för preflight
app.use((req, res, next) => {
    res.header(
        "Access-Control-Allow-Origin",
        "https://checkpoint.app.serima.se",
        "http://localhost:3000"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());

app.use("/api/user", userRouter);
app.use("/api/building", buildingRouter);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/station", stationRouter);
app.use("/api/alarm", alarmRouter);

// Håller koll på anslutna stationer
export const stationConnections = new Map();

// WebSocket-hantering
io.on("connection", (socket) => {
    console.log("🔌 Klient anslöt:", socket.id);

    const token = socket.handshake.auth.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Station-anslutning
            if (decoded.type === "device" && decoded.stationId) {
                // Kolla om stationen redan är ansluten
                for (const [sockId, stId] of stationConnections.entries()) {
                    if (stId === decoded.stationId) {
                        console.log(
                            `♻️ Station ${decoded.stationId} är redan ansluten – kopplar ner gamla sessionen`
                        );
                        io.sockets.sockets.get(sockId)?.disconnect(true);
                        stationConnections.delete(sockId);
                    }
                }

                socket.join(`station-${decoded.stationId}`);
                stationConnections.set(socket.id, decoded.stationId);

                console.log(`🖥️ Station anslöt: ${decoded.stationId}`);

                socket.on("disconnect", () => {
                    stationConnections.delete(socket.id);
                    console.log(`❌ Station frånkopplad: ${decoded.stationId}`);
                });
                return;
            }
        } catch (err) {
            console.log("⚠️ Token verifiering misslyckades:", err.message);
        }
    }

    // Admin-anslutning
    console.log("👤 Admin anslöt:", socket.id);

    socket.on("joinCompany", (data) => {
        const companyId = data?.companyId || data; // hanterar både objekt & sträng
        if (!companyId) {
            console.warn(
                `⚠️ joinCompany anrop utan companyId från ${socket.id}`
            );
            return;
        }

        socket.join(companyId.toString());
        console.log(`➡️ Admin gick med i room: ${companyId}`);
    });

    socket.on("disconnect", () => {
        console.log("❌ Admin frånkopplad:", socket.id);
    });
});

async function startServer() {
    try {
        await connectDB();
        startHeartbeatMonitor();

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api/`);
        });
    } catch (err) {
        console.error("Error starting server:", err);
    }
}
startServer();
