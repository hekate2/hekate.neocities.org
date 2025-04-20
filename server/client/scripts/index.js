"use strict";
import { wiggle } from "./common.js";

(function() {
  let ytPlayer;
  let ytId;
  let playing = false;
  let hasPressedPlay = false;

  window.addEventListener("load", init);

  // Page load stuff
  function init() {
    ytPlayerSetup();
    getLastListenedTo();
    getRecentPosts();

    crazyCaps();

    // getQotd();
    crazyOnHover();

    loadHeroImg();

    getVisitorMap();
    
    // move cursor ghost
    qs("body").addEventListener("mousemove", (e) => {
      id("cursorghost").style.left = e.clientX + 'px';
      id("cursorghost").style.top = e.clientY + 'px';
    });

    qs("body").addEventListener("click", explodeOnClick);
  }

  async function getVisitorMap() {
    try {
      let res = await fetch("/stats", {
        method: "POST"
      });
      await statusCheck(res);
      res = await res.json();

      // buildVisitorMap(res.visits);
      id("last-updated").textContent = "Last Updated: " + (new Date(res.lastupdate)).toDateString();
      wiggle(id("last-updated"));

      id("visitor-count").textContent = res.visitcount;
    } catch (err) {
      handleError(err);
    }
  }

  async function buildVisitorMap(data) {
    try {
      const bubbleData = data.map(d => ({
        x: d.longitude,
        y: d.latitude,
        borderWidth: 1,
        value: 1 // You can adjust this value or calculate it dynamically based on your needs
      }));

      let topoData = await fetch('data/countries-50m.json');
      await statusCheck(topoData);
      topoData = await topoData.json();

      const countries = ChartGeo.topojson.feature(topoData, topoData.objects.countries).features;
      const ctx = id('mapCanvas').getContext('2d');

      new Chart(ctx, {
        type: 'bubbleMap', // Use 'bubbleMap' chart type
        data: {
          labels: [], // Empty, since no labels are needed
          datasets: [{
            outline: countries, // Use the world outline for map borders
            showOutline: true, // Show the outline of countries
            outlineBorderColor: 'hotpink',
            outlineBorderWidth: .3,
            pointBorderWidth: .5,
            pointBorderColor: 'white',
            backgroundColor: 'aqua',
            data: bubbleData, // Your bubble data for plotting locations
          }]
        },
        options: {
          plugins: {
            legend: {
              display: false
            },
          },
          scales: {
            projection: {
              axis: 'x',
              projection: 'equalEarth' // Use a globe projection
            },
            size: {
              axis: 'x',
              range: [3, 3],
              display: false // Hide the radius (size) legend
            }
          }
        }
      });

      id("map-holder").classList.remove("hidden");
    } catch(err) {
      handleError(err);
    }
    
  }

  function explodeOnClick(e) {
    let toPopulate = document.createElement("div");
    toPopulate.classList.add("explode");

    toPopulate.style.top = e.clientY + "px";
    toPopulate.style.left = e.clientX + "px";

    qs("body").appendChild(toPopulate);

    setTimeout(() => toPopulate.remove(), 5000);

    // populate 1 star for testing
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        let newStar = document.createElement("p");
        let j = 0;
        let xDirection = Math.random() < 0.5 ? -1 : 1; // left or right
        let xDistance = Math.random() * 100; // Random distance between 0 to 100px for where to fall
        newStar.textContent = "+";
        toPopulate.appendChild(newStar);
    
        let timerId = setInterval(() => {
          // Calculate new y position based on the parabolic equation
          let yTrans = -(-(1 / 40) * (j - 20) ** 2 + 10) + "px";
          let xTrans = xDirection * (xDistance * (j / 100)) + "px";
          newStar.style.transform = `translateX(${xTrans}) translateY(${yTrans})`;
    
          j += 1;
        }, 25);
    
        setTimeout(() => {
          clearInterval(timerId);
          newStar.remove();
        }, 5000);
      }, Math.floor(i / 3) * 50);
    }
  }
  
  

  // applies shaky letters effect to nodes with class .shake
  function shakyLetters() {
    let shakeys = qsa(".shake");
    for (let i = 0; i < shakeys.length; i++) {
      let shaker = shakeys[i];
      let chosenIndexes = [];
      let shakerText = shaker.textContent;
      
      // select 3 random indices
      for (let j = 0; j < Math.floor(shakerText.length / 3); j++) {
        let randIndex = Math.floor(Math.random() * shaker.textContent.length);
        
        while (chosenIndexes.includes(randIndex)) {
          randIndex = Math.floor(Math.random() * shaker.textContent.length);
        }

        chosenIndexes.push(randIndex);
      }

      // sort indices
      chosenIndexes.sort((a, b) => a - b);

      console.log(chosenIndexes);
      
      // enclose those in <span>s
      // BAD!!! DON'T DO THIS.  But technically I'm safe from xss because I'm just using content from tha page.  Idk idk
      let htmlStr = "";

      for (let j = 0; j < chosenIndexes.length; j++) {
        htmlStr += `${shakerText.substring(j > 0 ? chosenIndexes[j - 1] + 1 : 0, chosenIndexes[j])}<span class="shakeyletter" style="transform:rotate(${Math.random() * (20) - 10}deg)">${shakerText[chosenIndexes[j]]}</span>`
      }

      htmlStr += shakerText.substring(chosenIndexes[chosenIndexes.length - 1] + 1, shakerText.lenth);
      shaker.innerHTML = htmlStr;
    }
  }

  // selects and displays a random image
  async function loadHeroImg() {
    try {
      let imagesData = await fetch("data/images.json");
      await statusCheck(imagesData);
      imagesData = await imagesData.json();

      let chosenImg = imagesData[Math.floor(Math.random() * (imagesData.length - 1))];

      id("welcome-img").alt = chosenImg.alt;
      id("welcome-img").src = "./images/photos/" + chosenImg.filename;

      heroImageMessageInit(chosenImg.desc);
    } catch (err) {
      handleError(err);
    }
  }

  // makes text CrAzY when u hover over it
  function crazyOnHover() {
    let crazyElems = qsa(".stuff-container a");
    for (let i = 0; i < crazyElems.length; i++) {
      let crazyItem = crazyElems[i];
      let crazyText = toCrazyCaps(crazyItem.textContent);
      let origaText = crazyItem.textContent;

      crazyItem.addEventListener("mouseenter", () => {
        crazyItem.textContent = crazyText;
      });

      crazyItem.addEventListener("mouseleave", () => {
        crazyItem.textContent = origaText;
      });
    }
  }

  /**
   * Given some text, converts to CrAzY cApS
   * @param {String} text - text to convert
   */
  function toCrazyCaps(text) {
    let acc = "";

    for (let i = 0; i < text.length; i++) {
      acc += i % 2 == 0 ? text[i].toUpperCase() : text[i].toLowerCase();
    }

    return acc;
  }

  function heroImageMessageInit(msg) {
    let newMessage = document.createElement("p");
    newMessage.textContent = msg;
    newMessage.classList.add("image-caption");

    id("welcome-img").addEventListener("mouseenter", () => {
      id("cursorghost").appendChild(newMessage);
    });

    id("welcome-img").addEventListener("mouseleave", () => {
      id("cursorghost").innerHTML = "";
    });
  }

  // retrieves and displays information related to the qotd (question of the day)
  async function getQotd() {
    try {
      // first, make close button functional
      id("qotd-close")?.addEventListener("click", () => {
        id("qotd").classList.add("close");
        setTimeout(() => {
          id("qotd").remove();
        }, 1000);
      });

      let res = await fetch("/qotd");
      await statusCheck(res);
      res = await res.json();

      displayQotd(res);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Given some information, displays the poll on the page
   * @param {Object} meta - metadata
   */
  function displayQotd(meta) {
    
  }

  // applies crazy caps effect to text with `crazy` class (say that 10x fast)
  function crazyCaps() {
    let crazyItems = qsa(".crazy");
    for (let i = 0; i < crazyItems.length; i++) {
      let crazyTextItem = crazyItems[i];
      
      let cnt = 0;
      setInterval(() => {
        let newText = crazyTextItem.textContent.substring(0, cnt).toLowerCase() + crazyTextItem.textContent[cnt].toUpperCase() + crazyTextItem.textContent.substring(cnt + 1, crazyTextItem.textContent.length).toLowerCase();
        crazyTextItem.textContent = newText;

        cnt += 1;

        if (cnt > crazyTextItem.textContent.length - 1) {
          cnt = 0;
        }

      }, 100);
    }
  }

  // retrieves recent posts for homepage
  async function getRecentPosts() {
    try {
      let res = await fetch("/news");
      await statusCheck(res);
      res = await res.json();

      processNewsTimeline(res);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Handles UI stuff for displaying news on the page
   * @param {Array} data - list of new stuff to show
   */
  function processNewsTimeline(data) {
    let homepageHolder = id("new");

    for (let i = 0; i < data.length; i++) {
      let currentItem = data[i];
      let toAppend;

      if (currentItem.type === "Video") {
        toAppend = createVideoPreview(currentItem);
      } else {
        toAppend = createMiscPreview(currentItem);
      }

      if (toAppend) {
        homepageHolder.append(toAppend);
      }
    }
  }

  window.onYouTubeIframeAPIReady = async function() {
    console.log(ytId);

    try {
      ytPlayer = new YT.Player('player', {
        height: '390',
        width: '640',
        playerVars: {
            'playsinline': 1,
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChanged': onPlayerStateChanged
        }
      });
    } catch (err) {
      handleError(err);
    }
  }

  function onPlayerStateChanged(e) {
    console.log(e.data);
    if (e.data === YT.PlayerState.PLAYING) {
      console.log("DONE");
    }
  }

  /** Retrieves my last listened to song from lastfm */
  async function getLastListenedTo() {
    try {
      // TODO: make request to lastfm on server side 
      let res = await fetch(`/last-song`);
      await statusCheck(res);
      res = await res.json();
      
      ytId = res.ytid;

      console.log(res);

      displayTrack(res);

      if (res.ytid && !hasPressedPlay) {
        // TODO: this function should be separated into a named function
        id("play").addEventListener("click", playButtonFunc);
        id("play").classList.remove("hidden");
      }
      
    } catch (err) {
      handleError(err);
    }
  }

  // handles play button functionality for the "listening to" tab,
  // factored to reduce redundancy
  function playButtonFunc() {
    if (!playing && ytPlayer) {
      console.log("playing....");
      console.log(ytPlayer);
      console.log(ytPlayer.videoTitle);
      console.log(ytPlayer.getPlayerState());
      // handle autoplay on load if not loaded
      
      if (ytPlayer.getPlayerState() === undefined) {
        ytPlayer.loadVideoById(ytId);
      } else {
        ytPlayer.playVideo();
      }
      
      this.textContent = "❚❚";

      if (!hasPressedPlay) {
          // show warning only once
        let warningCont = document.createElement("div");
        let warningText = document.createElement("p");
        let warningImg = document.createElement("img");

        warningText.textContent = "(Player can be finnicky... refresh if needed)";

        warningImg.src = "images/warning.gif";
        warningImg.alt = "Warning symbol";

        warningCont.append(warningImg, warningText);
        warningCont.classList.add("warning-cont");

        id("cursorghost").appendChild(warningCont);

        setTimeout(() => {
          warningCont.remove();
        }, 7000);
      }

      playing = !playing;
    } else if (playing && ytPlayer) {
      ytPlayer.pauseVideo();
      this.textContent = "▶";

      playing = !playing;
    }

    hasPressedPlay = true;
  }

  // This function gets called when the video player is ready
  function onPlayerReady(event) {
    event.target.loadVideoById(ytId);
    event.target.pauseVideo();
  }

  /**
   * Handles the visual ui display given information about a song
   * @param {Object} trackInfo - information to use
   */
  function displayTrack(trackInfo) {
    // set album cover art
    let albumImg = id("current-song-art");
    albumImg.src = trackInfo.img;
    albumImg.alt = `Cover art for: ${trackInfo.albumTitle}`;

    // set text meta
    id("song-title-holder").textContent = "";
    id("song-title-holder").appendChild(generateTrackTitle(trackInfo));

    if (trackInfo.name.length > 20) {
      id("song-title-holder").appendChild(generateTrackTitle(trackInfo));
    }

    id("current-song-artist").textContent = trackInfo.artist;
    id("current-song-album").textContent = trackInfo.albumTitle;
  }

  /**
   * Given some data, creates a view with the bare minimum
   * @param {Object} info - metadata
   */
  function createMiscPreview(meta) {
    let holder = document.createElement("article");
    let typeTag = document.createElement("p");
    let newsTitle = document.createElement("a");
    let newsDesc = document.createElement("p");
    let beef = document.createElement("div"); // do u like my variable names?? ;-)
    let entryImg = document.createElement("img");
    let date = document.createElement("time");

    date.classList.add("small");
    date.textContent = (new Date(meta.date)).toDateString();

    entryImg.classList.add("news-img");

    newsTitle.textContent = meta.title;
    newsDesc.textContent = meta.description;
    newsTitle.href = meta.link;

    typeTag.classList.add("news-tag");
    typeTag.textContent = meta.type;

    if (meta.image) {
      entryImg.src = meta.image.src;
      entryImg.alt = meta.image.alt;
      holder.append(entryImg);
    }

    // holder styles
    holder.classList.add("news-holder");

    beef.append(newsTitle, date, newsDesc);
    holder.append(beef, typeTag);

    return holder;
  }

  /**
   * Given some data, creates a video preview display for the frontpage
   * @param {Object} info - metadata
   */
  function createVideoPreview(meta) {
    let holder = document.createElement("article");
    let videoPlayer = document.createElement("iframe");

    let textHolder = document.createElement("div");
    let vidTitle = document.createElement("a");
    let vidDate = document.createElement("p");
    let vidDesc = document.createElement("p");
    let vidTag = document.createElement("p");

    vidTitle.href = meta.link;

    vidTag.classList.add("news-tag");
    vidTag.textContent = "video";

    // holder styles
    holder.classList.add("news-holder");

    // video preview stuff
    videoPlayer.allowFullscreen = true;
    videoPlayer.width = 230;
    videoPlayer.height = 150;
    videoPlayer.src = meta.embedurl;
    videoPlayer.classList.add("video-preview");

    // text meta display
    vidTitle.textContent = meta.title + ` (${meta.type})`;
    vidDate.textContent = (new Date(meta.date)).toDateString();
    vidDesc.textContent = meta.description;

    vidDate.classList.add("small");

    textHolder.append(vidTitle, vidDate, vidDesc);
    holder.append(videoPlayer, textHolder, vidTag);

    return holder;
  }

  /**
   * Creates song title dom object
   * @param {Object} trackInfo - info about the track
   * @returns Object to append onto the page
   */
  function generateTrackTitle(trackInfo) {
    let newElem = document.createElement("p");
    newElem.textContent = trackInfo.name;

    if (trackInfo.name.length > 20) {
      newElem.classList.add("scroll");
    }

    return newElem;
  }

  // 1. Link yt api modules
  function ytPlayerSetup() {
    // Load the IFrame Player API asynchronously
    let tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Handles the error in an appropriate manner... or at least it will
   * @param {Error} err - the error object that's been caught
   */
  function handleError(err) {
    console.error(err);
  }

  /******** HELPERS *********/
  function qs(query) {
    return document.querySelector(query);
  }

  function qsa(query) {
    return document.querySelectorAll(query);
  }

  function id(id) {
    return document.getElementById(id);
  }
})();