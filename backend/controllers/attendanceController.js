import crypto from "crypto";
import { io } from "../server.js";
import {
    getAttendanceCollection,
    getVisitorsCollection,
    getStationsCollection,
    getCompaniesCollection,
    getBuildingsCollection,
} from "../config/db.js";

// ============================================================
// 🔹 HELPER: Uppdatera weekly trends
// ============================================================
// ============================================================
// 🔹 HELPER: Uppdatera weekly trends + station/building stats
// ============================================================
async function emitWeeklyTrends(companyId) {
    try {
        const attendanceCol = getAttendanceCollection();
        const stationsCol = getStationsCollection();
        const buildingsCol = getBuildingsCollection();

        const now = new Date();
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        // 🟢 Kör ALLA aggregationer parallellt (inkl. stations & buildings)
        const [
            weeklyResult,
            currentlyCheckedInResult,
            recentAttendance,
            allStations,
            allBuildings,
        ] = await Promise.all([
            // Pipeline 1: Weekly trends
            attendanceCol
                .aggregate([
                    {
                        $match: {
                            companyId,
                            checkInTime: {
                                $gte: sevenDaysAgo,
                                $lte: endOfToday,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$checkInTime",
                                },
                            },
                            totalCheckIns: { $sum: 1 },
                            totalCheckOuts: {
                                $sum: {
                                    $cond: [
                                        { $ne: ["$checkOutTime", null] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),

            // Pipeline 2: Currently checked in
            attendanceCol
                .aggregate([
                    {
                        $match: {
                            companyId,
                            checkOutTime: null,
                        },
                    },
                    {
                        $count: "total",
                    },
                ])
                .toArray(),

            // Pipeline 3: Recent 5 attendance records MED visitor info
            attendanceCol
                .aggregate([
                    {
                        $match: { companyId },
                    },
                    {
                        $sort: { checkInTime: -1 },
                    },
                    {
                        $limit: 5,
                    },
                    {
                        $lookup: {
                            from: "visitors",
                            localField: "visitorId",
                            foreignField: "visitorId",
                            as: "visitorInfo",
                        },
                    },
                    {
                        $unwind: {
                            path: "$visitorInfo",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $addFields: {
                            type: "$visitorInfo.type",
                            phoneNumber: "$visitorInfo.phoneNumber",
                        },
                    },
                    {
                        $project: {
                            visitorInfo: 0,
                        },
                    },
                ])
                .toArray(),

            // 🟢 Pipeline 4: Hämta alla stations för företaget
            stationsCol.find({ companyId }).toArray(),

            // 🟢 Pipeline 5: Hämta alla buildings för företaget
            buildingsCol.find({ companyId }).toArray(),
        ]);

        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        // 🟢 Processa weekly trends
        const dataMap = new Map(
            weeklyResult.map((r) => [
                r._id,
                { checkIns: r.totalCheckIns, checkOuts: r.totalCheckOuts },
            ])
        );

        const formatted = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            const dayName = daysOfWeek[date.getDay()];
            const data = dataMap.get(dateStr) || { checkIns: 0, checkOuts: 0 };

            formatted.push({
                day: dayName,
                checkIns: data.checkIns,
                checkOuts: data.checkOuts,
            });
        }

        const currentlyCheckedIn = currentlyCheckedInResult[0]?.total || 0;

        // 🟢 Beräkna station-statistik
        const totalStations = allStations.length;
        const activeStations = allStations.filter(
            (s) => s.buildingId !== null && s.buildingId !== undefined
        ).length;
        const onlineStations = allStations.filter(
            (s) => s.status === "online" || s.isOnline === true
        ).length;

        // 🟢 Beräkna building-statistik
        const totalBuildings = allBuildings.length;

        // 🟢 Skapa stats-objekt
        const stats = {
            totalBuildings,
            totalStations,
            activeStations,
            onlineStations,
            currentlyCheckedIn,
        };

        // 🟢 Emittera ALLA events
        io.to(companyId).emit("weeklyTrendsUpdated", formatted);
        io.to(companyId).emit("currentlyCheckedInUpdated", currentlyCheckedIn);
        io.to(companyId).emit("recentAttendanceUpdated", recentAttendance);
        io.to(companyId).emit("dashboardStatsUpdated", stats); // 🟢 Ny event

        console.log("📊 Weekly trends:", formatted);
        console.log("👥 Currently checked in:", currentlyCheckedIn);
        console.log("🕐 Recent attendance:", recentAttendance);
        console.log("📈 Dashboard stats:", stats);

        return { formatted, currentlyCheckedIn, recentAttendance, stats };
    } catch (err) {
        console.error("❌ Error emitting weekly trends:", err);
        return null;
    }
}
// ============================================================
// 🔹 POST /api/attendance/attendance-uid
//    Station pingar när kort läses – registrerar in/ut
// ============================================================
export async function attendance(req, res) {
    const { uid, visitorName, phoneNumber, type } = req.body;

    if (!uid?.trim()) {
        return res.status(400).json({ success: false, message: "UID krävs" });
    }

    try {
        const now = new Date();
        const station = req.station;
        const companyId = req.companyId;

        if (!station?.buildingId) {
            return res.status(400).json({
                success: false,
                message: "Stationen är inte kopplad till någon byggnad",
            });
        }

        const visitorsCol = getVisitorsCollection();
        const attendanceCol = getAttendanceCollection();
        const companiesCol = getCompaniesCollection();

        const company = await companiesCol.findOne({ companyId });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Företag hittades inte",
            });

        let visitor = await visitorsCol.findOne({ uid, companyId });

        if (!visitor) {
            if (!visitorName || !phoneNumber || !type) {
                return res.status(400).json({
                    success: false,
                    message: "Ny besökare kräver namn, telefon och typ",
                });
            }

            visitor = {
                visitorId: crypto.randomUUID(),
                companyId,
                visitorName: visitorName.trim(),
                phoneNumber: phoneNumber.trim(),
                type: type.trim(),
                uid: uid.trim(),
                createdAt: now,
                lastSeen: now,
            };

            await visitorsCol.insertOne(visitor);
            io.to(companyId).emit("visitorCreated", visitor);
        } else {
            await visitorsCol.updateOne(
                { visitorId: visitor.visitorId },
                { $set: { lastSeen: now } }
            );
        }

        const openAttendance = await attendanceCol.findOne({
            uid,
            companyId,
            checkOutTime: null,
        });

        let attendanceRecord;

        if (openAttendance) {
            await attendanceCol.updateOne(
                { attendanceId: openAttendance.attendanceId },
                { $set: { checkOutTime: now, updatedAt: now } }
            );

            attendanceRecord = { ...openAttendance, checkOutTime: now };
        } else {
            attendanceRecord = {
                attendanceId: crypto.randomUUID(),
                companyId,
                visitorId: visitor.visitorId,
                visitorName: visitor.visitorName,
                uid: uid.trim(),
                stationId: station.stationId,
                buildingId: station.buildingId,
                checkInTime: now,
                checkOutTime: null,
                createdAt: now,
            };

            await attendanceCol.insertOne(attendanceRecord);
        }

        // Skicka realtidsuppdateringar
        io.to(companyId).emit("attendanceUpdated", attendanceRecord);
        await emitWeeklyTrends(companyId); // 🟢 Lägg till denna rad

        return res.json({
            success: true,
            message: "Attendance registrerad",
            attendance: attendanceRecord,
        });
    } catch (err) {
        console.error("❌ Attendance error:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

// ============================================================
// 🔹 GET /api/attendance/paginated?page=1&limit=25&search=
//    Admins kan bläddra i alla poster
// ============================================================
export async function getAllAttendance(req, res) {
    try {
        const { page = 1, limit = 25, search = "" } = req.query;
        const user = req.user || req.userData || {};
        const companyId = user.companyId || req.companyId;

        if (!companyId) {
            return res.status(401).json({
                success: false,
                message: "Ingen companyId hittades i token",
            });
        }

        const attendanceCol = getAttendanceCollection();
        const query = { companyId };

        if (search) {
            query.$or = [
                { visitorName: { $regex: search, $options: "i" } },
                { uid: { $regex: search, $options: "i" } },
                { stationId: { $regex: search, $options: "i" } },
            ];
        }

        const total = await attendanceCol.countDocuments(query);

        const attendance = await attendanceCol
            .find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .toArray();

        return res.json({
            success: true,
            total,
            totalPages: Math.ceil(total / Number(limit)),
            page: Number(page),
            limit: Number(limit),
            attendance,
        });
    } catch (err) {
        console.error("❌ Error fetching attendance:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av attendance",
        });
    }
}

export async function getAttendanceToday(req, res) {
    try {
        const companyId = req.user.companyId;
        const result = await emitWeeklyTrends(companyId);

        if (!result) {
            return res.status(500).json({
                success: false,
                message: "Kunde inte hämta veckodata",
            });
        }

        const { formatted, currentlyCheckedIn, recentAttendance, stats } =
            result;

        res.json({
            success: true,
            totalCheckIns: formatted.reduce((a, b) => a + b.checkIns, 0),
            totalCheckOuts: formatted.reduce((a, b) => a + b.checkOuts, 0),
            currentlyCheckedIn,
            recentAttendance,
            stats, // 🟢 Lägg till stats
            data: formatted,
        });
    } catch (err) {
        console.error("❌ Error in getAttendanceToday:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av veckodata",
        });
    }
}
