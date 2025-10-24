import express from "express";
import {
    attendance,
    getAllAttendance,
    getAttendanceToday,
} from "../controllers/attendanceController.js";
import { authStation } from "../middleware/authStation.js";
import { authRole } from "../middleware/authRole.js";

const router = express.Router();

router.post("/attendance-uid", authStation(), attendance);
router.get("/all", authRole("admin"), getAllAttendance);
router.get("/today", authRole("admin"), getAttendanceToday);

export default router;
