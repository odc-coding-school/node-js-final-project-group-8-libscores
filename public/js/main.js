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

    btn1.addEventListener("click", (e) => {
        e.preventDefault();
        team_info.classList.add("d-none");
        county_info.classList.remove("d-none");
    });

    btn2.addEventListener("click", (e) => {
        e.preventDefault();
        county_info.classList.add("d-none");
        player_info.classList.remove("d-none");
    });

    btn3.addEventListener("click", (e) => {
        e.preventDefault();
        player_info.classList.add("d-none");
        match_info.classList.remove("d-none");
    });

    btn4.addEventListener("click", (e) => {
        e.preventDefault();
        match_info.classList.add("d-none");
        score_info.classList.remove("d-none");
    });

    btn5.addEventListener("click", (e) => {
        e.preventDefault();
        score_info.classList.add("d-none");
        league_info.classList.remove("d-none");
    });

    btn6.addEventListener("click", (e) => {
        e.preventDefault();
        league_info.classList.add("d-none");
        match_stat.classList.remove("d-none");
    });
}

formDisplay();


