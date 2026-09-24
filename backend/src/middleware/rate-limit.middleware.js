import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please try again later."
    }
})
