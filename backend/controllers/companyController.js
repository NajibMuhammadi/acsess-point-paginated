import crypto from "crypto";
import { getCompaniesCollection } from "../config/db.js";

// 🏢 Skapa nytt företag
export async function createCompany(req, res) {
    try {
        const { companyName } = req.body;

        if (!companyName?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Företagsnamn krävs" });
        }

        const companiesCol = getCompaniesCollection();

        // 🔍 Kontrollera om företaget redan finns
        const existing = await companiesCol.findOne({
            companyName: { $regex: `^${companyName.trim()}$`, $options: "i" },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Det finns redan ett företag med detta namn",
            });
        }

        // 🔑 Generera unik registreringsnyckel (ex: SERIMA-AB12CD)
        const registrationKey = `${companyName
            .replace(/\s+/g, "")
            .substring(0, 5)
            .toUpperCase()}-${crypto
            .randomBytes(3)
            .toString("hex")
            .toUpperCase()}`;

        const newCompany = {
            companyId: crypto.randomUUID(),
            companyName: companyName.trim(),
            registrationKey,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // 💾 Spara i databasen
        const result = await companiesCol.insertOne(newCompany);

        res.status(201).json({
            success: true,
            message: `Företaget "${companyName}" skapades`,
            company: newCompany,
        });
    } catch (error) {
        console.error("❌ Error creating company:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid skapande av företag",
        });
    }
}
