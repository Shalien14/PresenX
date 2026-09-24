const express=require("express");
const cors = require("cors");

const db=require("./database/database");

const attendenceRoute=require("./routes/employee_atten");
const employeeRoutes = require("./routes/employee");

const app=express();
app.use(cors());
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("welcome to presenX")
})

app.use("/api",attendenceRoute)
app.use("/api/employees", employeeRoutes);

app.listen(5001,()=>{
    console.log("presenX is running on port 5001")
})