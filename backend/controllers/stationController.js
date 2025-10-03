import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getCompaniesCollection } from "../config/db.js";
import { io } from "../server.js";

export async function createStation(req, res) {
    try {
        const { stationName } = req.body;

        if (!stationName?.trim()) {
            return res.status(400).json({ message: "Stationsnamn krävs" });
        }

        const userCompanyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({ _id: userCompanyId });

        if (!company) {
            return res.status(404).json({ message: "Företag hittades inte" });
        }

        if (
            (company.stations || []).some(
                (s) =>
                    s?.stationName?.toLowerCase() ===
                    stationName.trim().toLowerCase()
            )
        ) {
            return res
                .status(400)
                .json({ message: "Station med detta namn finns redan" });
        }

        const station = {
            stationId: crypto.randomUUID(),
            stationName: stationName.trim(),
            secret: crypto.randomBytes(32).toString("hex"),
            isApproved: false,
            createdAt: new Date(),
        };

        await companiesCol.updateOne(
            { _id: userCompanyId },
            { $push: { stations: station }, $set: { updatedAt: new Date() } }
        );

        io.to(company._id).emit("stationCreated", station);

        res.json({
            success: true,
            message: "Station skapad",
            stationId: station.stationId,
            stationName: station.stationName,
            secret: station.secret,
        });
    } catch (err) {
        console.error("Error creating station:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

export async function moveStation(req, res) {
    try {
        const { stationId } = req.params;
        const { buildingId } = req.body;
        const userCompanyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();

        // Om buildingId är satt, kontrollera att byggnaden finns i företaget och att stationen inte redan finns kopplad till den
        const updateQuery = buildingId?.trim()
            ? { $set: { "stations.$.buildingId": buildingId.trim() } }
            : { $unset: { "stations.$.buildingId": "" } };

        const result = await companiesCol.updateOne(
            { _id: userCompanyId, "stations.stationId": stationId.trim() },
            updateQuery
        );

        if (result.matchedCount === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Station hittades inte" });
        }

        // 🔥 Realtidsuppdatering
        io.to(userCompanyId).emit("stationMoved", {
            stationId,
            buildingId: buildingId || null,
        });

        res.json({
            success: true,
            message: buildingId
                ? "Station kopplad till byggnad"
                : "Station bortkopplad från byggnad",
        });
    } catch (err) {
        console.error("Error moving station:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}

export async function registerStationFirstTime(req, res) {
    try {
        const { stationId, secret } = req.body;
        if (!stationId || !secret)
            return res
                .status(400)
                .json({ message: "stationId och secret krävs" });

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({
            "stations.stationId": stationId,
        });
        if (!company)
            return res.status(404).json({ message: "Station hittades inte" });

        const station = company.stations.find((s) => s.stationId === stationId);

        if (!station || station.secret !== secret)
            return res
                .status(401)
                .json({ message: "Ogiltig station eller nyckel" });

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
            { stationId, companyId: company._id.toString(), type: "device" },
            process.env.JWT_SECRET
        );

        // ✅ Spara activeToken för stationen
        await companiesCol.updateOne(
            { _id: company._id, "stations.stationId": stationId },
            { $set: { "stations.$.activeToken": token } }
        );

        res.json({ success: true, token });
    } catch (err) {
        console.error("Register station error:", err);
        res.status(500).json({ success: false, message: "Serverfel" });
    }
}
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

        const companiesCol = getCompaniesCollection();
        const result = await companiesCol.updateOne(
            { _id: userCompanyId, "stations.stationId": stationId.trim() },
            { $set: { "stations.$.isApproved": isApproved } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Station hittades inte",
            });
        }

        // 🔥 Realtidsuppdatering
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
