import jwt from "jsonwebtoken";
import { getCompaniesCollection } from "../config/db.js";
export function authStation() {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).json({ message: "Ingen token angiven" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.type !== "device" || !decoded.stationId) {
                return res.status(401).json({ message: "Ogiltig token" });
            }

            const companiesCol = getCompaniesCollection();
            const company = await companiesCol.findOne({
                _id: decoded.companyId,
                "stations.stationId": decoded.stationId,
                "stations.activeToken": token, // 💡 kontroll här
            });

            if (!company) {
                return res
                    .status(401)
                    .json({ message: "Ogiltig eller utloggad session" });
            }
            const station = company.stations.find(
                (s) => s.stationId === decoded.stationId
            );

            // 🚨 Extra kontroll här
            if (!station.isApproved) {
                return res
                    .status(403)
                    .json({ message: "Stationen är inte längre godkänd" });
            }

            // Lägg på station + company info till req
            req.companyId = decoded.companyId;
            req.station = company.stations.find(
                (s) => s.stationId === decoded.stationId
            );
            next();
        } catch (err) {
            console.error("authStation error:", err);
            return res
                .status(401)
                .json({ message: "Token felaktig eller utgången" });
        }
    };
}
