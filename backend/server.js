import app from "./src/app.js";
import pool from "./src/db/db.js";
import { config } from "./src/config/env.js";

const startServer = async () => {
    try {
        const PORT = config.port
        await pool.query("SELECT 1");
        console.log("DB connection success")
        app.listen(PORT, () => {
            console.log(`We are live on http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer()
