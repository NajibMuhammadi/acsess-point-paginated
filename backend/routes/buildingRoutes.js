import express from "express";
import {
    createBuilding,
    deleteBuilding,
    getAllStationsAndBuildings,
    getBuildingDetails,
} from "../controllers/buildingController.js";

import { authRole } from "../middleware/authRole.js";

const router = express.Router();

router.post("/create-building", authRole("admin"), createBuilding);
router.get("/:buildingId/details", authRole("admin"), getBuildingDetails);
router.delete("/:buildingId", authRole("admin"), deleteBuilding);

router.get(
    "/all",
    authRole("admin", "firestation"),
    getAllStationsAndBuildings
);

export default router;
