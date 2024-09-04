const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const session = require("express-session");


const app = express();
const port = 5000;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "",
    resave: false,
    saveUninitialized: true,
  })
);

// Setting up static directory
app.use(express.static("public"));

// Setting up views engine
app.set('view engine', 'ejs');





// Server listening
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

