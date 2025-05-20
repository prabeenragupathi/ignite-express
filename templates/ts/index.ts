import express, { Request, Response } from "express";
import cors from "cors";
import { errorHandler } from "#utils/error.js";
import {PORT} from "#config/env.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Quick Express Gen!");
});

//! error handler middleware
app.use(errorHandler);

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer();