import express from "express";
import cors from "cors";
import {PORT} from "#config/env.js";
import { errorHandler } from "#utils/error.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
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