import express from "express";
import { attendance } from "../controllers/attendanceController.js";
import { authStation } from "../middleware/authStation.js";

const router = express.Router();

router.post("/attendance-uid", authStation(), attendance);

export default router;
