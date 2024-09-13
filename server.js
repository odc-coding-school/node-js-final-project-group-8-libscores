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
      team_logo BLOB,
      home_stadium TEXT,
      founded_year INTEGER
    )
  `);

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
  db.run(`
    CREATE TABLE IF NOT EXISTS county_meet (
      team_id INTEGER PRIMARY KEY,
      team_name TEXT NOT NULL,
      city TEXT,
      team_logo BLOB,
      home_stadium TEXT,
      founded_year INTEGER
    )
  `);
     // this is the teams table
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


// Set up Multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory as Buffer
const upload = multer({ storage: storage });

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

        console.log("Team data:", teamdata);
        res.render('dashboard', { teamdata, leaguedata, countydata });
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





app.get("/league1_matches", (req, res) => {
  res.render('league1_matches');
});

app.get("/league1_overview", (req, res) => {
  res.render('league1_overview');
});

app.get("/league1_table", (req, res) => {
  res.render('league1_table');
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
app.get("/league1_qualification", (req, res) => {
  res.render('qualification');
})

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


app.post('/submit', upload.fields([{ name: 'team_logo' }, { name: 'county_logo' }, { name: 'leagues_logo' }]), (req, res) => {
  const data = req.body;

  // Extract the logos from the uploaded files
  const teamLogo = req.files['team_logo'][0].buffer; // This is the team logo as a Buffer
  const countyLogo = req.files['county_logo'][0].buffer; // This is the county logo as a Buffer
  const leagueLogo = req.files['leagues_logo'][0].buffer; // This is the league logo as a Buffer

  // Insert team data into the teams table
  const insertTeam = `
      INSERT INTO teams (team_name, city, team_logo, home_stadium, founded_year)
      VALUES (?, ?, ?, ?, ?)`;

  db.run(insertTeam, [
    data.team_name,
    data.city,
    teamLogo, // Insert the binary data (BLOB) for the team logo
    data.home_stadium,
    data.founded_year
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // After successfully inserting into the teams table, insert into the county table
    const insertCounty = `
      INSERT INTO county (county_name, city, county_logo, home_stadium, founded_year)
      VALUES (?, ?, ?, ?, ?)`;

    db.run(insertCounty, [
      data.county_name,
      data.city,
      countyLogo, // Insert the binary data (BLOB) for the county logo
      data.home_stadium,
      data.founded_year
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

       // After successfully inserting into the teams table, insert into the county table
    const insertLeague = `
    INSERT INTO county (league_name, leagues_logo, country, number_of_teams, founded_year_league)
    VALUES (?, ?, ?, ?, ?)`;

  db.run(insertLeague, [
    data.league_name,
    data.country,
    leagueLogo, // Insert the binary data (BLOB) for the county logo
    data.number_of_teams,
    data.founded_year_league
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

      // Respond with success message
      res.json({ message: "Data inserted successfully", team_id: this.lastID });
    });
  });
});
});
// Server listening
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
 

