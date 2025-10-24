import express from "express";
import { authRole } from "../middleware/authRole.js";
import {
    createBuilding,
    getAllBuildings,
    deleteBuilding,
    getAllBuildingsUnpaginated,
} from "../controllers/buildingController.js";

const router = express.Router();

router.post("/create", authRole("admin"), createBuilding);
router.get("/paginated", authRole("admin", "firestation"), getAllBuildings);
router.get(
    "/unpaginated",
    authRole("admin", "firestation"),
    getAllBuildingsUnpaginated
);
router.delete("/:buildingId", authRole("admin"), deleteBuilding);

export default router;
