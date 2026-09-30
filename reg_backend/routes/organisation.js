const express = require("express");
const router = express.Router();
const app = express();
const port = 3000;

const db = require("../database/database");
app.use(bodyParser.urlencoded({ extended: true }));


app.post("/register", async (req, res) => {
  const email = req.body.email;
  const name = req.body.name;
  const type = req.body.type;
  const reg_no = req.body.reg_no;
  const address = req.body.address;
  const phone = req.body.phone;
  const website = req.body.website;
  const description = req.body.description;


  try {
    const checkResult = await db.query("SELECT * FROM users WHERE reg_no = $1", [
      reg_no,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Request already exists. Try logging in.");
    } else {
      const result = await db.prepare(
        "INSERT INTO temp_org (email, password) VALUES ($1, $2,$3,$4,$5,$6,$7,$8)",
        [email, name,type,address,reg_no,phone,website,description]
      );
      console.log(result);
    }
  } catch (err) {
    console.log(err);
  }
});
