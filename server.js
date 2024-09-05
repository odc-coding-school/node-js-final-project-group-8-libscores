const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const session = require("express-session");
const crypto = require('crypto');




const app = express();
const port = 5001;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

const secretKey = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true
})
);

// Setting up static directory
app.use(express.static("public"));

// Setting up views engine
app.set('view engine', 'ejs');

// Home Page
app.get("/", (req, res) => {
  res.render('dashboard');
})

app.get("/league1_overview", (req, res) => {
  res.render('league1_overview');
})


app.get("/league1_matches", (req, res) => {
  res.render('league1_matches');
})

app.get("/league1_table", (req, res) => {
  res.render('league1_table');
})

// Server listening
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

