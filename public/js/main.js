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

document.addEventListener("DOMContentLoaded", function() {
    showingLeagues(); // Correct function name
});