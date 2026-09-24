import dotenv from "dotenv"

dotenv.config()

export const config = {
    port: Number(process.env.PORT),
    db: {
        dbHost: process.env.DB_HOST,
        dbUser: process.env.DB_USER,
        dbPass: process.env.DB_PASS,
        dbName: process.env.DB_NAME
    },
    jwt: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET,
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "7d"
    },
    investorId: {
        prefix: process.env.INVESTOR_ID_PREFIX || "IFC",
        suffix: process.env.INVESTOR_ID_SUFFIX || "HT"
    }
}
