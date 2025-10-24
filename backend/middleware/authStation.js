import jwt from "jsonwebtoken";
import { getStationsCollection } from "../config/db.js";

/**
 * 🔐 authStation — middleware som skyddar station-endpoints
 * Verifierar JWT-token, hämtar station från DB och bifogar info till req
 */
export function authStation() {
    return async (req, res, next) => {
        try {
            // ========================
            // 1️⃣ Läs token från header
            // ========================
            const authHeader = req.headers.authorization;
            console.log("📩 Incoming Authorization Header:", authHeader);

            if (!authHeader) {
                console.log("❌ Ingen Authorization-header");
                return res.status(401).json({ message: "Ingen token angiven" });
            }

            const token = authHeader.split(" ")[1]?.trim();
            if (!token) {
                console.log("❌ Ingen token efter 'Bearer'");
                return res.status(401).json({ message: "Ingen token angiven" });
            }

            // ========================
            // 2️⃣ Verifiera JWT
            // ========================
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log("🔑 JWT decoded:", decoded);
            } catch (jwtErr) {
                console.error("❌ JWT verify failed:", jwtErr.message);
                return res
                    .status(401)
                    .json({ message: "Token felaktig eller utgången" });
            }

            // ========================
            // 3️⃣ Kontrollera token-typ
            // ========================
            if (decoded.type !== "device" || !decoded.stationId) {
                console.log("❌ Ogiltig token-typ eller saknar stationId");
                return res.status(401).json({ message: "Ogiltig token" });
            }

            // ========================
            // 4️⃣ Sök station i DB
            // ========================
            const stationsCol = getStationsCollection();
            console.log(
                "🔍 Söker station i DB:",
                decoded.stationId,
                decoded.companyId
            );

            const station = await stationsCol.findOne({
                stationId: decoded.stationId.trim(),
                companyId: decoded.companyId.trim(),
                activeToken: token.trim(),
            });

            console.log("🧱 Station hittad i DB:", station);

            if (!station) {
                console.log("❌ Ingen station hittades som matchar token");
                return res.status(401).json({
                    message: "Ogiltig eller utloggad session",
                });
            }

            // ========================
            // 5️⃣ Kontrollera godkännande
            // ========================
            if (!station.isApproved) {
                console.log("🚫 Station inte längre godkänd");
                return res
                    .status(403)
                    .json({ message: "Stationen är inte längre godkänd" });
            }

            // ========================
            // 6️⃣ Lägg till station-info till req
            // ========================
            req.companyId = decoded.companyId;
            req.stationId = decoded.stationId;
            req.station = station;

            console.log(
                `✅ authStation OK → ${decoded.stationId} (${decoded.companyId})`
            );

            next();
        } catch (err) {
            console.error("🔥 authStation CRASH:", err);
            return res
                .status(500)
                .json({ message: "Internt fel i authStation" });
        }
    };
}
