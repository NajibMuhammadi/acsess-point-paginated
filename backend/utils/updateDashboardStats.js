import { getDB } from "../config/db.js";
import { io } from "../server.js"; // din Socket.IO-instans

export async function updateDashboardStats(companyId) {
    const db = getDB();
    const statsCol = db.collection("dashboardStats");
    const buildingsCol = db.collection("buildings");
    const stationsCol = db.collection("stations");
    const attendanceCol = db.collection("attendance");

    // 🔹 Snabba queries (tack vare index på companyId)
    const [buildings, stations, activeStations, activeUsers] =
        await Promise.all([
            buildingsCol.countDocuments({ companyId }),
            stationsCol.countDocuments({ companyId }),
            stationsCol.countDocuments({ companyId, isOnline: true }),
            attendanceCol.countDocuments({ companyId, checkOutTime: null }),
        ]);

    const totals = {
        buildings,
        stations,
        activeStations,
        activeUsers,
    };

    await statsCol.updateOne(
        { companyId },
        { $set: { totals, updatedAt: new Date() } },
        { upsert: true }
    );

    // 🟢 Broadcast till alla admins/klienter i företagets Socket.IO-room
    io.to(companyId).emit("dashboardUpdated", totals);
}
