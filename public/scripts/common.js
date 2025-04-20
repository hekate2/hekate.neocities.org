"use strict";
const WIGGLE_OFFSET = 1.5;
const WIGGLE_NUM_LET = 3;

// wiggles text
export function wiggle(text) {
  let words = text.textContent;

  text.classList.add("wiggle");
  text.innerHTML = "";

  for (let j = 0; j < words.length; j++) {
    let sp = document.createElement("span");
    sp.textContent = words[j];
    // Maybe some day these letters will be colorful...
    // sp.style.color = "hsl(" + Math.floor(Math.random() * 361) + ", 100%, 50%)";

    text.appendChild(sp);
  }

  let loop = 0;
  let timerId = setInterval(() => {
    for (let j = 0; j < words.length; j++) {
      let magicNumber = WIGGLE_NUM_LET * WIGGLE_OFFSET;
      let yCoord = ((magicNumber) + (WIGGLE_OFFSET * j) + (WIGGLE_OFFSET * loop)) % (magicNumber);

      text.children[j].style.top = yCoord + "px";
    }
    loop++;
  }, 300);
}

export async function statusCheck(res) {
  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res;
}

(function() {

  window.addEventListener("load", init);

  function init() {
    let toWiggle = document.querySelectorAll(".wiggle");
    [...toWiggle].forEach((text) => {
      wiggle(text);
    });
    
  }
})();