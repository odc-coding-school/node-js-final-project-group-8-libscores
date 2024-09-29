const matchForm = document.getElementById('matchform'); // Assuming you have a form with id 'matchForm'

  matchForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(matchForm);
    const data = Object.fromEntries(formData.entries());

    fetch('/submit_match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    .then(response => {
      if (response.ok) {
        // Show the popup when the match is successfully saved
        const popup = document.getElementById('popup');
        popup.classList.remove('hidden');
      } else {
        alert('Error saving match. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });

  // Close popup when clicking on the 'X' or anywhere outside the popup
  const popup = document.getElementById('popup');
  const closePopup = document.getElementById('close-popup');

  closePopup.addEventListener('click', function() {
    popup.classList.add('hidden');
  });

  window.addEventListener('click', function(event) {
    if (event.target === popup) {
      popup.classList.add('hidden');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    const matches = <%- JSON.stringify(matches) %>; // Pass the matches array from server-side to client-side
    
    matches.forEach(match => {
      const startBtn = document.getElementById(`start-timer-btn-${match.id}`);
      const pauseBtn = document.getElementById(`pause-timer-btn-${match.id}`);
      const timerDisplay = document.getElementById(`timer-display-${match.id}`);
      const matchStatus = document.getElementById(`match-status-${match.id}`);
      let timerInterval;
      let timeElapsed = 0;
      let halfTime = false;
      
      // Show the "Start Match" button when the match status is clicked
      matchStatus.addEventListener('click', function () {
        startBtn.style.display = 'inline';
      });
  
      // Function to format time in mm:ss
      function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
      }
  
      // Function to start the timer
      function startTimer() {
        startBtn.style.display = 'none'; // Hide start button
        pauseBtn.style.display = 'inline'; // Show pause button
  
        timerInterval = setInterval(() => {
          timeElapsed++;
          timerDisplay.textContent = formatTime(timeElapsed);
  
          // Update match time in the database every minute
          if (timeElapsed % 60 === 0) {
            updateMatchTimeInDatabase(match.id, timeElapsed);
          }
  
          // Half-time logic
          if (timeElapsed === 45 * 60) {
            clearInterval(timerInterval);
            alert('Half-Time! 15 minutes break.');
            halfTime = true;
            setTimeout(() => {
              timeElapsed = 45 * 60;
              startTimer(); // Resume for second half
            }, 15 * 60 * 1000);
          }
  
          // Full-time logic
          if (halfTime && timeElapsed === 90 * 60) {
            clearInterval(timerInterval);
            alert('Match Over!');
          }
        }, 1000);
      }
  
      // Function to pause the timer
      function pauseTimer() {
        clearInterval(timerInterval);
        startBtn.style.display = 'inline';
        pauseBtn.style.display = 'none';
      }
  
      // Event listener for the start button
      startBtn.addEventListener('click', startTimer);
  
      // Event listener for the pause button
      pauseBtn.addEventListener('click', pauseTimer);
    });
  
    // Function to update the match time in the database
    function updateMatchTimeInDatabase(matchId, timeElapsed) {
      fetch(`/update-match-time/${matchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeElapsed }),
      })
      .then(response => response.json())
      .then(data => {
        console.log(`Match ${matchId} time updated successfully:`, data);
      })
      .catch(error => {
        console.error('Error updating match time:', error);
      });
    }
  });
  