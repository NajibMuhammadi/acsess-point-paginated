import { getCompaniesCollection } from "../config/db.js";
import { io } from "../server.js";
import crypto from "crypto";

export async function handleAlarm(req, res) {
    try {
        const { buildingId, alarmCode } = req.body;

        if (!buildingId) {
            return res
                .status(400)
                .json({ message: "buildingId is required", success: false });
        }

        if (typeof alarmCode === "undefined") {
            return res
                .status(400)
                .json({ message: "alarmCode is required", success: false });
        }

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({
            "buildings.buildingId": buildingId,
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Ingen byggnad hittades",
            });
        }

        // Hitta byggnaden i företaget
        const building = company.buildings.find(
            (b) => b.buildingId === buildingId
        );

        console.log(
            `🚨 Larmkod ${alarmCode} aktiverad för byggnad: ${
                building?.buildingName || buildingId
            }`
        );

        // Bestäm meddelandet beroende på alarmCode
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

        // Filtrera fram de som är incheckade i byggnaden just nu
        const activeAttendances = (company.attendance || []).filter(
            (a) =>
                a.buildingId === buildingId && a.checkInTime && !a.checkOutTime // fortfarande incheckade
        );

        const alarmLog = {
            alarmId: crypto.randomUUID(),
            buildingId,
            buildingName: building?.buildingName || "Okänd byggnad",
            alarmType: alarmCode,
            message: fakeMessage,
            totalPeople: activeAttendances.length,
            people: activeAttendances.map((a) => {
                const visitor = company.visitors.find(
                    (v) => v.visitorId === a.visitorId
                );
                return {
                    visitorId: visitor?.visitorId || a.visitorId,
                    visitorName:
                        visitor?.visitorName || a.visitorName || "Okänd",
                    phoneNumber: visitor?.phoneNumber || "ingen telefon",
                };
            }),
            createdAt: new Date(),
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
        };

        if (activeAttendances.length === 0) {
            await companiesCol.updateOne(
                { _id: company._id },
                { $push: { alarms: alarmLog } }
            );

            io.emit("alarmTriggered", {
                alarmId: alarmLog.alarmId,
                buildingId,
                buildingName: building?.buildingName || "Okänd byggnad",
                alarmType: alarmCode,
                message: fakeMessage,
                totalPeople: 0,
                timestamp: new Date().toISOString(),
            });

            return res.status(200).json({
                success: true,
                message: "Inga aktiva personer i byggnaden (larm loggat)",
            });
        }

        // Skapa fejk-SMS och logga
        for (const a of activeAttendances) {
            const visitor = company.visitors.find(
                (v) => v.visitorId === a.visitorId
            );

            const phone = visitor?.phoneNumber || "ingen telefon";
            const name = a.visitorName || "Okänd person";

            console.log(
                `📲 [FEJK-SMS SKICKAT] till ${name} (${phone}): "${fakeMessage}"`
            );
        }

        await companiesCol.updateOne(
            { _id: company._id },
            { $push: { alarms: alarmLog } }
        );

        console.log("📡 Skickar larm till alla klienter...");
        io.emit("alarmTriggered", {
            alarmId: alarmLog.alarmId,
            buildingId,
            buildingName: building?.buildingName || "Okänd byggnad",
            alarmType: alarmCode,
            message: fakeMessage,
            totalPeople: activeAttendances.length,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: `Fejk-SMS skickat till ${activeAttendances.length} personer i byggnaden (se loggar)`,
            alarmType: alarmCode,
        });
    } catch (err) {
        console.error("💥 Fel vid hantering av larm:", err);
        res.status(500).json({
            success: false,
            message: "Internt fel vid larmhantering",
        });
    }
}

export async function getAllAlarms(req, res) {
    try {
        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({ _id: req.user.companyId });

        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Företag hittades inte" });
        }

        const alarms = company.alarms || [];
        res.status(200).json({ success: true, alarms });
    } catch (err) {
        console.error("💥 Fel vid hämtning av larm:", err);
        res.status(500).json({
            success: false,
            message: "Internt fel vid hämtning av larm",
        });
    }
}

export async function acknowledgeAlarm(req, res) {
    try {
        const { alarmId } = req.body;
        if (!alarmId)
            return res.status(400).json({
                success: false,
                message: "alarmId krävs",
            });

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({ _id: req.user.companyId });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Företag hittades inte",
            });

        const result = await companiesCol.updateOne(
            { _id: company._id, "alarms.alarmId": alarmId },
            {
                $set: {
                    "alarms.$.acknowledged": true,
                    "alarms.$.acknowledgedBy": req.user.userId,
                    "alarms.$.acknowledgedAt": new Date(),
                },
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Larm hittades inte",
            });
        }

        // 🔥 Skicka realtidsuppdatering till alla admins i samma företag
        io.to(req.user.companyId.toString()).emit("alarmAcknowledged", {
            alarmId,
            acknowledgedBy: req.user.userId,
            acknowledgedAt: new Date(),
        });

        res.status(200).json({
            success: true,
            message: "Larm markerat som läst",
        });
    } catch (err) {
        console.error("💥 Fel vid uppdatering av larm:", err);
        res.status(500).json({ success: false, message: "Internt fel" });
    }
}

export async function getAlarmById(req, res) {
    try {
        const { alarmId } = req.params;
        const companyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne(
            { _id: companyId, "alarms.alarmId": alarmId },
            { projection: { "alarms.$": 1, buildings: 1 } } // 🟢 lägg till buildings här
        );

        if (!company || !company.alarms || company.alarms.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Alarm not found",
            });
        }

        const alarm = company.alarms[0];

        // 🔹 Nu funkar detta eftersom company.buildings finns
        const building = (company.buildings || []).find(
            (b) => b.buildingId === alarm.buildingId
        );

        const detailedAlarm = {
            ...alarm,
            buildingName: building ? building.buildingName : "Unknown",
            totalPeople: alarm.totalPeople || 0,
            notes: alarm.notes || [],
            history: alarm.history || [],
        };

        return res.status(200).json({
            success: true,
            alarm: detailedAlarm,
        });
    } catch (error) {
        console.error("❌ getAlarmById error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
