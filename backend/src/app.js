import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import investorRouter from "./module/investor/route.js";
import errorHandler from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "../public");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));

app.use("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy"
  });
});

app.use("/api/v1/investors", investorRouter);

// Error handling middleware must come after routes
app.use(errorHandler);

export default app;
