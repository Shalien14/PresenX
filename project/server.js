const express=require("express")
const db=require("./database/database")

const attendenceRoute=require("./routes/employee_atten")
const employeeRoutes = require("./routes/employee");


const app=express()
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("wlcome to presenX")
})

app.use("/api",attendenceRoute)
app.use("/api", employeeRoutes);

app.listen(5001,()=>{
    console.log("presenX is running on port 5001")
})