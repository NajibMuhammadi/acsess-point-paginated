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
// 🚀 OPTIMERAD: Minimal real-time update vid check-in/out
// ============================================================
async function emitMinimalRealtimeUpdate(companyId, buildingId, stationId) {
    try {
        const attendanceCol = getAttendanceCollection();
        const now = new Date();

        // 🟢 Räkna ENDAST currently checked in (snabb query)
        const currentlyCheckedIn = await attendanceCol.countDocuments({
            companyId,
            checkOutTime: null,
        });

        // 🟢 Hämta ENDAST de 5 senaste attendance records
        const recentAttendance = await attendanceCol
            .aggregate([
                { $match: { companyId } },
                { $sort: { checkInTime: -1 } },
                { $limit: 5 },
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
                { $project: { visitorInfo: 0 } },
            ])
            .toArray();

        // 🟢 Räkna aktiva besökare ENDAST för berörd byggnad
        let buildingUpdate = null;
        if (buildingId) {
            const activeCount = await attendanceCol.countDocuments({
                companyId,
                buildingId,
                checkOutTime: null,
            });

            buildingUpdate = {
                buildingId,
                activeVisitorsCount: activeCount,
            };
        }

        // 🟢 Räkna check-ins ENDAST för berörd station (dagens datum)
        let stationUpdate = null;
        if (stationId) {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const todayCount = await attendanceCol.countDocuments({
                companyId,
                stationId,
                checkInTime: { $gte: startOfDay },
            });

            const activeAtStation = await attendanceCol.countDocuments({
                companyId,
                stationId,
                checkOutTime: null,
            });

            stationUpdate = {
                stationId,
                todayCheckInCount: todayCount,
                activeVisitorsCount: activeAtStation,
            };
        }

        // 🔔 Emittera ENDAST nödvändiga updates
        io.to(companyId).emit("currentlyCheckedInUpdated", currentlyCheckedIn);
        io.to(companyId).emit("recentAttendanceUpdated", recentAttendance);

        if (buildingUpdate) {
            io.to(companyId).emit("buildingCapacityUpdated", buildingUpdate);
        }

        if (stationUpdate) {
            io.to(companyId).emit("stationStatsUpdated", stationUpdate);
        }

        console.log("⚡ Minimal realtime update sent");
        return { currentlyCheckedIn, recentAttendance };
    } catch (err) {
        console.error("❌ Error in minimal realtime update:", err);
        return null;
    }
}

// ============================================================
// 🔹 HELPER: Full weekly trends (körs ENDAST vid sida-laddning)
// ============================================================
export async function emitWeeklyTrends(companyId) {
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

        const [
            weeklyResult,
            currentlyCheckedInResult,
            recentAttendance,
            allStations,
            allBuildings,
            FiveLatestBuildings,
        ] = await Promise.all([
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

            attendanceCol
                .aggregate([
                    { $match: { companyId, checkOutTime: null } },
                    { $count: "total" },
                ])
                .toArray(),

            attendanceCol
                .aggregate([
                    { $match: { companyId } },
                    { $sort: { checkInTime: -1 } },
                    { $limit: 5 },
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
                    { $project: { visitorInfo: 0 } },
                ])
                .toArray(),

            stationsCol.find({ companyId }).toArray(),
            buildingsCol.find({ companyId }).toArray(),

            buildingsCol
                .aggregate([
                    { $match: { companyId } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: "stations",
                            let: { bId: "$buildingId", cId: "$companyId" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$buildingId",
                                                        "$$bId",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$companyId",
                                                        "$$cId",
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        stationId: 1,
                                        isOnline: 1,
                                    },
                                },
                            ],
                            as: "stations",
                        },
                    },
                    {
                        $lookup: {
                            from: "attendance",
                            let: { bId: "$buildingId", cId: "$companyId" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$buildingId",
                                                        "$$bId",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$companyId",
                                                        "$$cId",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$checkOutTime",
                                                        null,
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        visitorName: 1,
                                        checkInTime: 1,
                                    },
                                },
                            ],
                            as: "activeVisitors",
                        },
                    },
                    {
                        $addFields: {
                            stationCount: { $size: "$stations" },
                            activeVisitorsCount: { $size: "$activeVisitors" },
                            activeVisitorNames: "$activeVisitors.visitorName",
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            buildingId: 1,
                            buildingName: 1,
                            createdAt: 1,
                            stationCount: 1,
                            activeVisitorsCount: 1,
                            activeVisitorNames: 1,
                        },
                    },
                ])
                .toArray(),
        ]);

        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

        const totalStations = allStations.length;
        const activeStations = allStations.filter(
            (s) => s.buildingId !== null && s.buildingId !== undefined
        ).length;
        const onlineStations = allStations.filter(
            (s) => s.status === "online" || s.isOnline === true
        ).length;

        const totalBuildings = allBuildings.length;

        const stats = {
            totalBuildings,
            totalStations,
            activeStations,
            onlineStations,
            currentlyCheckedIn,
        };

        io.to(companyId).emit("weeklyTrendsUpdated", formatted);
        io.to(companyId).emit("currentlyCheckedInUpdated", currentlyCheckedIn);
        io.to(companyId).emit("recentAttendanceUpdated", recentAttendance);
        io.to(companyId).emit("dashboardStatsUpdated", stats);
        io.to(companyId).emit("latestBuildingsUpdated", FiveLatestBuildings);

        console.log("📊 Weekly trends sent (FULL refresh)");

        return {
            formatted,
            currentlyCheckedIn,
            recentAttendance,
            stats,
            FiveLatestBuildings,
        };
    } catch (err) {
        console.error("❌ Error emitting weekly trends:", err);
        return null;
    }
}

// ============================================================
// 🏢 HELPER: Light update av senaste 5 byggnader (för realtidsuppdatering)
// ============================================================
export async function emitLatestBuildings(companyId) {
    try {
        const buildingsCol = getBuildingsCollection();
        const stationsCol = getStationsCollection();
        const attendanceCol = getAttendanceCollection();

        // 🟢 Hämta de 5 senaste byggnaderna snabbt (sort + limit)
        const latestBuildings = await buildingsCol
            .find({ companyId })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();

        if (latestBuildings.length === 0) {
            io.to(companyId).emit("latestBuildingsUpdated", []);
            return [];
        }

        // 🟢 Hämta stationer och aktiva besökare parallellt
        const buildingIds = latestBuildings.map((b) => b.buildingId);

        const [stations, activeAttendances] = await Promise.all([
            stationsCol
                .find({ companyId, buildingId: { $in: buildingIds } })
                .project({ _id: 0, buildingId: 1 })
                .toArray(),
            attendanceCol
                .find({
                    companyId,
                    buildingId: { $in: buildingIds },
                    checkOutTime: null,
                })
                .project({ _id: 0, buildingId: 1, visitorName: 1 })
                .toArray(),
        ]);

        // 🧩 Beräkna totals per byggnad
        const buildingData = latestBuildings.map((b) => {
            const stationCount = stations.filter(
                (s) => s.buildingId === b.buildingId
            ).length;

            const activeVisitors = activeAttendances.filter(
                (a) => a.buildingId === b.buildingId
            );
            const activeVisitorsCount = activeVisitors.length;
            const activeVisitorNames = activeVisitors.map((v) => v.visitorName);

            return {
                buildingId: b.buildingId,
                buildingName: b.buildingName,
                createdAt: b.createdAt,
                stationCount,
                activeVisitorsCount,
                activeVisitorNames,
            };
        });

        // 🔔 Emitera uppdatering till alla admins i företaget
        io.to(companyId).emit("latestBuildingsUpdated", buildingData);
        console.log("🏢 latestBuildingsUpdated (light) sent");

        return buildingData;
    } catch (err) {
        console.error("❌ Error emitting latest buildings:", err);
        return [];
    }
}

// ============================================================
// 🔹 POST /api/attendance/attendance-uid (OPTIMERAD)
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

        // 🚀 Skicka attendance event först (snabbast)
        io.to(companyId).emit("attendanceUpdated", attendanceRecord);

        // 🚀 Kör MINIMAL realtime update (bara nödvändiga queries)
        await emitMinimalRealtimeUpdate(
            companyId,
            station.buildingId,
            station.stationId
        );

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
// 🔹 GET /api/attendance/paginated
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

// ============================================================
// 🔹 GET /api/attendance/today (körs vid sida-laddning)
// ============================================================
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

        const {
            formatted,
            currentlyCheckedIn,
            recentAttendance,
            stats,
            FiveLatestBuildings,
        } = result;

        res.json({
            success: true,
            totalCheckIns: formatted.reduce((a, b) => a + b.checkIns, 0),
            totalCheckOuts: formatted.reduce((a, b) => a + b.checkOuts, 0),
            currentlyCheckedIn,
            recentAttendance,
            stats,
            data: formatted,
            latestBuildings: FiveLatestBuildings,
        });
    } catch (err) {
        console.error("❌ Error in getAttendanceToday:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av veckodata",
        });
    }
}
