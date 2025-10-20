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

const router = express.Router();

router.post("/register", validateBody(registerSchema), registerUser);
router.post("/login", validateBody(loginSchema), loginUser);
router.get("/users", authRole("admin"), getAllUsers);
router.put("/approve-user", authRole("admin"), approveUser);
router.delete("/delete-user/:userId", authRole("admin"), deleteUser);
router.put("/change-role", authRole("admin"), changeUserRole);
router.get("/all", authRole("admin"), getAllVisitors);

router.get("/profile", authRole(), getProfile);

export default router;
