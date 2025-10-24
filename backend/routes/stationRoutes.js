import express from "express";
import {
    createStation,
    getAllStations,
    moveStation,
    deleteStation,
    getAllStationsUnpaginated,
    registerStationFirstTime,
    updateStationApproval,
    heartbeat,
} from "../controllers/stationController.js";
import { authRole } from "../middleware/authRole.js";
import { authStation } from "../middleware/authStation.js"; // 🔒 för enheter

const router = express.Router();

// 🔹 Skapa ny station (endast admin)
router.post("/create-station", authRole("admin"), createStation);

// 🔹 Hämta alla stationer (admin + brandstation)
router.get("/allpaginated", authRole("admin", "firestation"), getAllStations);
router.get("/allunpaginated", authRole("admin"), getAllStationsUnpaginated);

// 🔹 Flytta station till byggnad / koppla bort
router.put("/:stationId/move", authRole("admin"), moveStation);

// 🔹 Godkänn / avaktivera station
router.put("/:stationId/approve", authRole("admin"), updateStationApproval);

// 🔹 Ta bort station
router.delete("/:stationId", authRole("admin"), deleteStation);

// 🔹 Första inloggning för station (ingen auth)
router.post("/registerfirsttime", registerStationFirstTime);

// 🔹 Heartbeat (kräver station-token)
router.post("/heartbeat", authStation(), heartbeat);

export default router;
