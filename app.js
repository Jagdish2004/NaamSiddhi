if(process.env.NODE_ENV != "PRODUCTION"){
    require('dotenv').config();
      
};

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const profileSchema =require("./models/profileSchema");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const dbURL = process.env.MONGO_URL

// Linking the database
main().then(() => {
    console.log("connected to mongoDB");
}).catch(err => console.log(err));

async function main() {
    await mongoose.connect(dbURL);
}

app.get("/",(req,res)=>{
    res.render('records/new.ejs');
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`listening on port: ${port}`);
});