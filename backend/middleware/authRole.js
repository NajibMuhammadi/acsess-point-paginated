import jwt from "jsonwebtoken";
import { getCompaniesCollection } from "../config/db.js";

export function authRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            // 1️⃣ Hämta och kontrollera Authorization-header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Ingen giltig token tillhandahållen",
                });
            }

            // 2️⃣ Verifiera JWT
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "fallback-secret-key"
            );

            // 3️⃣ Hämta företag och användare
            const companiesCol = getCompaniesCollection();
            const company = await companiesCol.findOne({
                _id: decoded.companyId,
                "users.userId": decoded.userId,
            });

            if (!company) {
                return res.status(401).json({
                    success: false,
                    message: "Företag eller användare hittades inte",
                });
            }

            const user = company.users.find((u) => u.userId === decoded.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Användaren hittades inte",
                });
            }

            // 4️⃣ Kontrollera att stationer är godkända
            if (user.role === "firestation" && !user.isApproved) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Detta konto är inte godkänt av en administratör ännu.",
                });
            }

            // 5️⃣ Om specifika roller krävs – kontrollera dessa
            if (allowedRoles.length && !allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Otillräckliga rättigheter",
                });
            }

            // 6️⃣ Lägg användarinformation på request-objektet
            req.user = {
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: company._id,
                companyName: company.companyName,
            };

            next();
        } catch (error) {
            console.error("Auth error:", error);

            if (error.name === "JsonWebTokenError") {
                return res
                    .status(401)
                    .json({ success: false, message: "Ogiltig token" });
            }

            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Token har upphört att gälla",
                });
            }

            return res.status(500).json({
                success: false,
                message: "Serverfel vid autentisering",
            });
        }
    };
}
