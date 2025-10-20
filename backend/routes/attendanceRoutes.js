import express from "express";
import {
    attendance,
    getAllAttendance,
} from "../controllers/attendanceController.js";
import { authStation } from "../middleware/authStation.js";
import { authRole } from "../middleware/authRole.js";

const router = express.Router();

router.post("/attendance-uid", authStation(), attendance);
router.get("/all", authRole("admin"), getAllAttendance);

export default router;
