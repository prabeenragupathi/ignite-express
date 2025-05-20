// config/env.js
import dotenv from "dotenv";

dotenv.config({ path: `.env`});

export const { PORT, NODE_ENV } = process.env;
