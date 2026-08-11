require("dotenv").config();

const connectDB = require("./config/db"); // connect database

// Import the Express web framework to create the server
const express = require("express");

const cors = require("cors");

const careerRoutes = require("./routes/career");

const mentorRoutes = require("./routes/mentor");

const progressRoutes = require("./routes/progress");

const roadmapRoutes = require("./routes/roadmap");

const toolsRoutes = require("./routes/tools");

const toolRoadmapRoute = require("./routes/toolRoadmap");

const profileRoutes = require("./routes/profile");

const progressData = require("./data/progressData");

const projectChallenges = require("./data/projectChallenges");

const Progress = require("./models/Progress");

const User = require("./models/User");

const recommendationRoutes = require("./routes/recommendations");

// Create the Express application instance
const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

app.use("/api/career", careerRoutes);

app.use("/api/career/mentor", mentorRoutes);

app.use("/api/progress", progressRoutes);

app.use("/api/roadmap", roadmapRoutes);

app.use("/api/tools", toolsRoutes);

app.use("/api/tool-roadmap", toolRoadmapRoute);

app.use("/api/profile", profileRoutes);

app.use("/api/progress", progressRoutes);

app.use("/api/recommendations", recommendationRoutes);

//connect database
connectDB();

// Start the server listening on port 5000
app.listen(5000, () => {
  console.log("Server running on port 5000");
});

app.post("/api/progress", (req, res) => {
  const { tool, completedSkills } = req.body;

  progressData[tool] = completedSkills;

  res.json({
    success: true,
  });
});

app.get("/api/progress/:tool", (req, res) => {
  const tool = req.params.tool;

  res.json({
    completedSkills: progressData[tool] || [],
  });
});

app.get("/api/challenge/:tool", (req, res) => {
  const tool = req.params.tool;

  res.json(projectChallenges[tool] || []);
});

app.get("/test-save", async (req, res) => {
  const progress = await Progress.create({
    tool: "Framer",
    completedSkills: ["Framer Basics"],
  });

  res.json(progress);
});

app.get("/test-user", async (req, res) => {
  const user = await User.create({
    name: "Nidhin",
    email: "nidhin@example.com",
    role: "Frontend Developer",
  });

  res.json(user);
});
