import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { notFound } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import qs from "qs"
import { envVars } from "./app/config/env";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";


const app: Application = express();
app.set("query parser", (str : string) => qs.parse(str));

app.set("view engine", "ejs");
app.set("views",path.resolve(process.cwd(), `src/app/templates`) )
// Stripe Webhook needs raw body before express.json()
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

// Enable CORS with credentials
app.use(cors({
    origin : [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL, "http://localhost:3000", "http://localhost:5000"],
    credentials : true,
    methods : ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders : ["Content-Type", "Authorization"]
}))
app.use("/api/auth", toNodeHandler(auth))

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies (except for webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/payments/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());

app.use("/api/v1/", IndexRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});
app.use(globalErrorHandler)
app.use(notFound)
export default app;