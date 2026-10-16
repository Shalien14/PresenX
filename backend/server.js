const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database/database");

const attendenceRoute = require("./routes/employee_atten");
const employeeRoutes = require("./routes/employee");
const organisationRoutes=require("./routes/organisation")
const notificationsRoutes=require("./routes/notification");

const app = express();

app.use(cors());
app.use(express.json());


// FRONTEND
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


// SERVER
app.listen(5001, () => {
    console.log("presenX is running on port 5001");
});