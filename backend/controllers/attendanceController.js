import crypto from "crypto";
import { getCompaniesCollection } from "../config/db.js";
import { io } from "../server.js";

export async function attendance(req, res) {
    // Läs data från frontend
    const { uid, visitorName, phoneNumber, type } = req.body;

    // Validering
    if (!uid?.trim()) {
        return res.status(400).json({ message: "UID krävs" });
    }

    try {
        // connect to DB
        const companiesCol = getCompaniesCollection();
        const now = new Date();

        // Säkerställ att stationen är kopplad till en byggnad
        if (!req.station?.buildingId) {
            return res.status(400).json({
                success: false,
                message: "Stationen är inte kopplad till någon byggnad",
            });
        }

        // Hämta företaget och kontrollera att det finns _id
        const company = await companiesCol.findOne({ _id: req.companyId });
        if (!company) {
            return res.status(404).json({ message: "Företag hittades inte" });
        }

        // Hämta besökare med denna uid från företagets visitors array
        const visitors = company.visitors || [];
        const existingVisitor = visitors.find((v) => v.uid === uid.trim());

        let visitorId;

        // vi skapar ett nytt besökarkort om det inte finns
        if (!existingVisitor) {
            if (!visitorName?.trim() || !phoneNumber?.trim() || !type?.trim()) {
                return res.status(400).json({
                    message:
                        "Ny besökare – visitorName, phoneNumber och type krävs",
                });
            }
            // Skapa ny visitor
            const newVisitor = {
                visitorId: crypto.randomUUID(),
                visitorName: visitorName.trim(),
                phoneNumber: phoneNumber.trim(),
                uid: uid.trim(),
                type: type.trim(),
                createdAt: now,
                lastSeen: now,
            };

            // Spara ny visitor i företaget under visitors array
            await companiesCol.updateOne(
                { _id: company._id },
                {
                    $push: { visitors: newVisitor },
                    $set: { updatedAt: now },
                }
            );

            // Realtidsuppdatering till alla admins i företagsrummet
            io.to(company._id).emit("visitorCreated", newVisitor);
            visitorId = newVisitor.visitorId;
        } else {
            // Uppdatera lastSeen på befintlig visitor
            await companiesCol.updateOne(
                { _id: company._id, "visitors.uid": uid.trim() },
                { $set: { "visitors.$.lastSeen": now } }
            );
            visitorId = existingVisitor.visitorId;
        }
        // Kolla om det finns en öppen attendance för denna uid (checkOutTime saknas)
        const openAttendance = company.attendance?.find(
            (a) => a.uid === uid.trim() && !a.checkOutTime
        );

        let attendanceRecord;

        if (openAttendance) {
            // 👉 Uppdatera med checkOutTime
            attendanceRecord = {
                ...openAttendance,
                checkOutTime: now,
            };

            await companiesCol.updateOne(
                {
                    _id: company._id,
                    "attendance.attendanceId": openAttendance.attendanceId,
                },
                { $set: { "attendance.$.checkOutTime": now } }
            );
        } else {
            // 👉 Skapa ny attendance med checkInTime
            attendanceRecord = {
                attendanceId: crypto.randomUUID(),
                uid: uid.trim(),
                visitorId,
                visitorName: existingVisitor?.visitorName,
                stationId: req.station.stationId,
                buildingId: req.station.buildingId,
                checkInTime: now,
                checkOutTime: null,
                timestamp: now, // behåll timestamp om du vill
            };

            await companiesCol.updateOne(
                { _id: company._id },
                { $push: { attendance: attendanceRecord } }
            );
        }

        // Realtidsuppdatering till alla admins i företagsrummet
        io.to(company._id).emit("attendanceUpdated", attendanceRecord);

        return res.json({
            success: true,
            message: "Attendance registrerad",
            attendance: attendanceRecord,
        });
    } catch (err) {
        console.error("Attendance error:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}
