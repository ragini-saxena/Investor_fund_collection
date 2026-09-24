import { body } from "express-validator";

export const registerValidation = [
    body("firstName")
    .trim()
    .notEmpty().withMessage("First name is required")
    .isLength({min:2, max:100}),

    body("lastName")
    .trim()
    .notEmpty().withMessage("Last name is required")
    .isLength({min:2, max:100}),

    body("email")
    .trim()
    .normalizeEmail()
    .isEmail().withMessage("Invalid email address"),

    body("whatsapp")
    .trim()
    .notEmpty().withMessage("WhatsApp number is required")
    .isLength({min:7}).withMessage("WhatsApp number looks too short"),

    body("phone")
    .optional({checkFalsy: true})
    .trim(),

    body("pledgeRangeLabel")
    .trim()
    .notEmpty().withMessage("pledgeRangeLabel is required")
]

export const loginValidation = [
    body("investorId")
    .trim()
    .notEmpty().withMessage("investorId is required"),

    body("contactInfo")
    .trim()
    .notEmpty().withMessage("contactInfo is required")
]
