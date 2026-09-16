const express=require("express")
const db=require("../database/database")
const app=express()
app.use(express.urlencoded({ extended: true }));
const attendenceRoute=require("./routes/employee_atten")
const addRoutes=require("./routes/add_employees")





app.get("/",(req,res)=>{
    res.send("wlcome to presenX")
})

app.use("/api",attendenceRoute)
app.use("/api",addRoutes)

app.listen(5000,()=>{
    console.log("presenX is running on port 5000")
})