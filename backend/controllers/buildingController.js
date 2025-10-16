import crypto from "crypto";
import { getCompaniesCollection } from "../config/db.js";
import { io } from "../server.js";

export async function createBuilding(req, res) {
    try {
        const { buildingName } = req.body;

        if (!buildingName?.trim()) {
            return res.status(400).json({ message: "Byggnadsnamn krävs" });
        }

        const userCompanyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({ _id: userCompanyId });

        if (!company) {
            return res.status(404).json({ message: "Företag hittades inte" });
        }

        // Kontrollera att det inte finns en byggnad med samma namn redan
        if (
            (company.buildings || []).some(
                (b) =>
                    b?.buildingName?.toLowerCase() ===
                    buildingName.trim().toLowerCase()
            )
        ) {
            return res
                .status(400)
                .json({ message: "Byggnad med detta namn finns redan" });
        }

        const building = {
            buildingId: crypto.randomUUID(),
            buildingName: buildingName.trim(),
            createdAt: new Date(),
        };

        await companiesCol.updateOne(
            { _id: userCompanyId },
            {
                $push: { buildings: building },
                $set: { updatedAt: new Date() },
            }
        );

        io.to(userCompanyId).emit("buildingCreated", building);

        res.json({
            success: true,
            message: "Byggnad skapad",
            building,
        });
    } catch (error) {
        console.error("Error creating building:", error);
        res.status(500).json({ success: false, message: "Ett fel inträffade" });
    }
}

export async function getAllStationsAndBuildings(req, res) {
    try {
        const userCompanyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({
            _id: userCompanyId,
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Företag hittades inte",
            });
        }

        console.log(
            `✅ ${req.user.role} ${req.user.name} fetched stations and buildings for ${company.companyName}`
        );

        io.to(userCompanyId).emit("stationsAndBuildingsFetched");

        res.json({
            success: true,
            stations: company.stations || [],
            buildings: company.buildings || [],
            attendances: company.attendance || [],
            visitors: company.visitors || [],
            company: {
                name: company.companyName,
                id: company._id,
            },
        });
    } catch (error) {
        console.error("Error fetching stations and buildings:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av data",
        });
    }
}

export async function getBuildingDetails(req, res) {
    try {
        const { buildingId } = req.params;
        const userCompanyId = req.user.companyId;

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({ _id: userCompanyId });

        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Företag hittades inte" });
        }

        const building = (company.buildings || []).find(
            (b) => b.buildingId === buildingId
        );
        if (!building) {
            return res
                .status(404)
                .json({ success: false, message: "Byggnad hittades inte" });
        }

        // Filtrera attendances för byggnaden
        const buildingAttendances = (company.attendance || []).filter(
            (a) => a.buildingId === buildingId
        );

        // Ta fram unika visitors som har skannat i byggnaden
        const visitorIds = [
            ...new Set(buildingAttendances.map((a) => a.visitorId)),
        ];

        const activeVisitors = visitorIds.map((visitorId) => {
            const visitor = (company.visitors || []).find(
                (v) => v.visitorId === visitorId
            );
            return {
                visitorId,
                visitorName: visitor?.visitorName || "Okänd besökare",
                phoneNumber: visitor?.phoneNumber || "",
                lastSeen: visitor?.lastSeen,
            };
        });

        res.json({
            success: true,
            building: {
                buildingId: building.buildingId,
                buildingName: building.buildingName,
            },
            totalVisitors: activeVisitors.length,
            activeVisitors,
        });
    } catch (error) {
        console.error("Error fetching building details:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid byggnadsdetaljer",
        });
    }
}
export async function deleteBuilding(req, res) {
    try {
        const { buildingId } = req.params;
        const userCompanyId = req.user.companyId;
        const companiesCol = getCompaniesCollection();

        // Hämta företaget
        const company = await companiesCol.findOne({ _id: userCompanyId });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Företag hittades inte",
            });
        }

        // Hitta byggnaden
        const building = (company.buildings || []).find(
            (b) => b.buildingId === buildingId
        );
        if (!building) {
            return res.status(404).json({
                success: false,
                message: "Byggnad hittades inte",
            });
        }

        // Kolla om byggnaden har stationer kopplade till sig
        const stations = (company.stations || []).filter(
            (s) => s.buildingId === buildingId
        );

        if (stations.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Building has stations associated with it. Please remove the stations first.",
            });
        }

        // Radera byggnaden
        await companiesCol.updateOne(
            { _id: userCompanyId },
            {
                $pull: { buildings: { buildingId } },
                $set: { updatedAt: new Date() },
            }
        );

        // Ta bort attendances kopplade till byggnaden
        await companiesCol.updateOne(
            { _id: userCompanyId },
            {
                $pull: { attendance: { buildingId } },
                $set: { updatedAt: new Date() },
            }
        );

        io.to(userCompanyId).emit("buildingDeleted", { buildingId });

        return res.status(200).json({
            success: true,
            message: "Byggnaden har tagits bort.",
        });
    } catch (error) {
        console.error("Error deleting building:", error);
        return res.status(500).json({
            success: false,
            message: "Ett fel inträffade vid borttagning av byggnad.",
        });
    }
}
