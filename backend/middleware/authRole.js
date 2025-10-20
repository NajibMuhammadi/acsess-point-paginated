import jwt from "jsonwebtoken";
import { getCompaniesCollection } from "../config/db.js";

export function authRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Ingen giltig token tillhandahållen",
                });
            }

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

            if (!company)
                return res.status(401).json({
                    success: false,
                    message: "Företag eller användare hittades inte",
                });

            const user = company.users.find((u) => u.userId === decoded.userId);
            if (!user)
                return res.status(401).json({
                    success: false,
                    message: "Användaren hittades inte",
                });

            // 4️⃣ Roll- och statuskontroller
            if (user.role === "firestation" && !user.isApproved)
                return res.status(403).json({
                    success: false,
                    message:
                        "Detta konto är inte godkänt av en administratör ännu.",
                });

            if (allowedRoles.length && !allowedRoles.includes(user.role))
                return res.status(403).json({
                    success: false,
                    message: "Otillräckliga rättigheter",
                });

            // 5️⃣ Lägg användardata på request
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
            console.error("Auth error:", error.message);

            if (error.name === "JsonWebTokenError")
                return res.status(401).json({
                    success: false,
                    message: "Ogiltig token",
                });

            if (error.name === "TokenExpiredError")
                return res.status(401).json({
                    success: false,
                    message: "Token har upphört att gälla",
                });

            return res.status(500).json({
                success: false,
                message: "Serverfel vid autentisering",
            });
        }
    };
}
