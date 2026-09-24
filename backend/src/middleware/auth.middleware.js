import { verifyAccessToken } from "../utils/token.js"
import ApiError from "../utils/api-error.js"

const requireAuth = (req, res, next) => {
    const header = req.headers.authorization || ""
    const [scheme, token] = header.split(" ")

    if (scheme !== "Bearer" || !token) {
        return next(new ApiError(401, "MISSING_TOKEN", "Missing or malformed Authorization header"))
    }

    try {
        const payload = verifyAccessToken(token)
        req.investor = { investorId: payload.investorId }
        next()
    } catch (error) {
        next(new ApiError(401, "INVALID_TOKEN", "Invalid or expired token"))
    }
}

export default requireAuth
