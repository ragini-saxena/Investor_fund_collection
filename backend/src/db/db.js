import mysql2 from "mysql2/promise"
import { config } from "../config/env.js"


export const pool = mysql2.createPool({
    host: config.db.dbHost,
    database: config.db.dbName,
    user: config.db.dbUser,
    password: config.db.dbPass,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})


export default pool;
