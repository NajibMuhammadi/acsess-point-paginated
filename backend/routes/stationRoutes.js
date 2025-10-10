import express from "express";
import {
    createStation,
    moveStation,
    registerStationFirstTime,
    updateStationApproval,
    heartbeat,
} from "../controllers/stationController.js";
import { authRole } from "../middleware/authRole.js";
import { authStation } from "../middleware/authStation.js";

const router = express.Router();

router.post("/create-station", authRole("admin"), createStation);
router.put("/:stationId/move", authRole("admin"), moveStation);
router.put("/:stationId/approval", authRole("admin"), updateStationApproval);
router.post("/register", registerStationFirstTime);
router.post("/heartbeat", authStation(), heartbeat);

export default router;
