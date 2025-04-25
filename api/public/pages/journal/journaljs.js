/**
 * This isn't the best code- but it gets the job done :-)
 */
"use strict";

import { statusCheck, BASE_URL } from "../../scripts/common.js";

(function() {
  const ENTRY_STEP = 4;

  let currEntryIndex = 0; // stores the currently viewing entry
  // placeholder- holds all the entries

  window.addEventListener("load", init);

  // sets up buttons and all entries 
  function init() {
    let urlParams = window.location.search;

    if (urlParams) {
      let getQuery = urlParams.split('?')[1]
      let params = getQuery.split('&')

      let pageParam = params.find((e) => /^topentry=/.test(e));
      let showEntry = params.find((e) => /^entry=/.test(e));

      if (showEntry) {
        // TODO: these lines and the ones after else if (pageParam) are the same,
        // technically I could factor
        currEntryIndex = parseInt(showEntry.split("entry=")[1]) || 0;
        showCurrEntry(false);

      } else if (pageParam) {
        currEntryIndex = parseInt(pageParam.split("topentry=")[1]) || 0;
        showCurrEntry();
      }
    } else {
      showCurrEntry();
    }
  }

  // toggles the next entry
  function nextEntry() {
    if (currEntryIndex >= entries.length) {
      alert("That's the last entry jeez, don't rush me")
    } else {
      currEntryIndex += ENTRY_STEP;
      // update search params
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('topentry', currEntryIndex);
      window.location.search = urlParams;
    }
  }

  // toggles the previous entry
  function prevEntry() {
    if (currEntryIndex <= 0) {
      alert("That's the first entry.... you freak")
    } else {
      currEntryIndex -= ENTRY_STEP;
      // update search params
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('topentry', currEntryIndex);
      window.location.search = urlParams;
    }    
  }

  // toggles visibility of the control buttons and shows the desired entry
  async function showCurrEntry(preview=true) {
    try {
      let entries = await fetch(`${BASE_URL}/entries?topentry=${currEntryIndex}&offset=${preview ? ENTRY_STEP - 1: 1}`);
      await statusCheck(entries);
      entries = await entries.json();

      if (preview) {
        showMultiEntries(entries);
        if (preview) {
          id("next-button").href = `index.html?topentry=${currEntryIndex + ENTRY_STEP}`;
          id("back-button").href = `index.html?topentry=${currEntryIndex - ENTRY_STEP}`;
        }

      } else {
        showSingleEntry(entries.entry[0]);
        if (currEntryIndex <= 1) {
          id("back-button").classList.add("hidden");
        }
    
        if (currEntryIndex === entries.totalEntries) {
          id("next-button").classList.add("hidden");
        }

        id("back-button").href = `index.html?entry=${currEntryIndex - 1}`;
        id("next-button").href = `index.html?entry=${currEntryIndex + 1}`;
      }
      
    } catch (err) {
      console.error(err);
      alert("ERROR - DEBUG.  CONTACT DEVELOPER")
    }
  }

  function showSingleEntry(entry) {
    id("entries").classList.add("hidden");
    id("single-entry").classList.remove("hidden");

    let blogPostElem = createNewEntry(entry, currEntryIndex, false);
    
    id("single-entry").append(...blogPostElem);
  }

  function showMultiEntries(entries) {
    let backButton = id("back-button");
    let nextButton = id("next-button");

    if (currEntryIndex <= 0) {
      backButton.classList.add('hidden');
    } else if (backButton.classList.contains('hidden')) {
      backButton.classList.remove('hidden');
    }

    if (currEntryIndex + ENTRY_STEP >= entries.totalEntries) {
      nextButton.classList.add('hidden');
    } else if (nextButton.classList.contains('hidden')) {
      nextButton.classList.remove('hidden');
    }
    
    id("entries").innerHTML = "";

    for (let i = 0; i < entries.entry.length; i++) {
      let currEntry = createNewEntry(entries.entry[i], currEntryIndex + i + 1);

      id("entries").append(...currEntry);
    }
  }
  function createNewEntry(blogContents, index, preview = true) {
    let entry = document.createElement("article");
    let blogHolder = document.createElement("div");
    let blogTitle = document.createElement("a");
    let blogSubti = document.createElement("p");
    let blogTime = document.createElement("time");

    // TODO: split up!
    let blogFeeling = document.createElement("div");
    let feelingColon = document.createElement("p");
    let feelingImage = document.createElement("img");

    // TODO: split up!
    let blogSong = document.createElement("div");
    let songColon = document.createElement("p");
    let songAnchor = document.createElement("a");

    entry.classList.add("entry");

    blogTitle.textContent = blogContents.title;
    blogTitle.href = `index.html?entry=${index}`;
    blogTitle.classList.add("title");

    blogSubti.textContent = blogContents.subtitle;
    blogTime.textContent = blogContents.time;

    // within a week?  It's new
    if (Date.now() - new Date(blogContents.time).valueOf() < 1000 * 60 * 60 * 24 * 7) {
      blogTitle.classList.add("new");
    }

    if (blogContents.feeling) {
       // TODO: split up!
      blogFeeling.classList.add("feeling");
      feelingColon.textContent = `feeling: ${blogContents.feeling}`;

      feelingImage.src = "../../images/faces/" + blogContents.feelingsticker;
      feelingImage.alt = `A ${blogContents.feeling} face`;

      blogFeeling.append(feelingColon, feelingImage);
    }
   

    if (blogContents.song) {
      // TODO: split up!
      blogSong.classList.add("song");
      songColon.textContent = `listening to: `;
      songAnchor.textContent = blogContents.song;
      songAnchor.href = blogContents.songlink;
      songAnchor.target = "_blank";

      blogSong.append(songColon, songAnchor);
    }

    blogTime.dateTime = blogContents.time;

    blogHolder.append(blogTitle);
    blogSubti && blogHolder.appendChild(blogSubti);
    blogHolder.append(blogFeeling, blogSong);

    // show max only 800 chars
    let textToShow = preview ? blogContents.contents.substring(0, 800) : blogContents.contents;

    let blogParagraphs = textToShow.split("\\n");
    for (let i = 0; i < blogParagraphs.length; i++) {
      let para = document.createElement("p");
      para.innerHTML = blogParagraphs[i]; // Technically bad, but bad things don't happen to me (totally didn't just jinx myself.  Pretty plz no xss <3)

      blogHolder.appendChild(para);
    }

    if (blogContents.contents.length > 300 && preview) {
      let readMoreLink = document.createElement("a");
      readMoreLink.textContent = "Read more...";
      readMoreLink.href = `index.html?entry=${index}`;

      blogHolder.appendChild(readMoreLink);
    }

    entry.append(blogTime, blogHolder);
    // it's still an array because I was doing stuff before and idk maybe I'll want to go back to that
    return [entry];
  }

  /** Helpers- simplify longer js functions */
  function qs(query) {
    return document.querySelector(query);
  }

  function id(id) {
    return document.getElementById(id);
  }

  function qsa(query) {
    return document.querySelectorAll(query);
  }
})();