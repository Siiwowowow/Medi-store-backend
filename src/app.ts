import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { notFound } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import qs from "qs";
import { envVars } from "./app/config/env";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";

const app: Application = express();

app.set("query parser", (str: string) => qs.parse(str));

app.set("view engine", "ejs");

app.set(
  "views",
  path.resolve(process.cwd(), `src/app/templates`)
);

// Stripe Webhook needs raw body before express.json()
app.use(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" })
);

// Enable CORS
app.use(
  cors({
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Better Auth
app.use("/api/auth", toNodeHandler(auth));

// Parse URL encoded
app.use(express.urlencoded({ extended: true }));

// JSON parser except Stripe webhook
app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/payment/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());

// Routes
app.use("/api/v1", IndexRoutes);

// Health check route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "MediStore Backend Running Successfully",
  });
});

// Global Error Handler
app.use(globalErrorHandler);

// Not Found Handler
app.use(notFound);

export default app;