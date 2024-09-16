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
      league_id INTEGER, 
      team_logo BLOB,
      home_stadium TEXT,
      founded_year INTEGER,
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
    )
  `);

  // LAF second division league
  db.run(`
    CREATE TABLE IF NOT EXISTS laf_second_division_league (
      team_id INTEGER PRIMARY KEY,
      team_name TEXT NOT NULL,
      city TEXT,
      team_logo BLOB,
      home_stadium TEXT,
      founded_year INTEGER
    )
  `);

 // LAF third division league
 db.run(`
  CREATE TABLE IF NOT EXISTS laf_third_division_league (
    team_id INTEGER PRIMARY KEY,
    team_name TEXT NOT NULL,
    city TEXT,
    team_logo BLOB,
    home_stadium TEXT,
    founded_year INTEGER
  )
`);

 // County meet table
 db.run(`
  CREATE TABLE IF NOT EXISTS county_meet (
    team_id INTEGER PRIMARY KEY,
    team_name TEXT NOT NULL,
    city TEXT,
    league_id INTEGER,
    team_logo BLOB,
    home_stadium TEXT,
    founded_year INTEGER,
    FOREIGN KEY(league_id) REFERENCES leagues(league_id)
  )
`);
  // County table
  db.run(`
    CREATE TABLE IF NOT EXISTS county (
      county_id INTEGER PRIMARY KEY,
      county_name TEXT NOT NULL,
      city TEXT,
      county_logo BLOB,
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
      match_time TEXT,
      venue TEXT,
      status TEXT,
      home_team_score INTEGER,
      away_team_score INTEGER,
      FOREIGN KEY (home_team_id) REFERENCES teams(team_id),
      FOREIGN KEY (away_team_id) REFERENCES teams(team_id)
    )
  `); 
 
  // Players table
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
      event_type TEXT,
      team_id INTEGER,
      player_id INTEGER,
      score_description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(match_id) REFERENCES matches(match_id),
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(player_id) REFERENCES players(player_id)
    )
  `);

  // Match statistics table
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
    )
  `); 
  console.log("Database and tables initialized.");
});


// Set up multer for file uploads using memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // Limit file size to 8MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed!'));
  }
});

db.run("PRAGMA foreign_keys = ON;");

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));

const secretKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true
}));

app.set('view cache', false);
// To handle JSON payloads
app.use(bodyParser.json());

// Setting up static directory
app.use(express.static("public"));

// Setting up views engine
app.set('view engine', 'ejs');

// Home Page
app.get("/", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }
       
        // Fetch matches data and join with teams and leagues
        db.all(`
          SELECT matches.match_id,
                 matches.status,
                 matches.home_team_score,
                 matches.away_team_score,
                 home_team.team_name AS home_team_name,
                 away_team.team_name AS away_team_name,
                 home_team.team_logo AS home_team_logo,
                 away_team.team_logo AS away_team_logo,
                 leagues.league_name,
                 leagues.league_logo
          FROM matches
          INNER JOIN teams AS home_team ON matches.home_team_id = home_team.team_id
          INNER JOIN teams AS away_team ON matches.away_team_id = away_team.team_id
          INNER JOIN leagues ON home_team.league_id = leagues.league_id
        `, (err, matchData) => {
          if (err) {
            console.log("Error: ", err);
            return res.status(500).send("Error retrieving match data");
          }
        
          res.render('dashboard', { teamdata, leaguedata, countydata, matchData });
        });
        
      });
    });
  });
});



app.get("/form", (req, res) => {
  db.all('SELECT * FROM leagues', (err, rows) => {
      if (err) {
          console.error("Error fetching leauses:", err);
          return res.status(500).send("Error fetching leagues.");
      }

      if (!rows || rows.length === 0) {
          console.warn("No league found in the database.");
      } else {
          console.log("Fetched league:", rows);
      }

      res.render('form', { leagueid: rows });
  });
});


app.get("/league_form", (req, res) => { 
  res.render('league_dataf');
});

app.get("/team_form", (req, res) => { 
  res.render('team_dataf');
});

app.get("/county_form", (req, res) => { 
  res.render('county_dataf');
});

app.get("/match_form", (req, res) => { 
  res.render('match_infor_form');
});


app.get("/league1_matches/:league_id", (req, res) => {
  const leagueId = req.params.league_id;

  // Fetch the league details based on league_id
  db.get("SELECT * FROM leagues WHERE league_id = ?", [leagueId], (err, league) => {
    if (err) {
      return res.status(500).send("Error retrieving league data");
    }
    
    if (!league) {
      return res.status(404).send("League not found");
    }

    // Render a view for the league overview page
    res.render("league1_matches", { league });
  });
});

app.get("/league1_overview/:league_id", (req, res) => {
  const leagueId = req.params.league_id;

  // Fetch the league details based on league_id
  db.get("SELECT * FROM leagues WHERE league_id = ?", [leagueId], (err, league) => {
    if (err) {
      return res.status(500).send("Error retrieving league data");
    }
    
    if (!league) {
      return res.status(404).send("League not found");
    }

    // Render a view for the league overview page
    res.render("league1_overview", { league });
  });
});

app.get("/league1_table/:league_id", (req, res) => {
    const leagueId = req.params.league_id;
  
    // Fetch the league  table details based on league_id
    db.get("SELECT * FROM leagues WHERE league_id = ?", [leagueId], (err, league) => {
      if (err) {
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!league) {
        return res.status(404).send("League not found");
      }
  
  // Render a view for the league overview Table page    
  res.render('league1_table', { league });
 });
});

// Team Table
app.get('/player_stats_all', (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('player_stats_all', { teamdata, leaguedata, countydata });
      });
    });
  });
});
 

// Team Table
app.get('/player_stats_ass', (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('player_stats_ass', { teamdata, leaguedata, countydata });
      });
    });
  });
});

// Team Table
app.get('/player_stats_goal', (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('player_stats_goal', { teamdata, leaguedata, countydata });
      });
    });
  });
});

// Team Table
app.get('/player_stats_rc', (req, res) => {

    db.all("SELECT * FROM teams", (err, teamdata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving team data");
      }
      
      if (!teamdata || teamdata.length === 0) {
        console.log("No teams found");
        return res.status(404).send("No teams found");
      }
  
      db.all("SELECT * FROM leagues", (err, leaguedata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving league data");
        }
        
        if (!leaguedata || leaguedata.length === 0) {
          console.log("No leagues found");
          return res.status(404).send("No leagues found");
        }
  
        db.all("SELECT * FROM county", (err, countydata) => {
          if (err) {
            console.log("Error: ", err);
            return res.status(500).send("Error retrieving county data");
          }
          
          if (!countydata || countydata.length === 0) {
            console.log("No counties found");
            return res.status(404).send("No counties found");
          }
  
          res.render('player_stats_rc', { teamdata, leaguedata, countydata });
        });
      });
    });
  });
  

// Team Table
app.get('/player_stats_sot', (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('player_stats_sot', { teamdata, leaguedata, countydata });
      });
    });
  });
});


// Team Table
app.get('/player_stats_yc', (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('player_stats_yc', { teamdata, leaguedata, countydata });
      });
    });
  });
});

//The qualification page
app.get("/league1_qualification/:league_id", (req, res) => {
    const leagueId = req.params.league_id;
  
    // Fetch the league  table details based on league_id
    db.get("SELECT * FROM leagues WHERE league_id = ?", [leagueId], (err, league) => {
      if (err) {
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!league) {
        return res.status(404).send("League not found");
      }
  
  // Render a view for the league overview Table page    
  res.render('qualification', { league });
  });
});

// Team matches page
app.get('/team_matches', (req, res) => {
  console.log("Route /team_matches hit");
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('team_matches', { teamdata, leaguedata, countydata });
      });
    });
  });
});

// Team away page
app.get("/team_table_away", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('team_table_away', { teamdata, leaguedata, countydata });
      });
    });
  });
});


// Team Table Form
app.get("/team_table_form", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('team_table_form', { teamdata, leaguedata, countydata });
      });
    });
  });
});


// Team Table
app.get("/team_table", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('team_table', { teamdata, leaguedata, countydata });
      });
    });
  });
});

// Team page
app.get("/team", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        console.log("Team data:", teamdata);
        res.render('team', { teamdata, leaguedata, countydata });
      });
    });
  });
});




// POST route for teams
app.post('/submit_team', upload.single('team_logo'), (req, res) => {
  const data = req.body;
  const teamLogo = req.file ? req.file.buffer : null;

  const insertTeam = `
    INSERT INTO teams (team_name, city, team_logo, home_stadium, founded_year)
    VALUES (?, ?, ?, ?, ?)`;

  db.run(insertTeam, [
    data.team_name,
    data.city,
    teamLogo,
    data.home_stadium,
    data.founded_year
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "Team data inserted successfully", team_id: this.lastID });
  });
});

// POST route for counties
app.post('/submit_county', upload.single('county_logo'), (req, res) => {
  const data = req.body;
  const countyLogo = req.file ? req.file.buffer : null; // Store the image as a BLOB

  const insertCounty = `
    INSERT INTO county (county_name, city, county_logo, home_stadium, founded_year)
    VALUES (?, ?, ?, ?, ?)`;

  db.run(insertCounty, [
    data.county_name,
    data.city,
    countyLogo, // Insert image as BLOB
    data.home_stadium,
    data.founded_year
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "County data inserted successfully", county_id: this.lastID });
  });
});

app.post('/submit_league', upload.single('leagues_logo'), (req, res) => {
  const data = req.body;
  const leagueLogo = req.file ? req.file.buffer : null; // Store image as BLOB

  const insertLeague = `
    INSERT INTO county (league_name, leagues_logo, country, number_of_teams, founded_year)
    VALUES (?, ?, ?, ?, ?)`;

  db.run(insertLeague, [
    data.league_name,
    leagueLogo, // Insert image as BLOB
    data.country,
    data.number_of_teams,
    data.founded_year_league  // fixed the founded year field
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "League data inserted successfully", league_id: this.lastID });
  });
});

app.post('/submit_match', (req, res) => {
  const data = req.body;

  const matchData = `
    INSERT INTO matches (home_team_id, away_team_id, match_date, venue, status, home_team_score, away_team_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(matchData, [
    data.home_team_id,
    data.away_team_id, 
    data.match_date,
    data.venue,
    data.status,
    data.home_team_score,
    data.away_team_score
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "Match data inserted successfully", match_id: this.lastID });
  });
});


// Matches_fixture page

app.get("/fixture", (req, res) => {
  db.all("SELECT * FROM teams", (err, teamdata) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving team data");
    }
    
    if (!teamdata || teamdata.length === 0) {
      console.log("No teams found");
      return res.status(404).send("No teams found");
    }

    db.all("SELECT * FROM leagues", (err, leaguedata) => {
      if (err) {
        console.log("Error: ", err);
        return res.status(500).send("Error retrieving league data");
      }
      
      if (!leaguedata || leaguedata.length === 0) {
        console.log("No leagues found");
        return res.status(404).send("No leagues found");
      }

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }
        
        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        res.render('fixture', { teamdata, leaguedata, countydata });
      });
    });
  });
});


// Server listening
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
 

