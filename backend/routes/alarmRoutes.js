import {
    acknowledgeAlarm,
    getAlarmById,
    getAllAlarms,
    handleAlarm,
} from "../controllers/alarmController.js";
import { authRole } from "../middleware/authRole.js";
import express from "express";
const router = express.Router();

router.post("/trigger", handleAlarm);
router.get("/all", authRole("admin", "firestation"), getAllAlarms);
router.put("/acknowledge", authRole("admin"), acknowledgeAlarm);
router.get("/:alarmId", authRole("admin", "firestation"), getAlarmById);

export default router;
