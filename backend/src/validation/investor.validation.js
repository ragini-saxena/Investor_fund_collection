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

export const isValidLuhn = (num) => {
    const clean = String(num || "").replace(/\D/g, "");
    if (clean.length < 13 || clean.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
};

export const isValidExpiry = (expiry) => {
    if (!expiry || typeof expiry !== "string") return false;
    const match = expiry.trim().match(/^(\d{1,2})\s*\/?\s*(\d{2}|\d{4})$/);
    if (!match) return false;
    const month = parseInt(match[1], 10);
    let year = parseInt(match[2], 10);
    if (month < 1 || month > 12) return false;
    if (year < 100) year += 2000;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    if (year > currentYear + 25) return false;
    return true;
};

export const investmentValidation = [
    body("amount")
    .notEmpty().withMessage("Investment amount is required")
    .isFloat({ min: 1 }).withMessage("Amount must be greater than 0"),

    body("paymentMethod")
    .trim()
    .notEmpty().withMessage("Payment method is required"),

    body("cardDetails").custom((cardDetails, { req }) => {
        const method = req.body.paymentMethod;
        const saveCard = req.body.saveCard === true || req.body.saveCard === "true";

        if (method === "debit" || method === "credit") {
            if (!cardDetails) {
                throw new Error("Card details are required for card payments");
            }

            // If user opted to save card, strictly validate all details
            if (saveCard) {
                const name = String(cardDetails.cardholderName || "").trim();
                if (name.length < 2 || !/^[a-zA-Z\s\.\'\-]{2,60}$/.test(name)) {
                    throw new Error("Valid cardholder name (2-60 letters/spaces) is required to save card");
                }

                const rawNum = String(cardDetails.cardNumber || "").replace(/\D/g, "");
                if (!isValidLuhn(rawNum)) {
                    throw new Error("Valid 13-19 digit card number passing Luhn checksum is required to save card");
                }

                if (!isValidExpiry(cardDetails.expiry)) {
                    throw new Error("Valid unexpired expiration date (MM/YY) is required to save card");
                }
            } else if (cardDetails.cardNumber) {
                // If entering an unmasked card number without saving
                const rawNum = String(cardDetails.cardNumber || "").replace(/\D/g, "");
                // Only validate Luhn if it's an unmasked standard raw card number
                if (rawNum.length >= 13 && rawNum.length <= 19 && !String(cardDetails.cardNumber).includes("•")) {
                    if (!isValidLuhn(rawNum)) {
                        throw new Error("Invalid card number checksum. Please re-check the entered digits");
                    }
                    if (cardDetails.expiry && !isValidExpiry(cardDetails.expiry)) {
                        throw new Error("Card expiration date is invalid or expired (MM/YY)");
                    }
                }
            }
        }
        return true;
    })
];

export const saveCardValidation = [
    body("cardholderName")
    .trim()
    .notEmpty().withMessage("Cardholder name is required")
    .isLength({ min: 2, max: 60 }).withMessage("Cardholder name must be between 2 and 60 characters")
    .matches(/^[a-zA-Z\s\.\'\-]+$/).withMessage("Cardholder name can only contain letters, spaces, hyphens, and apostrophes"),

    body("cardNumber")
    .notEmpty().withMessage("Card number is required")
    .custom((val) => {
        const clean = String(val || "").replace(/\D/g, "");
        if (!isValidLuhn(clean)) {
            throw new Error("Invalid card number. Must be 13-19 digits and pass checksum validation");
        }
        return true;
    }),

    body("expiry")
    .notEmpty().withMessage("Expiry date is required")
    .custom((val) => {
        if (!isValidExpiry(val)) {
            throw new Error("Invalid or expired expiry date (format MM/YY)");
        }
        return true;
    }),

    body("billingCountry")
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 }).withMessage("Invalid billing country")
];

