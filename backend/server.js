const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database/database");

const attendenceRoute = require("./routes/employee_atten");
const employeeRoutes = require("./routes/employee");

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// FRONTEND
// ==========================================

// Serve frontend folder
app.use(
    "/frontend",
    express.static(path.join(__dirname, "../frontend"))
);

// Serve employee page
app.get("/employee.html", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../employee.html")
    );
});

// Serve employee CSS
app.get("/employee.css", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../employee.css")
    );
});


// ==========================================
// API
// ==========================================

app.get("/", (req, res) => {
    res.send("welcome to presenX");
});

app.use("/api", attendenceRoute);

app.use("/api/employees", employeeRoutes);


// ==========================================
// SERVER
// ==========================================

app.listen(5001, () => {
    console.log("presenX is running on port 5001");
});