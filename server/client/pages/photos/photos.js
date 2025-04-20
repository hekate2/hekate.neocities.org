"use strict";
(function() {
  window.addEventListener("load", init);

  /** Page load functionality */
  function init() {
    makeImages();
  }

  async function makeImages() {
    try {
      let res = await fetch("photos.json");
      res = await res.json();

      let divContainer = document.createElement("div");

      res.forEach((img, i) => {
        if (i % 3 === 0) {
          document.querySelector("#photo-container").appendChild(divContainer);
          divContainer = document.createElement("div");
        }

        let holder = document.createElement("div");
        let caption = document.createElement("p");
        let imgElem = document.createElement("img");
        imgElem.src = img.src;
        imgElem.alt = img.alt;
        imgElem.style.transform = `rotate(${Math.floor(Math.random() * 21 - 10)}deg)`;

        caption.style.transform = `rotate(${Math.floor(Math.random() * 11 - 5)}deg) translateY(-25px)`;
        caption.textContent = img.alt;

        holder.classList.add("gallery-img");
        holder.append(imgElem, caption);

        divContainer.appendChild(holder);
      });

      document.querySelector("#photo-container").appendChild(divContainer);
    } catch (err) {
      alert("An error occurred: " + err);
    }
  }

  /** Makes it so that when an image is clicked a window gets generated */
  function imageClickable() {
    let images = document.querySelectorAll("#photo-container img");
    
    images.forEach((img) => {
      img.addEventListener("click", () => {
        let win = createImgWindow(img);
        document.querySelector("body").appendChild(win);
      });
    });
  }

  function createImgWindow(imgElem) {
    let win = document.createElement("div");
    let closeButt = document.createElement("button");
    let head = document.createElement("header");
    let title = document.createElement("p");
    let imag = document.createElement("img");
    let desc = document.createElement("p");
    let stuffcont = document.createElement("div");

    // let nextButt = document.createElement("button");
    // let prevButt = document.createElement("button"); // hee hee butt

    closeButt.textContent = "x";
    closeButt.addEventListener("click", () => win.remove());

    title.textContent = imgElem.src;

    head.append(title, closeButt);

    imag.src = imgElem.src;
    imag.alt = imgElem.alt;

    desc.textContent = imgElem.alt;

    stuffcont.append(imag, desc);
    win.append(head, stuffcont);

    win.classList.add("bigview");

    $(win).draggable().resizable();

    return win;
  }
})();