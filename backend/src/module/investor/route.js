import express from "express"
import * as investorController from "./controller.js"
import { loginLimiter } from "../../middleware/rate-limit.middleware.js"
import * as investorValidation from "../../validation/investor.validation.js"
import validate from "../../middleware/validate.middleware.js"
import requireAuth from "../../middleware/auth.middleware.js"


const router = express.Router()

router.post(
    "/register",
    investorValidation.registerValidation,
    validate,
    investorController.register
);

router.post(
    "/login",
    loginLimiter,
    investorValidation.loginValidation,
    validate,
    investorController.login
)

router.get(
    "/me",
    requireAuth,
    investorController.getMe
)

export default router
