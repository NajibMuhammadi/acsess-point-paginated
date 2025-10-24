import crypto from "crypto";
import { io } from "../server.js";
import {
    getCompaniesCollection,
    getBuildingsCollection,
    getVisitorsCollection,
    getAttendanceCollection,
    getAlarmsCollection,
} from "../config/db.js";

// ============================================================
// 🚨 Hantera larm (aktivering, loggning, utskick)
// ============================================================
export async function handleAlarm(req, res) {
    try {
        const { buildingId, alarmCode } = req.body;
        const companyId = req.user.companyId;

        if (!buildingId)
            return res
                .status(400)
                .json({ message: "buildingId krävs", success: false });

        if (typeof alarmCode === "undefined")
            return res
                .status(400)
                .json({ message: "alarmCode krävs", success: false });

        const companiesCol = getCompaniesCollection();
        const buildingsCol = getBuildingsCollection();
        const attendanceCol = getAttendanceCollection();
        const visitorsCol = getVisitorsCollection();
        const alarmsCol = getAlarmsCollection();

        const company = await companiesCol.findOne({ companyId });
        if (!company)
            return res
                .status(404)
                .json({ success: false, message: "Företag hittades inte" });

        const building = await buildingsCol.findOne({
            companyId,
            buildingId,
        });
        if (!building)
            return res.status(404).json({
                success: false,
                message: "Byggnad hittades inte",
            });

        console.log(
            `🚨 Larmkod ${alarmCode} aktiverad för byggnad: ${building.buildingName}`
        );

        let fakeMessage;
        switch (alarmCode) {
            case 1:
                fakeMessage =
                    "⚠️ LARM: Ett allmänt larm har aktiverats i byggnaden. Var uppmärksam och invänta instruktioner.";
                break;
            case 2:
                fakeMessage =
                    "🚨 BRANDLARM: Brand har upptäckts i byggnaden. Lämna byggnaden omedelbart och samlas vid uppsamlingsplatsen!";
                break;
            case 3:
                fakeMessage =
                    "☣️ GASLARM: Farlig gas har upptäckts i byggnaden. Lämna byggnaden omedelbart och undvik att andas in rök eller gas!";
                break;
            default:
                fakeMessage =
                    "⚠️ Okänt larm utlöst. Kontrollera situationen omedelbart.";
        }

        const activeAttendances = await attendanceCol
            .find({
                companyId,
                buildingId,
                checkOutTime: { $exists: false },
            })
            .toArray();

        const visitorIds = activeAttendances.map((a) => a.visitorId);
        const visitors = await visitorsCol
            .find({ companyId, visitorId: { $in: visitorIds } })
            .toArray();

        const people = activeAttendances.map((a) => {
            const visitor = visitors.find((v) => v.visitorId === a.visitorId);
            return {
                visitorId: visitor?.visitorId || a.visitorId,
                visitorName:
                    visitor?.visitorName || a.visitorName || "Okänd besökare",
                phoneNumber: visitor?.phoneNumber || "ingen telefon",
            };
        });

        const alarmLog = {
            alarmId: crypto.randomUUID(),
            companyId,
            buildingId,
            buildingName: building.buildingName,
            alarmType: alarmCode,
            message: fakeMessage,
            totalPeople: people.length,
            people,
            createdAt: new Date(),
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
        };

        await alarmsCol.insertOne(alarmLog);

        if (people.length > 0) {
            for (const p of people) {
                console.log(
                    `📲 [FEJK-SMS SKICKAT] till ${p.visitorName} (${p.phoneNumber}): "${fakeMessage}"`
                );
            }
        } else {
            console.log(
                "⚠️ Inga aktiva personer i byggnaden – endast loggat larm."
            );
        }

        // ✅ Skicka alltid realtid
        io.to(companyId).emit("alarmTriggered", {
            ...alarmLog,
            timestamp: new Date().toISOString(),
        });

        return res.status(200).json({
            success: true,
            message: `Larm loggat (${people.length} personer, byggnad: ${building.buildingName})`,
        });
    } catch (err) {
        console.error("💥 Fel vid hantering av larm:", err);
        res.status(500).json({
            success: false,
            message: "Internt fel vid larmhantering",
        });
    }
}

// ============================================================
// 🔍 Hämta alla larm – med pagination
// ============================================================
export async function getPaginatedAlarms(req, res) {
    try {
        const companyId = req.user.companyId;
        const alarmsCol = getAlarmsCollection();

        // 💬 Query-parametrar
        const { page = 1, limit = 25, search = "" } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const query = { companyId };

        // 💬 Sök i text (buildingName, message)
        if (search && search.trim()) {
            query.$or = [
                { buildingName: { $regex: search, $options: "i" } },
                { message: { $regex: search, $options: "i" } },
            ];
        }

        const total = await alarmsCol.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        const alarms = await alarmsCol
            .find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .toArray();

        res.status(200).json({
            success: true,
            alarms,
            total,
            totalPages,
            page: pageNum,
        });
    } catch (err) {
        console.error("💥 Fel vid hämtning av paginerade larm:", err);
        res.status(500).json({
            success: false,
            message: "Internt fel vid hämtning av larm",
        });
    }
}

// ============================================================
// ✅ Kvittera / markera ett larm som läst
// ============================================================
export async function acknowledgeAlarm(req, res) {
    try {
        const { alarmId } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const alarmsCol = getAlarmsCollection();

        if (!alarmId)
            return res
                .status(400)
                .json({ success: false, message: "alarmId krävs" });

        const result = await alarmsCol.updateOne(
            { companyId, alarmId },
            {
                $set: {
                    acknowledged: true,
                    acknowledgedBy: userId,
                    acknowledgedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0)
            return res
                .status(404)
                .json({ success: false, message: "Larm hittades inte" });

        // 🔸 Realtidsuppdatering
        io.to(companyId).emit("alarmAcknowledged", {
            alarmId,
            acknowledgedBy: userId,
            acknowledgedAt: new Date(),
        });

        res.status(200).json({
            success: true,
            message: "Larm markerat som läst",
        });
    } catch (err) {
        console.error("💥 Fel vid uppdatering av larm:", err);
        res.status(500).json({
            success: false,
            message: "Internt fel vid kvittering",
        });
    }
}
export async function getAlarmById(req, res) {
    try {
        const { alarmId } = req.params;
        const companyId = req.user.companyId;

        const alarmsCol = getAlarmsCollection();
        const buildingsCol = getBuildingsCollection();

        // 🔹 Hitta larmet baserat på companyId + alarmId
        const alarm = await alarmsCol.findOne({ companyId, alarmId });
        if (!alarm) {
            return res.status(404).json({
                success: false,
                message: "Larm hittades inte",
            });
        }

        // 🔹 Hämta byggnadsinfo
        const building = await buildingsCol.findOne({
            companyId,
            buildingId: alarm.buildingId,
        });

        const detailedAlarm = {
            ...alarm,
            buildingName: building ? building.buildingName : "Okänd byggnad",
            totalPeople: alarm.totalPeople || 0,
            notes: alarm.notes || [],
            history: alarm.history || [],
        };

        res.status(200).json({
            success: true,
            alarm: detailedAlarm,
        });
    } catch (error) {
        console.error("💥 Fel vid hämtning av larm:", error);
        res.status(500).json({
            success: false,
            message: "Internt fel vid hämtning av larm",
        });
    }
}
