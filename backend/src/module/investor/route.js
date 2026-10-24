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
);

router.get(
    "/dashboard",
    requireAuth,
    investorController.getDashboard
);

router.post(
    "/investments",
    requireAuth,
    investorValidation.investmentValidation,
    validate,
    investorController.makeInvestment
);

router.get(
    "/cards",
    requireAuth,
    investorController.getSavedCards
);

router.post(
    "/cards",
    requireAuth,
    investorValidation.saveCardValidation,
    validate,
    investorController.saveCard
);

router.delete(
    "/cards/:id",
    requireAuth,
    investorController.removeCard
);

// Capital Collections Ledger (treasury admin view)
router.get(
    "/ledger",
    investorController.getLedger
);

// Receipt lookup by ?ref=REF-... (auth optional - works both with and without token)
router.get(
    "/receipt",
    (req, res, next) => {
        requireAuth(req, res, (err) => {
            if (err) req.investor = null;
            next();
        });
    },
    investorController.getReceipt
);

// ────────────────────────────────────────────────────────────────
// Administrative Portal Routes (Super ID authentication & approvals)
// ────────────────────────────────────────────────────────────────
router.post(
    "/admin/login",
    investorController.adminLogin
);

router.get(
    "/admin/stats",
    investorController.getAdminStats
);

router.get(
    "/admin/investors",
    investorController.getAdminInvestors
);

router.get(
    "/admin/investors/:id",
    investorController.getAdminInvestorDetails
);

router.patch(
    "/admin/investments/:id/status",
    investorController.updateInvestmentStatus
);

router.post(
    "/admin/investments/:id/status",
    investorController.updateInvestmentStatus
);

// Convenience alias for investment approval
router.patch(
    "/investments/:id/status",
    investorController.updateInvestmentStatus
);

export default router;

