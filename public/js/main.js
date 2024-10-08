//To a show a league when click upon
function showingLeagues() {

  const leaguesLink = document.querySelector("#lcounty_meet");
  const detailList = document.getElementById("detail_list");
  const otherList = document.querySelector("#all_sidebar_l"); 
  const sreachform = document.querySelector(".search-bar")
  leaguesLink.addEventListener("click", function(event) {
      

      detailList.classList.remove("d-none");
      otherList.classList.add("d-none");
      sreachform.classList.add("d-none");
  });
}



function formData() {
  document.getElementById('live-scores-form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the form from refreshing the page

    // Create a FormData object to gather all form inputs
    const formData = new FormData(this);

    // Convert FormData to a plain JavaScript object
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    // Send form data to the backend using a POST request
    fetch('/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
        alert('Data submitted successfully');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to submit data');
    });
});

}

document.addEventListener("DOMContentLoaded", function() {
  showingLeagues(); 
  formData();
});


function updateTitleOnClick() {
    // Select all the links with the data-title attribute
    const links = document.querySelectorAll('a[data-title]');
  
    // Add click event listener to each link
    links.forEach(link => {
      link.addEventListener('click', (event) => {
        // Prevent default link behavior if necessary
        // event.preventDefault();
  
        // Get the title from data-title attribute
        const newTitle = link.getAttribute('data-title');
  
        // Update the page title dynamically
        document.title = newTitle;
      });
    });
  }
  
  // Call the function when the document is fully loaded
  document.addEventListener('DOMContentLoaded', updateTitleOnClick);
  

function formDisplay() {
    let team_info = document.querySelector(".team-info");
    let county_info = document.querySelector(".county-info");
    let player_info = document.querySelector(".player-info");
    let match_info = document.querySelector(".match-info");
    let score_info = document.querySelector(".score-info"); 
    let league_info = document.querySelector(".league-info"); 
    let match_stat = document.querySelector(".match-stat");
    
    let btn1 = document.querySelector(".button1");
    let btn2 = document.querySelector(".button2");
    let btn3 = document.querySelector(".button3");
    let btn4 = document.querySelector(".button4");
    let btn5 = document.querySelector(".button5");
    let btn6 = document.querySelector(".button6");

    let btn1p = document.querySelector(".btn1p");
    let btn2p = document.querySelector(".btn2p");
    let btn3p = document.querySelector(".btn3p");
    let btn4p = document.querySelector(".btn4p");
    let btn5p = document.querySelector(".btn5p");
    let btn6p = document.querySelector(".btn6p");

    btn1.addEventListener("click", (e) => {
        e.preventDefault();
        team_info.classList.add("d-none");
        county_info.classList.remove("d-none");
    });

    btn1p.addEventListener("click", (e) => {
        e.preventDefault();
        team_info.classList.remove("d-none");
        county_info.classList.add("d-none");
    });

    btn2.addEventListener("click", (e) => {
        e.preventDefault();
        county_info.classList.add("d-none");
        player_info.classList.remove("d-none");
    });

    btn2p.addEventListener("click", (e) => {
        e.preventDefault();
        county_info.classList.remove("d-none");
        player_info.classList.add("d-none");
    });

    btn3.addEventListener("click", (e) => {
        e.preventDefault();
        player_info.classList.add("d-none");
        match_info.classList.remove("d-none");
    });

    btn3p.addEventListener("click", (e) => {
        e.preventDefault();
        player_info.classList.remove("d-none");
        match_info.classList.add("d-none");
    });

    btn4.addEventListener("click", (e) => {
        e.preventDefault();
        match_info.classList.add("d-none");
        score_info.classList.remove("d-none");
    });

    btn4p.addEventListener("click", (e) => {
        e.preventDefault();
        match_info.classList.remove("d-none");
        score_info.classList.add("d-none");
    });


    btn5.addEventListener("click", (e) => {
        e.preventDefault();
        score_info.classList.add("d-none");
        league_info.classList.remove("d-none");
    });

    btn5p.addEventListener("click", (e) => {
        e.preventDefault();
        score_info.classList.remove("d-none");
        league_info.classList.add("d-none");
    });


    btn6.addEventListener("click", (e) => {
        e.preventDefault();
        league_info.classList.add("d-none");
        match_stat.classList.remove("d-none");
    });

    btn6p.addEventListener("click", (e) => {
        e.preventDefault();
        league_info.classList.remove("d-none");
        match_stat.classList.add("d-none");
    });
}

formDisplay();

document.addEventListener('DOMContentLoaded', function() {
    const leagueSelect = document.getElementById('league_id');
    const teamNameSelect = document.getElementById('team_name');
    const teamIdSelect = document.getElementById('team_id');

    // Function to clear dropdown options
    function clearDropdown(selectElement) {
        selectElement.innerHTML = '<option value="">Select ' + selectElement.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + '</option>';
    }

    // Function to populate dropdown
    function populateDropdown(selectElement, items, valueKey, textKey) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    }

    // Event listener for league selection
    leagueSelect.addEventListener('change', function() {
        const selectedLeagueId = parseInt(this.value);
        
        // Clear existing options
        clearDropdown(teamNameSelect);
        clearDropdown(teamIdSelect);
        
        if (selectedLeagueId === 4) { // Assuming league_id 4 is County
            // Populate with counties
            populateDropdown(teamNameSelect, allCounties, 'county_name', 'county_name');
            populateDropdown(teamIdSelect, allCounties, 'county_id', 'county_id');
        } else {
            // Populate with teams
            const filteredTeams = allTeams.filter(team => team.league_id === selectedLeagueId);
            populateDropdown(teamNameSelect, filteredTeams, 'team_name', 'team_name');
            populateDropdown(teamIdSelect, filteredTeams, 'team_id', 'team_id');
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-timer-btn');
    const pauseBtn = document.getElementById('pause-timer-btn');
    const timerDisplay = document.getElementById('timer-display');
  
    let timerInterval;
    let timeElapsed = 0; // time in seconds
    let halfTime = false; // track whether it's half-time
  
    // Function to format the time in mm:ss
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
  
    // Function to start the timer for the live score
    function startTimer() {
        startBtn.style.display = 'none'; // Hide start button
        pauseBtn.style.display = 'inline'; // Show pause button
  
        timerInterval = setInterval(() => {
            timeElapsed++;
            timerDisplay.textContent = formatTime(timeElapsed);
  
            if (timeElapsed === 45 * 60) {
                clearInterval(timerInterval); // Pause at half-time
                alert('Half-Time! 15 minutes break.');
                halfTime = true;
                setTimeout(() => {
                    timeElapsed = 45 * 60; // Reset the time for the second half
                    startTimer(); // Resume for the second half
                }, 15 * 60 * 1000); // 15-minute break in milliseconds
            }
  
            if (halfTime && timeElapsed === 90 * 60) {
                clearInterval(timerInterval); // Full-time
                alert('Match Over!');
            }
        }, 1000); // Update every second
    }
  
    // Function to pause the timer
    function pauseTimer() {
        clearInterval(timerInterval);
        startBtn.style.display = 'inline'; // Show start button to resume
        pauseBtn.style.display = 'none'; // Hide pause button
    }
  
    // Event listener for start button
    startBtn.addEventListener('click', startTimer);
  
    // Event listener for pause button
    pauseBtn.addEventListener('click', pauseTimer);
  });
  

