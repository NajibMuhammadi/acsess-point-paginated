import express from "express";
import {
    handleAlarm,
    acknowledgeAlarm,
    getPaginatedAlarms,
    getAlarmById,
} from "../controllers/alarmController.js";
import { authRole } from "../middleware/authRole.js";

const router = express.Router();

router.post("/trigger", authRole("admin", "firestation"), handleAlarm);
router.get("/paginated", authRole("admin", "firestation"), getPaginatedAlarms);
router.put("/acknowledge", authRole("admin", "firestation"), acknowledgeAlarm);
router.get("/:alarmId", authRole("admin", "firestation"), getAlarmById);

export default router;
