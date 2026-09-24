import jwt from "jsonwebtoken"
import { config } from "../config/env.js"

const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.accessTokenSecret, {
        expiresIn: config.jwt.accessTokenExpiry
    })
}

const verifyAccessToken = (token) => {
    return jwt.verify(token, config.jwt.accessTokenSecret)
}

export { generateAccessToken, verifyAccessToken }
