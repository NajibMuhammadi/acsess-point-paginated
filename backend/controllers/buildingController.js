import crypto from "crypto";
import { io } from "../server.js";
import {
    getBuildingsCollection,
    getCompaniesCollection,
    getStationsCollection,
    getAttendanceCollection,
} from "../config/db.js";

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
   🏗️ SKAPA BYGGNAD
   ======================================================= */
export async function createBuilding(req, res) {
    try {
        const { buildingName } = req.body;

        if (!buildingName?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Byggnadsnamn krävs" });
        }

        const userCompanyId = req.user.companyId;
        const companiesCol = getCompaniesCollection();
        const buildingsCol = getBuildingsCollection();

        const company = await companiesCol.findOne({
            companyId: userCompanyId,
        });
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Företag hittades inte" });
        }

        const existing = await buildingsCol.findOne({
            companyId: userCompanyId,
            buildingName: { $regex: `^${buildingName.trim()}$`, $options: "i" },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Byggnad med detta namn finns redan",
            });
        }

        const newBuilding = {
            buildingId: crypto.randomUUID(),
            companyId: userCompanyId,
            buildingName: buildingName.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await buildingsCol.insertOne(newBuilding);

        // 🔔 Skicka realtidsuppdateringar
        io.to(userCompanyId).emit("buildingCreated", newBuilding);
        await emitDashboardStats(userCompanyId); // 🟢 Uppdatera stats

        res.json({
            success: true,
            message: "Byggnad skapad",
            building: newBuilding,
        });
    } catch (err) {
        console.error("❌ Error creating building:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid skapande av byggnad",
        });
    }
}

/* =======================================================
   📄 HÄMTA BYGGNADER (med pagination)
   ======================================================= */
export async function getAllBuildings(req, res) {
    try {
        const buildingsCol = getBuildingsCollection();
        const companyId = req.user.companyId;

        const { page = 1, limit = 25, search = "", sort = "desc" } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = sort === "asc" ? 1 : -1;

        const matchStage = { companyId };

        if (search.trim()) {
            matchStage.buildingName = { $regex: search.trim(), $options: "i" };
        }

        console.log("🏢 [getAllBuildings] companyId:", companyId);
        console.log("🔎 matchStage:", matchStage);
        console.log("📄 page:", pageNum, "limit:", limitNum);

        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: sortOrder } },
            { $skip: skip },
            { $limit: limitNum },

            {
                $lookup: {
                    from: "stations",
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
                                stationId: 1,
                                stationName: 1,
                                isApproved: 1,
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
                                        { $eq: ["$buildingId", "$$bId"] },
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
        ];

        const [buildings, total] = await Promise.all([
            buildingsCol.aggregate(pipeline).toArray(),
            buildingsCol.countDocuments(matchStage),
        ]);

        console.log(
            "✅ [getAllBuildings] Byggnader hittade:",
            buildings.length
        );
        buildings.forEach((b) => {
            console.log(
                `🏠 ${b.buildingName} → ${b.activeVisitorsCount} aktiva besökare`,
                b.activeVisitorNames?.length ? b.activeVisitorNames : "🕳️ inga"
            );
        });

        res.json({
            success: true,
            buildings,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("❌ Error fetching buildings:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av byggnader",
        });
    }
}

/* =======================================================
   📄 HÄMTA BYGGNAD UTAN SIDNUMRERING
   ======================================================= */
export async function getAllBuildingsUnpaginated(req, res) {
    try {
        const companyId = req.user.companyId;
        const buildingsCol = getBuildingsCollection();

        const buildings = await buildingsCol
            .find({ companyId })
            .project({
                _id: 0,
                buildingId: 1,
                buildingName: 1,
                createdAt: 1,
            })
            .toArray();

        res.json({ success: true, total: buildings.length, buildings });
    } catch (err) {
        console.error("❌ Error fetching all buildings:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

/* =======================================================
   🗑️ TA BORT BYGGNAD
   ======================================================= */
export async function deleteBuilding(req, res) {
    try {
        const { buildingId } = req.params;
        const userCompanyId = req.user.companyId;
        const buildingsCol = getBuildingsCollection();

        const result = await buildingsCol.deleteOne({
            companyId: userCompanyId,
            buildingId,
        });

        if (result.deletedCount === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Byggnad hittades inte" });
        }

        // 🔔 Skicka realtidsuppdateringar
        io.to(userCompanyId).emit("buildingDeleted", { buildingId });
        await emitDashboardStats(userCompanyId); // 🟢 Uppdatera stats

        res.json({ success: true, message: "Byggnad raderad" });
    } catch (err) {
        console.error("❌ Error deleting building:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid radering",
        });
    }
}
