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

  db.run(`
    CREATE TABLE IF NOT EXISTS leagues (
      league_id INTEGER PRIMARY KEY,
      league_name TEXT NOT NULL,
      league_logo BLOB,
      country TEXT,
      founded_year INTEGER,
      number_of_teams INTEGER
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
      founded_year INTEGER,
      league_id INTEGER,  
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
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

    // this is the county matches table
    db.run(`
      CREATE TABLE IF NOT EXISTS county_matches (
        county_match_id INTEGER PRIMARY KEY,
        home_county_id INTEGER,
        away_county_id INTEGER,
        match_date TEXT,
        match_time TEXT,
        venue TEXT,
        status TEXT,
        home_county_score INTEGER,
        away_county_score INTEGER,
        FOREIGN KEY (home_county_id) REFERENCES county(county_id),
        FOREIGN KEY (away_county_id) REFERENCES county(county_id)
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

// Home Page with optional league_id
// Home Page with optional league_id
app.get("/", (req, res) => {
  const leagueId = req.params.league_id; // You might need to adjust this if you're not using route parameters.

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

      // Find the selected league by ID or use the first one by default
      const selectedLeague = leaguedata.find(league => league.league_id == leagueId) || leaguedata[0];

      db.all("SELECT * FROM county", (err, countydata) => {
        if (err) {
          console.log("Error: ", err);
          return res.status(500).send("Error retrieving county data");
        }

        if (!countydata || countydata.length === 0) {
          console.log("No counties found");
          return res.status(404).send("No counties found");
        }

        // Fetch matches data
        db.all(`
          SELECT 
            l.league_logo, 
            l.league_name, 
            'qualification' AS league_stage,  
            away_team.team_name AS away_team_name,
            away_team.team_logo AS away_team_logo,
            home_team.team_name AS home_team_name,
            home_team.team_logo AS home_team_logo,
            m.status AS match_status,
            m.home_team_score,
            m.away_team_score
          FROM matches m
          INNER JOIN teams AS home_team ON m.home_team_id = home_team.team_id
          INNER JOIN teams AS away_team ON m.away_team_id = away_team.team_id
          INNER JOIN leagues l ON home_team.league_id = l.league_id
        `, (err, matches) => {
          if (err) {
            console.log("Error: ", err);
            return res.status(500).send("Error retrieving match data");
          }

          // Fetch county matches data
          db.all(`
            SELECT 
              l.league_logo, 
              l.league_name, 
              'qualification' AS league_stage,  
              away_county.county_name AS away_county_name,
              away_county.county_logo AS away_county_logo,
              home_county.county_name AS home_county_name,
              home_county.county_logo AS home_county_logo,
              m.status AS match_status,
              m.home_county_score,
              m.away_county_score
            FROM county_matches m
            INNER JOIN county AS home_county ON m.home_county_id = home_county.county_id
            INNER JOIN county AS away_county ON m.away_county_id = away_county.county_id
            INNER JOIN leagues l ON home_county.league_id = l.league_id
            WHERE 
              m.home_county_score IS NOT NULL AND 
              m.away_county_score IS NOT NULL AND 
              home_county.county_name IS NOT NULL AND
              away_county.county_name IS NOT NULL
          `, (err, countymatches) => {
            if (err) {
              console.log("Error: ", err);
              return res.status(500).send("Error retrieving county match data");
            }

            // Render dashboard with all data and selected league
            res.render('dashboard', { 
              teamdata, 
              leaguedata, 
              selectedLeague, // Pass the selected league to the view
              countydata, 
              matches, 
              countymatches 
            });
          });
        });
      });
    });
  });
});


app.get("/league1_overview/:league_id", (req, res) => {
  const leagueId = req.params.league_id;

  // Fetch league-specific data for overview
  db.get("SELECT * FROM leagues WHERE league_id = ?", [leagueId], (err, league) => {
    if (err) {
      console.log("Error retrieving league data: ", err);
      return res.status(500).send("Error retrieving league data");
    }

    if (!league) {
      return res.status(404).send("League not found");
    }

    // Fetch teams associated with the league
    db.all("SELECT * FROM teams WHERE league_id = ?", [leagueId], (err, teams) => {
      if (err) {
        console.log("Error retrieving teams data: ", err);
        return res.status(500).send("Error retrieving teams data");
      }

      // Fetch matches associated with the league via home_team's league_id
      db.all(`
        SELECT 
          m.match_id,
          m.home_team_id,
          m.away_team_id,
          m.match_date,
          m.venue,
          m.status,
          m.home_team_score,
          m.away_team_score,
          ht.team_name AS home_team_name,
          ht.team_logo AS home_team_logo,
          at.team_name AS away_team_name,
          at.team_logo AS away_team_logo
        FROM matches m
        INNER JOIN teams ht ON m.home_team_id = ht.team_id
        INNER JOIN teams at ON m.away_team_id = at.team_id
        WHERE ht.league_id = ?
      `, [leagueId], (err, matches) => {
        if (err) {
          console.log("Error retrieving matches data: ", err);
          return res.status(500).send("Error retrieving matches data");
        }

          // Updated matches query to join with county and leagues
          db.all(`
            SELECT 
              l.league_logo, 
              l.league_name, 
              'qualification' AS league_stage,  
              away_county.county_name AS away_county_name,
              away_county.county_logo AS away_county_logo,
              home_county.county_name AS home_county_name,
              home_county.county_logo AS home_county_logo,
              m.status AS match_status,
              m.home_county_score,
              m.away_county_score
            FROM county_matches m
            INNER JOIN county AS home_county ON m.home_county_id = home_county.county_id
            INNER JOIN county AS away_county ON m.away_county_id = away_county.county_id
            INNER JOIN leagues l ON home_county.league_id = l.league_id
            WHERE 
              m.home_county_score IS NOT NULL AND 
              m.away_county_score IS NOT NULL AND 
              home_county.county_name IS NOT NULL AND
              away_county.county_name IS NOT NULL
          `, (err, countymatches) => {
            if (err) {
              console.log("Error: ", err);
              return res.status(500).send("Error retrieving county match data");
            }

        // Render the league overview page with the fetched league, teams, and matches data
        res.render("league1_overview", { leagueId, league, teams, matches, countymatches });
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
 db.all("SELECT * FROM leagues WHERE league_id IN (1, 2, 3)", (err, leagueType) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving leagues data");
    }
    
    if (!leagueType || leagueType.length === 0) {
      console.log("No leagues found");
      return res.status(404).send("No leagues found");
    }
    
    // Render the view with the leagueType data
    res.render('team_dataf', { leagueType });
  });
});

app.get("/county_form", (req, res) => { 
  db.all(`SELECT * FROM leagues  WHERE league_id = 4`, (err, leagueType) => {
    if (err) {
      console.log("Error: ", err);
      return res.status(500).send("Error retrieving leagues data");
    }
    
    if (!leagueType || leagueType.length === 0) {
      console.log("No leagues found");
      return res.status(404).send("No leagues found");
    }
    
    // Render the view with the leagueType data
    res.render('county_dataf', { leagueType });
  });
});

app.get("/match_form", (req, res) => { 
  res.render('match_info_form');
});

app.get("/match_county_form", (req, res) => { 
  res.render('match_county_form');
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

    // Fetch the matches related to the league
    db.all("SELECT * FROM matches WHERE league_id = ?", [leagueId], (err, matches) => {
      if (err) {
        return res.status(500).send("Error retrieving matches data");
      }

      // Render a view for the league matches page
      res.render("league1_matches", { league, matches });
    });
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
app.get("/team/:team_id", (req, res) => {
  const teamId = req.params.team_id;
  const leagueId = req.query.league_id || null; // Get leagueId from query params or set to null if not provided

  // Fetch all necessary data for the sidebar (teams, leagues, counties)
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

        // Find the selected league by ID or use the first one by default
        const selectedLeague = leaguedata.find(league => league.league_id == leagueId) || leaguedata[0];

        // Fetch matches associated with the team
        db.all(`
          SELECT 
            m.match_id,
            m.match_date,
            m.venue,
            m.status,
            m.home_team_score,
            m.away_team_score,
            ht.team_name AS home_team_name,
            ht.team_logo AS home_team_logo,
            at.team_name AS away_team_name,
            at.team_logo AS away_team_logo
          FROM matches m
          INNER JOIN teams ht ON m.home_team_id = ht.team_id
          INNER JOIN teams at ON m.away_team_id = at.team_id
          WHERE ht.team_id = ? OR at.team_id = ?
        `, [teamId, teamId], (err, teamFullData) => {
          if (err) {
            console.log("Error retrieving match data: ", err);
            return res.status(500).send("Error retrieving match data");
          }

          // Fetch players associated with the team
          db.all("SELECT * FROM players WHERE team_id = ?", [teamId], (err, players) => {
            if (err) {
              console.log("Error retrieving players data: ", err);
              return res.status(500).send("Error retrieving players data");
            }

            // If no matches found, pass an empty array and show a message
            if (!teamFullData || teamFullData.length === 0) {
              console.log("No matches found for the team.");
            }

            // Render the page with all data
            res.render("team", {
              teamId,
              players,
              teamdata,
              selectedLeague,
              teamFullData: teamFullData || [], // Empty array if no matches
              leaguedata,
              countydata,
              message: teamFullData.length === 0 ? "No matches found for this team." : null
            });
          });
        });
      });
    });
  });
});


// POST route for teams
app.post('/submit_team', upload.single('team_logo'), (req, res) => {
  const data = req.body;
  const teamLogo = req.file ? req.file.buffer : null;

  const insertTeam = `
    INSERT INTO teams (team_name, city, team_logo, home_stadium, founded_year, league_id)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(insertTeam, [
    data.team_name,
    data.city,
    teamLogo,
    data.home_stadium,
    data.founded_year,
    data.league_id
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

  // Log the incoming data for debugging
  console.log('Received data:', data);

  // Enable foreign key constraints
  db.run('PRAGMA foreign_keys = ON');

  // Check if league_id is valid
  db.get("SELECT league_id FROM leagues WHERE league_id = ?", [data.league_id], (err, row) => {
    if (err || !row) {
      // If the league_id is invalid, return an error
      console.log('Invalid league_id:', data.league_id);
      return res.status(400).send("Invalid league_id. Please select a valid league.");
    }

    // Proceed with insertion if league_id is valid
    const insertCounty = `
      INSERT INTO county (county_name, city, county_logo, home_stadium, founded_year, league_id)
      VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(insertCounty, [
      data.county_name,
      data.city,
      countyLogo, // Insert image as BLOB
      data.home_stadium,
      data.founded_year,
      data.league_id
    ], function(err) {
      if (err) {
        // Log the error for debugging
        console.log('Insert Error:', err.message);
        return res.status(500).send("Error inserting county data");
      }

      // Successfully inserted county data
      res.send("County data inserted successfully");
    });
  });
});

app.post('/submit_league', upload.single('leagues_logo'), (req, res) => {
  const data = req.body;
  const leagueLogo = req.file ? req.file.buffer : null; // Store image as BLOB

  const insertLeague = `
    INSERT INTO leagues (league_name, leagues_logo)
    VALUES (?, ?)`;

  db.run(insertLeague, [
    data.league_name,
    leagueLogo  
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

app.post('/submit_county_match', (req, res) => {
  const data = req.body;

  const countyMatchData = `
    INSERT INTO county_matches (home_county_id, away_county_id, match_date, venue, status, home_county_score, away_county_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(countyMatchData, [
    data.home_county_id,
    data.away_county_id,
    data.match_date,
    data.venue,
    data.status,
    data.home_county_score,
    data.away_county_score
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "County Match data inserted successfully", county_match_id: this.lastID });
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
 

