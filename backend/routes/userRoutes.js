import express from "express";
import {
    approveUser,
    changeUserRole,
    deleteUser,
    getAllUsers,
    getAllVisitors,
    getProfile,
    loginUser,
    registerUser,
} from "../controllers/userController.js";
import { validateBody } from "../middleware/validateBody.js";
import { loginSchema, registerSchema } from "../schemas/userSchemas.js";
import { authRole } from "../middleware/authRole.js";
import { createCompany } from "../controllers/companyController.js";

const router = express.Router();

router.post("/register", validateBody(registerSchema), registerUser);
router.post("/login", validateBody(loginSchema), loginUser);
router.post("/create", createCompany);
router.get("/all", authRole("admin"), getAllUsers);
router.put("/approve", authRole("admin"), approveUser);
router.delete("/:userId", authRole("admin"), deleteUser);
router.put("/role", authRole("admin"), changeUserRole);
router.get("/profile", authRole("admin", "firestation"), getProfile);
router.get("/visitors", authRole("admin", "firestation"), getAllVisitors);

export default router;
