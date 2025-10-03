import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getCompaniesCollection } from "../config/db.js";

export async function registerUser(req, res) {
    try {
        const { registrationKey, name, email, password } = req.body;

        if (!registrationKey?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Registreringsnyckel krävs" });
        }
        if (!name?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Namn krävs" });
        }
        if (!email?.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "E-post krävs" });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Lösenord med minst 6 tecken krävs",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res
                .status(400)
                .json({ success: false, message: "Ogiltig e-postadress" });

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({
            registrationKey: registrationKey.trim(),
        });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Ogiltig registreringsnyckel",
            });

        // 🔑 Backend bestämmer roll
        let assignedRole = "firestation";
        let isApproved = false;
        if (!company.users || company.users.length === 0) {
            // första användaren i företaget blir admin
            assignedRole = "admin";
            isApproved = true;
        }

        // Kontrollera unik e-post
        const exists = company.users?.find(
            (u) => u.email.toLowerCase() === email.toLowerCase().trim()
        );
        if (exists)
            return res.status(400).json({
                success: false,
                message:
                    "Denna e-post används redan av en användare i företaget",
            });

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = {
            userId: crypto.randomUUID(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            role: assignedRole,
            isApproved,
            createdAt: new Date(),
            lastLogin: null,
        };

        await companiesCol.updateOne(
            { _id: company._id },
            { $push: { users: newUser }, $set: { updatedAt: new Date() } }
        );

        res.json({
            success: true,
            message: `Användare "${name}" registrerad som ${assignedRole}`,
            user: {
                userId: newUser.userId,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                isApproved: newUser.isApproved,
                companyName: company.companyName,
            },
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid registrering",
        });
    }
}

export async function loginUser(req, res) {
    try {
        const { registrationKey, email, password } = req.body;

        if (!registrationKey?.trim() || !email?.trim() || !password)
            return res
                .status(400)
                .json({ success: false, message: "Alla fält krävs" });

        const companiesCol = getCompaniesCollection();
        const company = await companiesCol.findOne({
            registrationKey: registrationKey.trim(),
        });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Ogiltig registreringsnyckel",
            });

        // Hämta användaren (oavsett roll)
        const user = company.users?.find(
            (u) => u.email.toLowerCase() === email.toLowerCase().trim()
        );
        if (!user)
            return res.status(401).json({
                success: false,
                message: "Ogiltiga inloggningsuppgifter",
            });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({
                success: false,
                message: "Ogiltiga inloggningsuppgifter",
            });

        // 🔒 Kolla godkännande för stationer
        if (user.role === "firestation" && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message:
                    "Detta konto måste godkännas av en administratör innan inloggning är möjlig.",
            });
        }

        // Uppdatera senaste inloggning
        await companiesCol.updateOne(
            { _id: company._id, "users.userId": user.userId },
            { $set: { "users.$.lastLogin": new Date(), updatedAt: new Date() } }
        );

        // Skapa token med korrekt roll
        const token = jwt.sign(
            {
                userId: user.userId,
                email: user.email,
                companyId: company._id,
                name: user.name,
                role: user.role,
            },
            process.env.JWT_SECRET || "fallback-secret-key",
            { expiresIn: "8h" }
        );

        res.json({
            success: true,
            message: `Välkommen ${user.name}!`,
            token,
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: company.companyName,
                companyId: company._id,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid inloggning",
        });
    }
}
