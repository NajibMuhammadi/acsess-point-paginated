import jwt from "jsonwebtoken";

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

            // 🔹 Kontrollera roller
            if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Otillräckliga rättigheter",
                });
            }

            // 🔹 Lägg decoded data direkt på req.user
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
                companyId: decoded.companyId,
                companyName: decoded.companyName || "Unknown",
            };

            next();
        } catch (error) {
            console.error("Auth error:", error.message);

            if (error.name === "JsonWebTokenError")
                return res
                    .status(401)
                    .json({ success: false, message: "Ogiltig token" });

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
