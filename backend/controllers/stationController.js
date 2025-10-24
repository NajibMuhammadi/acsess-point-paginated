import crypto from "crypto";
import { io } from "../server.js";
import {
    getStationsCollection,
    getCompaniesCollection,
    getBuildingsCollection,
    getAttendanceCollection,
} from "../config/db.js";
import jwt from "jsonwebtoken";

/* =======================================================
   🔄 HELPER: Uppdatera dashboard stats
   ======================================================= */
async function emitDashboardStats(companyId) {
    try {
        const stationsCol = getStationsCollection();
        const buildingsCol = getBuildingsCollection();
        const attendanceCol = getAttendanceCollection();

        const [allStations, allBuildings, currentlyCheckedInResult] =
            await Promise.all([
                stationsCol.find({ companyId }).toArray(),
                buildingsCol.find({ companyId }).toArray(),
                attendanceCol
                    .aggregate([
                        { $match: { companyId, checkOutTime: null } },
                        { $count: "total" },
                    ])
                    .toArray(),
            ]);

        const totalStations = allStations.length;
        const activeStations = allStations.filter(
            (s) => s.buildingId !== null && s.buildingId !== undefined
        ).length;
        const onlineStations = allStations.filter(
            (s) => s.status === "online" || s.isOnline === true
        ).length;
        const totalBuildings = allBuildings.length;
        const currentlyCheckedIn = currentlyCheckedInResult[0]?.total || 0;

        const stats = {
            totalBuildings,
            totalStations,
            activeStations,
            onlineStations,
            currentlyCheckedIn,
        };

        io.to(companyId).emit("dashboardStatsUpdated", stats);
        console.log("📈 Dashboard stats updated:", stats);

        return stats;
    } catch (err) {
        console.error("❌ Error emitting dashboard stats:", err);
        return null;
    }
}

/* =======================================================
   🏗️ CREATE STATION (per företag)
   ======================================================= */
export async function createStation(req, res) {
    try {
        const { stationName } = req.body;

        if (!stationName?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Stationsnamn krävs" });
        }

        const userCompanyId = req.user.companyId;
        const companiesCol = getCompaniesCollection();
        const stationsCol = getStationsCollection();

        const company = await companiesCol.findOne({
            companyId: userCompanyId,
        });
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Företag hittades inte" });
        }

        const existing = await stationsCol.findOne({
            companyId: userCompanyId,
            stationName: { $regex: `^${stationName.trim()}$`, $options: "i" },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "En station med detta namn finns redan i företaget",
            });
        }

        const newStation = {
            stationId: crypto.randomUUID(),
            companyId: userCompanyId,
            stationName: stationName.trim(),
            secret: crypto.randomBytes(32).toString("hex"),
            createdAt: new Date(),
            updatedAt: new Date(),
            isApproved: false,
            isOnline: false,
            lastActive: null,
            buildingId: null,
        };

        await stationsCol.insertOne(newStation);

        // 🔔 Realtidsuppdateringar
        io.to(userCompanyId).emit("stationCreated", newStation);
        await emitDashboardStats(userCompanyId); // 🟢 Uppdatera stats

        res.json({
            success: true,
            message: `Station "${stationName}" skapades`,
            station: newStation,
        });
    } catch (err) {
        console.error("❌ Error creating station:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid skapande av station",
        });
    }
}

/* =======================================================
   📄 HÄMTA ALLA STATIONER (med pagination/sökning/sortering)
   ======================================================= */
export async function getAllStations(req, res) {
    try {
        const companyId = req.user.companyId;
        const stationsCol = getStationsCollection();

        const { page = 1, limit = 25, search = "", sort = "desc" } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = sort === "asc" ? 1 : -1;

        const matchStage = { companyId };

        if (search.trim()) {
            matchStage.stationName = { $regex: search.trim(), $options: "i" };
        }

        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: sortOrder } },
            { $skip: skip },
            { $limit: limitNum },

            {
                $lookup: {
                    from: "buildings",
                    let: { bId: "$buildingId", cId: "$companyId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$buildingId", "$$bId"] },
                                        { $eq: ["$companyId", "$$cId"] },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                buildingId: 1,
                                buildingName: 1,
                            },
                        },
                    ],
                    as: "building",
                },
            },

            {
                $addFields: {
                    buildingName: {
                        $cond: [
                            { $gt: [{ $size: "$building" }, 0] },
                            { $arrayElemAt: ["$building.buildingName", 0] },
                            null,
                        ],
                    },
                },
            },

            {
                $lookup: {
                    from: "attendance",
                    let: { sId: "$stationId", cId: "$companyId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$stationId", "$$sId"] },
                                        { $eq: ["$companyId", "$$cId"] },
                                        { $eq: ["$checkOutTime", null] },
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
                $lookup: {
                    from: "attendance",
                    let: { sId: "$stationId", cId: "$companyId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$stationId", "$$sId"] },
                                        { $eq: ["$companyId", "$$cId"] },
                                        {
                                            $gte: [
                                                "$checkInTime",
                                                new Date(
                                                    new Date().setHours(
                                                        0,
                                                        0,
                                                        0,
                                                        0
                                                    )
                                                ),
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
                    as: "todayCheckIns",
                },
            },

            {
                $addFields: {
                    activeVisitorsCount: { $size: "$activeVisitors" },
                    todayCheckInCount: { $size: "$todayCheckIns" },
                    activeVisitorNames: "$activeVisitors.visitorName",
                },
            },

            {
                $project: {
                    _id: 0,
                    stationId: 1,
                    stationName: 1,
                    isApproved: 1,
                    isOnline: 1,
                    buildingId: 1,
                    buildingName: 1,
                    createdAt: 1,
                    lastActive: 1,
                    activeVisitorsCount: 1,
                    todayCheckInCount: 1,
                    activeVisitorNames: 1,
                },
            },
        ];

        const [stations, total] = await Promise.all([
            stationsCol.aggregate(pipeline).toArray(),
            stationsCol.countDocuments(matchStage),
        ]);

        console.log("✅ [getAllStations] Stationer hittade:", stations.length);
        stations.forEach((s) => {
            console.log(
                `📍 ${s.stationName} → ${s.activeVisitorsCount} aktiva besökare`,
                s.activeVisitorNames?.length ? s.activeVisitorNames : "🕳️ inga"
            );
        });

        res.json({
            success: true,
            stations,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("❌ Error fetching stations:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av stationer",
        });
    }
}

/* =======================================================
   🔁 FLYTTA STATION TILL / FRÅN BYGGNAD
   ======================================================= */
export async function moveStation(req, res) {
    try {
        const { stationId } = req.params;
        const { buildingId } = req.body;
        const companyId = req.user.companyId;

        const stationsCol = getStationsCollection();
        const buildingsCol = getBuildingsCollection();
        const companiesCol = getCompaniesCollection();

        const company = await companiesCol.findOne({ companyId });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Företaget hittades inte",
            });
        }

        const station = await stationsCol.findOne({ companyId, stationId });
        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Station hittades inte i detta företag",
            });
        }

        let buildingName = null;
        if (buildingId?.trim()) {
            const building = await buildingsCol.findOne({
                companyId,
                buildingId: buildingId.trim(),
            });
            if (!building) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Byggnaden hittades inte eller tillhör ett annat företag",
                });
            }
            buildingName = building.buildingName;
        }

        const updateQuery = buildingId?.trim()
            ? { $set: { buildingId: buildingId.trim(), updatedAt: new Date() } }
            : { $unset: { buildingId: "" }, $set: { updatedAt: new Date() } };

        const result = await stationsCol.updateOne(
            { companyId, stationId },
            updateQuery
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station hittades inte",
            });
        }

        const updatedStation = await stationsCol.findOne({
            companyId,
            stationId,
        });

        // 🔔 Realtidsuppdateringar
        io.to(companyId).emit("stationMoved", {
            stationId,
            buildingId: buildingId?.trim() || null,
            buildingName: buildingName || null,
        });
        await emitDashboardStats(companyId); // 🟢 Uppdatera stats

        res.json({
            success: true,
            message: buildingId
                ? `Station kopplad till byggnaden "${buildingName}"`
                : "Station bortkopplad från byggnad",
            station: updatedStation,
        });
    } catch (err) {
        console.error("❌ Error moving station:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid flytt av station",
        });
    }
}

export async function getAllStationsUnpaginated(req, res) {
    try {
        const companyId = req.user.companyId;
        const stationsCol = getStationsCollection();

        const stations = await stationsCol
            .find({ companyId })
            .project({
                _id: 0,
                stationId: 1,
                stationName: 1,
                createdAt: 1,
                buildingId: 1,
                isApproved: 1,
                isOnline: 1,
            })
            .toArray();

        const totalStations = stations.length;
        const activeStations = stations.filter((s) => !!s.buildingId).length;
        const inactiveStations = totalStations - activeStations;

        res.json({
            success: true,
            totalStations,
            activeStations,
            inactiveStations,
            stations,
        });
    } catch (err) {
        console.error("❌ Error fetching all stations:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av stationer",
        });
    }
}

/* =======================================================
   🗑️ TA BORT STATION
   ======================================================= */
export async function deleteStation(req, res) {
    try {
        const { stationId } = req.params;
        const userCompanyId = req.user.companyId;
        const stationsCol = getStationsCollection();

        const result = await stationsCol.deleteOne({
            companyId: userCompanyId,
            stationId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station hittades inte",
            });
        }

        // 🔔 Realtidsuppdateringar
        io.to(userCompanyId).emit("stationDeleted", { stationId });
        await emitDashboardStats(userCompanyId); // 🟢 Uppdatera stats

        res.json({
            success: true,
            message: "Station raderad",
        });
    } catch (err) {
        console.error("❌ Error deleting station:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid borttagning av station",
        });
    }
}

export async function registerStationFirstTime(req, res) {
    try {
        const { stationId, secret } = req.body;
        if (!stationId || !secret)
            return res
                .status(400)
                .json({ message: "stationId och secret krävs" });

        const stationsCol = getStationsCollection();
        const station = await stationsCol.findOne({ stationId });
        if (!station)
            return res.status(404).json({ message: "Station hittades inte" });

        if (station.secret !== secret)
            return res.status(401).json({ message: "Ogiltig nyckel" });

        if (!station.isApproved)
            return res
                .status(403)
                .json({ message: "Stationen är inte godkänd ännu" });

        if (!station.buildingId) {
            return res.status(403).json({
                message: "Stationen är inte kopplad till någon byggnad",
            });
        }

        if (station.activeToken) {
            return res.status(403).json({
                success: false,
                message: "Stationen är redan inloggad på en annan enhet.",
            });
        }

        const token = jwt.sign(
            {
                stationId,
                companyId: station.companyId,
                type: "device",
            },
            process.env.JWT_SECRET
        );

        await stationsCol.updateOne(
            { stationId },
            { $set: { activeToken: token } }
        );

        res.json({ success: true, token });
    } catch (err) {
        console.error("Register station error:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

/* =======================================================
   ✅ GODKÄNN ELLER AVAKTIVERA STATION
   ======================================================= */
export async function updateStationApproval(req, res) {
    try {
        const { stationId } = req.params;
        const { isApproved } = req.body;
        const userCompanyId = req.user.companyId;

        if (typeof isApproved !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isApproved måste vara true eller false",
            });
        }

        const stationsCol = getStationsCollection();
        const result = await stationsCol.updateOne(
            { companyId: userCompanyId, stationId },
            { $set: { isApproved, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station hittades inte",
            });
        }

        io.to(userCompanyId).emit("stationApprovalUpdated", {
            stationId,
            isApproved,
        });

        res.json({
            success: true,
            message: isApproved
                ? "Station godkänd framgångsrikt"
                : "Station avaktiverad framgångsrikt",
        });
    } catch (err) {
        console.error("Error updating station approval:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

/* =======================================================
   💓 HEARTBEAT - håller stationer online
   ======================================================= */
export async function heartbeat(req, res) {
    try {
        const { stationId, companyId } = req;
        const stationsCol = getStationsCollection();
        const now = new Date();

        await stationsCol.updateOne(
            { companyId, stationId },
            { $set: { lastPing: now, isOnline: true } }
        );

        io.to(companyId).emit("stationStatusUpdated", {
            stationId,
            isOnline: true,
            lastPing: now,
        });

        res.json({ success: true, message: "Heartbeat mottaget", time: now });
    } catch (err) {
        console.error("❌ heartbeat error:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

/* =======================================================
   🕒 HEARTBEAT MONITOR (kollar offline stationer)
   ======================================================= */
let monitorRunning = false;
export function startHeartbeatMonitor() {
    if (monitorRunning) return;
    monitorRunning = true;

    setInterval(async () => {
        try {
            const stationsCol = getStationsCollection();
            const now = Date.now();
            const TIMEOUT = 20000; // 20 sekunder

            const onlineStations = await stationsCol
                .find({ isOnline: true })
                .toArray();

            for (const s of onlineStations) {
                if (!s.lastPing) continue;

                const diff = now - new Date(s.lastPing).getTime();
                if (diff > TIMEOUT) {
                    await stationsCol.updateOne(
                        { stationId: s.stationId },
                        {
                            $set: {
                                isOnline: false,
                                updatedAt: new Date(),
                            },
                        }
                    );

                    io.to(s.companyId).emit("stationStatusUpdated", {
                        stationId: s.stationId,
                        isOnline: false,
                        lastPing: s.lastPing,
                    });

                    console.log(
                        `🔻 Station ${s.stationId} markerad offline (${diff} ms sedan senaste ping)`
                    );
                }
            }
        } catch (err) {
            console.error("❌ Heartbeat monitor error:", err);
        }
    }, 15000);
}
