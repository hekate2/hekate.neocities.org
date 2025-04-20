"use strict";
(function() {
  window.addEventListener("load", init);

  function init() {
    let quizForm = document.getElementById("quiz");
    quizForm.addEventListener("submit", (e) => {
      e.preventDefault();
      getQuizResults();
    });
  }

  async function getQuizResults() {
    try {
      let mostCommonAnswer = getMostCommonAnswer();
      let res = await fetch("answerchoices.json");
      res = await res.json();

      let answer = res[mostCommonAnswer][Math.floor(Math.random() * res[mostCommonAnswer].length)];
      // console.log(answer);
      display(answer);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while getting your results :-/");
    }
  }

  function display(result) {
    document.querySelector(".image").src = result["img"];
    document.querySelector(".image").alt = result["title"];
    document.querySelector(".title").textContent = result["title"];
    document.querySelector(".description").textContent = result["description"];

    document.getElementById("answer").style.display = "block";
    document.querySelector('textarea').value = document.querySelector(".results").outerHTML;
  }

  function getMostCommonAnswer() {
    let chosenAnswers = document.querySelectorAll("#quiz input[type='radio']:checked");
    let tally = {};

    chosenAnswers.forEach((ans) => {
      if (!tally[ans.value]) {
        tally[ans.value] = 0;
      }
      tally[ans.value] = tally[ans.value] + 1;
    });


    return [...Object.keys(tally)].map((k) => {
      return [tally[k], k]
    }).sort((a, b) => {
      return b[0] - a[0];
    })[0][1];

  }

})();