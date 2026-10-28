require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});
const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database/database");
const adminRoutes = require("./routes/adminRoutes");

const attendenceRoute = require("./routes/employee_atten");
const employeeRoutes = require("./routes/employee");
const organisationRoutes=require("./routes/organisation")
const notificationsRoutes=require("./routes/notification");
const authRoutes = require("./routes/auth") ;;
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// SESSION CONFIGURATION
// ==========================================

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
}

app.use(session({
    store: new SQLiteStore({
        db: "presenx_sessions.sqlite",
        dir: __dirname
    }),
    name: "presenx.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
    }
}));

// ==========================================
// FRONTEND
// ==========================================

app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.static(path.join(__dirname, "../Admin_page")));



// API
app.get("/", (req, res) => {
    res.send("welcome to presenX");
});

app.use("/api", attendenceRoute);

app.use("/api/employees", employeeRoutes);

app.use("/api",organisationRoutes);

app.use("/api",notificationsRoutes)

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

// SERVER
app.listen(5001, () => {
    console.log("presenX is running on port 5001");
});