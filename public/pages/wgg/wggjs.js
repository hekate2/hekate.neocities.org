"use strict";
import { BASE_URL, statusCheck } from "../../scripts/common.js";

(function() {
  window.addEventListener("load", init);

  /** Page load behaviour */
  function init() {
    getImages();
  }

  /** retrieves images from the json file */
  async function getImages() {
    try {
      let res = await fetch("../../../data/wgg.json");
      res = await res.json();

      populateGallery(res);

    } catch(err) {
      console.error(err);
      alert("bleh!!  There was an issue getting the images.")
    }
  }

  /** Populates the gallery with images */
  function populateGallery(images) {
    images.forEach((img, i) => {
      let imgElem = document.createElement("img");
      let frameIndex = Math.floor(Math.random() * 2) + 1;

      imgElem.src = `../../../images/weirdgifgallery/${img.src}`;
      imgElem.alt = img.alt;
      // imgElem.classList.add(`frame-${frameIndex}`);
      imgElem.style.transform = `rotate(${Math.floor(Math.random() * 21) - 10}deg)`

      if (i == 7) {
        document.querySelector("main").appendChild(createSubmitDialog());
      }

      document.querySelector("main").appendChild(imgElem);
    });
  }

  /** Creates a form where the user can submit a weird gif to the page */
  function createSubmitDialog() {
    let holder = document.createElement("div");
    let textHolder = document.createElement("div");
    let t1 = document.createElement("p");
    let t2 = document.createElement("h2");
    let t3 = document.createElement("p");
    let fu = document.createElement("input");
    let fuLabel = document.createElement("label");
    let inputHolder = document.createElement("form");
    let submitButton = document.createElement("button");
    let nameInput = document.createElement("input");

    t1.textContent = "Have a weird gif u think should b here???";
    t2.textContent = "SEND 'EM ON OVER!";
    t3.textContent = "Give me your worst.... but plz no p0rn... (I know it's tempting)";

    fu.type = "file";
    fu.id = "gif-upload";
    fu.accept = ".gif";
    fu.name = "gif";

    fuLabel.for = "gif-upload";
    fuLabel.name = "gif";

    nameInput.name = "name";
    nameInput.placeholder = "Enter your name (optional)";
    nameInput.type = "text";
    nameInput.autocomplete = "off";
    
    fuLabel.textContent = "Upload File";
    
    submitButton.textContent = "Send it over!";

    inputHolder.id = "inputs";
    textHolder.id = "texts";
    holder.id = "sendem";

    inputHolder.append(fuLabel, nameInput, fu, submitButton);
    textHolder.append(t1, t2, t3);

    inputHolder.addEventListener("submit", (e) => {
      submitButton.remove();
      e.preventDefault();
      sendImage();
    });

    holder.append(textHolder, inputHolder);
  
    return holder;
  }

  async function sendImage() {
    try {
      let form = document.querySelector("form");
      let params = new FormData(form);
      let res = await fetch(`${BASE_URL}/wgg/submit`, {
        method: "POST",
        body: params
      });

      await statusCheck(res);

      form.innerHTML = "";

      let successMsg = document.createElement("p");
      successMsg.classList.add("success");
      successMsg.textContent = "Success!  Thank u >:-)";

      form.appendChild(successMsg);

    } catch (err) {
      res.type('text').status(500).send(err);
    }
  }

})();