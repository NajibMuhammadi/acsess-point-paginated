import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
    getCompaniesCollection,
    getUsersCollection,
    getVisitorsCollection,
} from "../config/db.js";

export async function registerUser(req, res) {
    try {
        const { registrationKey, name, email, password } = req.body;

        // --- Validering ---
        if (!registrationKey?.trim())
            return res
                .status(400)
                .json({ success: false, message: "Registreringsnyckel krävs" });
        if (!name?.trim())
            return res
                .status(400)
                .json({ success: false, message: "Namn krävs" });
        if (!email?.trim())
            return res
                .status(400)
                .json({ success: false, message: "E-post krävs" });
        if (!password || password.length < 6)
            return res.status(400).json({
                success: false,
                message: "Lösenord med minst 6 tecken krävs",
            });

        const companiesCol = getCompaniesCollection();
        const usersCol = getUsersCollection();

        // 🔍 Kolla att företaget finns via registrationKey
        const company = await companiesCol.findOne({
            registrationKey: registrationKey.trim(),
        });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Ogiltig registreringsnyckel",
            });

        const companyId = company.companyId; // ✅ vi använder alltid string

        // 🔍 Kolla om första användaren → admin
        const existingUsers = await usersCol.find({ companyId }).toArray();
        const assignedRole =
            existingUsers.length === 0 ? "admin" : "firestation";
        const isApproved = assignedRole === "admin";

        // 🔍 Kontrollera unik e-post inom samma företag
        const existingUser = await usersCol.findOne({
            email: email.toLowerCase().trim(),
            companyId,
        });
        if (existingUser)
            return res.status(400).json({
                success: false,
                message:
                    "Denna e-post används redan av en användare i företaget",
            });

        // 🔐 Hasha lösenord
        const passwordHash = await bcrypt.hash(password, 12);

        // 🆕 Skapa användardokument
        const newUser = {
            userId: crypto.randomUUID(),
            companyId, // ✅ string (inte ObjectId)
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            role: assignedRole,
            isApproved,
            createdAt: new Date(),
            lastLogin: null,
        };

        await usersCol.insertOne(newUser);

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
                companyId: companyId,
            },
        });
    } catch (error) {
        console.error("❌ Register error:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid registrering",
        });
    }
}

// ===============================================================

export async function loginUser(req, res) {
    try {
        const { registrationKey, email, password } = req.body;

        if (!registrationKey?.trim() || !email?.trim() || !password)
            return res.status(400).json({
                success: false,
                message: "Alla fält krävs",
            });

        const companiesCol = getCompaniesCollection();
        const usersCol = getUsersCollection();

        // 🔍 Verifiera företag
        const company = await companiesCol.findOne({
            registrationKey: registrationKey.trim(),
        });
        if (!company)
            return res.status(404).json({
                success: false,
                message: "Ogiltig registreringsnyckel",
            });

        const companyId = company.companyId; // ✅ använd alltid string

        // 🔍 Hämta användaren
        const user = await usersCol.findOne({
            email: email.toLowerCase().trim(),
            companyId,
        });
        if (!user)
            return res.status(401).json({
                success: false,
                message: "Ogiltiga inloggningsuppgifter",
            });

        // 🔒 Verifiera lösenord
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({
                success: false,
                message: "Ogiltiga inloggningsuppgifter",
            });

        // 🔒 Kontrollera om kontot är godkänt
        if (user.role === "firestation" && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message:
                    "Kontot måste godkännas av en administratör innan inloggning är möjlig.",
            });
        }

        // 🔄 Uppdatera senaste inloggning
        await usersCol.updateOne(
            { userId: user.userId },
            { $set: { lastLogin: new Date() } }
        );

        // 🪶 Skapa JWT-token
        const token = jwt.sign(
            {
                userId: user.userId,
                email: user.email,
                companyId, // ✅ string
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
                companyId: companyId,
            },
        });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({
            success: false,
            message: "Serverfel vid inloggning",
        });
    }
}

export async function getAllUsers(req, res) {
    try {
        const usersCol = getUsersCollection();
        const companyId = req.user.companyId; // 🟢 nu string, inte _id

        const { page = 1, limit = 25, search = "" } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const query = { companyId };

        // 🟢 sökning på namn eller e-post
        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const total = await usersCol.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        const users = await usersCol
            .find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .project({
                passwordHash: 0, // 🟢 ta bort lösenordshash
            })
            .toArray();

        res.json({
            success: true,
            users,
            total,
            totalPages,
            page: pageNum,
        });
    } catch (err) {
        console.error("❌ getAllUsers error:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av användare",
        });
    }
}

// ============================================================
// ✅ Godkänn användare (isApproved = true)
// ============================================================
export async function approveUser(req, res) {
    try {
        const { userId } = req.body;
        const usersCol = getUsersCollection();

        const result = await usersCol.updateOne(
            { userId, companyId: req.user.companyId },
            { $set: { isApproved: true } }
        );

        res.json({
            success: result.modifiedCount > 0,
            message:
                result.modifiedCount > 0
                    ? "Användare godkänd"
                    : "Ingen användare uppdaterades",
        });
    } catch (err) {
        console.error("❌ approveUser error:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid godkännande",
        });
    }
}

// ============================================================
// ❌ Ta bort användare
// ============================================================
export async function deleteUser(req, res) {
    try {
        const { userId } = req.params;
        const usersCol = getUsersCollection();

        const result = await usersCol.deleteOne({
            userId,
            companyId: req.user.companyId,
        });

        res.json({
            success: result.deletedCount > 0,
            message:
                result.deletedCount > 0
                    ? "Användare raderad"
                    : "Ingen användare hittades",
        });
    } catch (err) {
        console.error("❌ deleteUser error:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid radering av användare",
        });
    }
}

// ============================================================
// 🛠️ Ändra användarroll
// ============================================================
export async function changeUserRole(req, res) {
    try {
        const { userId, role } = req.body;
        const usersCol = getUsersCollection();

        const result = await usersCol.updateOne(
            { userId, companyId: req.user.companyId },
            { $set: { role } }
        );

        res.json({
            success: result.modifiedCount > 0,
            message:
                result.modifiedCount > 0
                    ? "Roll uppdaterad"
                    : "Ingen användare hittades",
        });
    } catch (err) {
        console.error("❌ changeUserRole error:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid rolländring",
        });
    }
}

// ============================================================
// 👤 Hämta inloggad användares profil
// ============================================================
export async function getProfile(req, res) {
    try {
        const usersCol = getUsersCollection();
        const { userId, companyId } = req.user;

        const user = await usersCol.findOne(
            { userId, companyId },
            { projection: { passwordHash: 0 } } // 🟢 ta bort lösenordet
        );

        if (!user)
            return res.status(404).json({
                success: false,
                message: "Användare hittades inte",
            });

        return res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error fetching profile:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid profilhämtning",
        });
    }
}

// ============================================================
// 🚶‍♂️ Hämta alla besökare (separerad collection, med pagination)
// ============================================================
export async function getAllVisitors(req, res) {
    try {
        const visitorsCol = getVisitorsCollection();
        const companyId = req.user.companyId;

        // 🔹 Query-parametrar (pagination + sökning)
        const { page = 1, limit = 25, search = "" } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 🔹 Grundfilter (endast företagets besökare)
        const matchStage = { companyId };

        // 🔹 Sök efter namn, telefon eller UID
        if (search.trim()) {
            matchStage.$or = [
                { visitorName: { $regex: search.trim(), $options: "i" } },
                { phoneNumber: { $regex: search.trim(), $options: "i" } },
                { uid: { $regex: search.trim(), $options: "i" } },
            ];
        }

        // ============================================================
        // 🧩 Aggregation pipeline
        // ============================================================
        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },

            // 🔗 Koppla mot attendance för att hämta alla besök
            {
                $lookup: {
                    from: "attendance",
                    let: { vId: "$visitorId", cId: "$companyId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$visitorId", "$$vId"] },
                                        { $eq: ["$companyId", "$$cId"] },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                checkInTime: 1,
                                checkOutTime: 1,
                            },
                        },
                    ],
                    as: "attendanceRecords",
                },
            },

            // ➕ Beräkna statistikfält
            {
                $addFields: {
                    totalVisits: { $size: "$attendanceRecords" },
                    lastCheckIn: {
                        $max: "$attendanceRecords.checkInTime",
                    },
                    lastCheckOut: {
                        $max: "$attendanceRecords.checkOutTime",
                    },
                    isCurrentlyInside: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: "$attendanceRecords",
                                        as: "a",
                                        cond: {
                                            $eq: ["$$a.checkOutTime", null],
                                        },
                                    },
                                },
                            },
                            0,
                        ],
                    },
                },
            },

            // 🎯 Returnera endast relevanta fält
            {
                $project: {
                    _id: 0,
                    visitorId: 1,
                    visitorName: 1,
                    phoneNumber: 1,
                    uid: 1,
                    type: 1,
                    createdAt: 1,
                    lastSeen: 1,
                    totalVisits: 1,
                    lastCheckIn: 1,
                    lastCheckOut: 1,
                    isCurrentlyInside: 1,
                },
            },
        ];

        // 🚀 Kör båda parallellt (data + total)
        const [visitors, total] = await Promise.all([
            visitorsCol.aggregate(pipeline).toArray(),
            visitorsCol.countDocuments(matchStage),
        ]);

        // 🧾 Logga för felsökning
        console.log("✅ [getAllVisitors] Besökare hittade:", visitors.length);
        visitors.forEach((v) => {
            console.log(
                `👤 ${v.visitorName} (${v.uid}) – ${v.totalVisits} besök, inne just nu: ${v.isCurrentlyInside}`
            );
        });

        // ✅ Returnera färdigt svar
        res.status(200).json({
            success: true,
            visitors,
            total,
            totalPages: Math.ceil(total / limitNum),
            page: pageNum,
        });
    } catch (err) {
        console.error("❌ Error fetching visitors:", err);
        res.status(500).json({
            success: false,
            message: "Serverfel vid hämtning av besökare",
        });
    }
}
