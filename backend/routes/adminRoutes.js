import express from "express";
import { loginUser, registerUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/registeradmin", registerUser);
router.post("/loginadmin", loginUser);

export default router;
