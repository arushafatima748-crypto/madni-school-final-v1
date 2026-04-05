import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function startServer() {
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // API Routes
  app.post("/api/send-email", async (req, res) => {
    const { student_name, course, email } = req.body;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "arushafatima748@gmail.com",
      subject: `New Admission: ${student_name} - ${course}`,
      text: `A new student has applied for admission.\n\nName: ${student_name}\nCourse: ${course}\nEmail: ${email}\n\nYou can view more details in the Madni School Admin Dashboard.`,
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Email sent successfully" });
      } else {
        console.log("Email credentials not set. Skipping email send.");
        res.status(200).json({ message: "Email credentials not set. Logged to console." });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // MongoDB connection removed - Using Firebase for frontend data
  console.log("App is running. Frontend is connected to Firebase Firestore.");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
