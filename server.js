const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const session = require("express-session");
const crypto = require('crypto');
const db = new sqlite3.Database('lib_score.db');




const app = express();
const port = 5001;

// List of all the tables
db.serialize(() => {
  // this is the teams table
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      team_id INTEGER PRIMARY KEY,
      team_name TEXT NOT NULL,
      city TEXT,
      logo_url TEXT,
      home_stadium TEXT,
      founded_year INTEGER
    )
  `);
  // this is the matches table
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      match_id INTEGER PRIMARY KEY,
      home_team_id INTEGER,
      away_team_id INTEGER,
      match_date TEXT,
      venue TEXT,
      status TEXT,
      home_team_score INTEGER,
      away_team_score INTEGER,
      FOREIGN KEY(home_team_id) REFERENCES teams(team_id),
      FOREIGN KEY(away_team_id) REFERENCES teams(team_id)
    )
  `); 
  // this is the players table
  db.run(`
   CREATE TABLE IF NOT EXISTS players (
    player_id INTEGER PRIMARY KEY,
    team_id INTEGER,
    player_name TEXT NOT NULL,
    position TEXT,
    jersey_number INTEGER,
    age INTEGER,
    nationality TEXT,
    goals_scored INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    FOREIGN KEY(team_id) REFERENCES teams(team_id)
    )
  `);
  // this is the live_scores table
  db.run(`
    CREATE TABLE IF NOT EXISTS live_scores (
    score_id INTEGER PRIMARY KEY,
    match_id INTEGER,
    event_time TEXT,
    event_type TEXT,  -- e.g., 'goal', 'foul', 'yellow_card', etc.
    team_id INTEGER,
    player_id INTEGER,
    score_description TEXT,  
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(match_id),
    FOREIGN KEY(team_id) REFERENCES teams(team_id),
    FOREIGN KEY(player_id) REFERENCES players(player_id)
    )
    
  `);
  // this is the leagues table
  db.run(`
    CREATE TABLE IF NOT EXISTS leagues (
    league_id INTEGER PRIMARY KEY,
    league_name TEXT NOT NULL,
    country TEXT,
    number_of_teams INTEGER,
    founded_year INTEGER

    )
  `);  

  db.run(`
   CREATE TABLE IF NOT EXISTS match_statistics (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    possession_percentage REAL,
    shots INTEGER,
    shots_on_target INTEGER,
    fouls INTEGER,
    yellow_cards INTEGER,
    red_cards INTEGER,
    corners INTEGER,
    offsides INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(match_id),
    FOREIGN KEY(team_id) REFERENCES teams(team_id)
);


  `);  


  console.log("Database and tables initialized.");
});

db.close();

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

const secretKey = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true
})
);

app.set('view cache', false);

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

//The qualification page
app.get("/league1_qualification", (req, res) => {
  res.render('qualification');
})

// Team Page
app.get("/team", (req, res) => {
  res.render('team.ejs');
})


// Team Page
app.get("/team_table", (req, res) => {
  res.render('team_table');
})

app.get("form" , (req, res) =>{
  res.render('form');
})

app.post('/submit', (req, res) => {
  const data = req.body;

  // Example of inserting into the "teams" table
  const insertTeam = `
      INSERT INTO teams (team_name, city, logo_url, home_stadium, founded_year)
      VALUES (?, ?, ?, ?, ?)`;

  db.run(insertTeam, [
      data.team_name,
      data.city,
      data.logo_url,
      data.home_stadium,
      data.founded_year
  ], function(err) {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      // You can add similar logic for inserting into other tables here (players, matches, etc.)
      res.json({ message: "Team data inserted successfully", team_id: this.lastID });
  });
});



// Server listening
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

 