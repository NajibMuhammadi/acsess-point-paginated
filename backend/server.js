import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { connectDB } from "./config/db.js";
import stationRouter from "./routes/stationRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import buildingRouter from "./routes/buildingRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: [
            "http://najib.serima.se",
            "http://localhost:3000",
            "http://172.20.20.47:3000",
            "http://127.0.0.1:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});

app.use(
    cors({
        origin: [
            "http://najib.serima.se",
            "http://localhost:3000",
            "http://172.20.20.47:3000",
            "http://127.0.0.1:3000",
        ],
        credentials: true,
    })
);
app.use(express.json());

app.use("/api/admin", adminRouter);
app.use("/api/building", buildingRouter);
app.use("/api/station", stationRouter);
app.use("/api/attendance", attendanceRouter);

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

    socket.on("joinCompany", (companyId) => {
        socket.join(companyId);
        console.log(`➡️ Admin gick med i room: ${companyId}`);
    });

    socket.on("disconnect", () => {
        console.log("❌ Admin frånkopplad:", socket.id);
    });
});

async function startServer() {
    try {
        await connectDB();

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api/`);
        });
    } catch (err) {
        console.error("Error starting server:", err);
    }
}
startServer();
