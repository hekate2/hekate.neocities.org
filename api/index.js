"use strict";

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const parseFromString = require('dom-parser').parseFromString;
const NodeMailer = require('nodemailer');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const initializeApp = require('firebase/app').initializeApp;
const getAnalytics = require("firebase/analytics").getAnalytics;
const { getDatabase, ref, get, onValue } = require('firebase/database');
const { getFirestore, collection, startAt, limit, query, orderBy, getDocs, getCountFromServer } = require('firebase/firestore');

const open = require('sqlite').open;
const sqlite3 = require('sqlite3');

const storage = multer.memoryStorage();
const upload = multer({ storage });

dotenv.config();

const app = express();

app.use(cors()); // cors

const corsOptions = {
  origin: ['*'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  extended: true
};

app.use(cors(corsOptions));

// app.use(express.urlencoded({ extended: true })); // multipart-formdata params

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  databaseURL: process.env.FB_DB_URL,
  projectId: process.env.FB_PJID,
  storageBucket: process.env.FB_SB,
  messagingSenderId: process.env.FB_MSG_ID,
  appId: process.env.FB_APP_ID,
  measurementId: process.FB_MEASUREID
};

const fbApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(fbApp);


const LASTFM_BASE = "http://ws.audioscrobbler.com/2.0/"; // why the heck is their domain audioscrobbler?
const HITCOUNT_URL = "https://weirdscifi.ratiosemper.com/neocities.php?sitename=hekate";

const TRANSPORTER = NodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_ADDY,
    pass: process.env.GOOG_APP_PASS
  }
});

app.get("/test", (req, res) => res.type('text').send("Is this thing even on???"));

app.get("/last-song", async (req, res) => {
  try {
    let fmdata = await fetch(LASTFM_BASE + "?method=user.getrecenttracks&user=oubliette99&api_key=ae3443515a2781395979d88e35f0afd6&format=json");
    await statusCheck(fmdata);
    fmdata = await fmdata.json(); // TODO: this is a problem because res.json() also sends

    const mostRecentTrack = fmdata.recenttracks.track[0];
    let link;
    let ytId;

    if (mostRecentTrack.url) {
      let lastFmPage = await fetch(mostRecentTrack.url);
      await statusCheck(lastFmPage);
      lastFmPage = await lastFmPage.text();

      const lastfmdom = parseFromString(lastFmPage);
      const ytLinkElem = lastfmdom.getElementsByClassName("header-new-playlink")[0];
      
      if (ytLinkElem) {
        link = ytLinkElem.attributes.find((e) => e.name === "href");
        link = link.value;

        let idPattern = new RegExp("(?<=v=).*$");
        let idMatch = link.match(idPattern)[0];

        ytId = idMatch;
      }
    }

    res.json({
      "name": mostRecentTrack.name,
      "url": link || mostRecentTrack.url,
      "img": mostRecentTrack.image[1]["#text"],
      "albumTitle": mostRecentTrack.album["#text"],
      "artist": mostRecentTrack.artist["#text"],
      "date": mostRecentTrack.date?.uts,
      "ytid": ytId
    });
  } catch (err) {
    res.type('json').status(500).send({
      "message": "an error occurred on the server",
      "err": err
    });
  }
});

app.get("/entries", async (req, res) => {
  try {
    let startEntry = parseInt(req.query.topentry || "0");
    let numEntries = parseInt(req.query.offset || "10");

    if (isNaN(startEntry) || isNaN(numEntries) || startEntry < 0 || numEntries < 0) {
      return res.status(400).send("Invalid query parameters.");
    }

    let entries = await getEntries(startEntry, startEntry + numEntries);
    const entryColl = collection(firestoreDb, "entries");
    const totalEntries = await getCountFromServer(entryColl);

    if (entries.length === 0) {
      res.type("text").status(404).send("No entries were found :-(");
    } else {
      res.json({
        totalEntries: totalEntries.data().count, // TODO: calculate
        entry: entries
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).type('text').send("Error fetching data: " + err.message);
  }
});

app.post("/wgg/submit", upload.single('gif'), async (req, res) => {
  if (!req.body) {
    res.type('text').status(400).send("Please include a body with your request!");
  } else if (!req.file) {
    res.type('text').status(400).send('Missing a gif!');
  } else {
    try {
      const name = req.body.name || "anon";
  
      let mailOptions = {
        from: process.env.GMAIL_ADDY,
        to: process.env.GMAIL_ADDY,
        subject: `Weird Gif Gallery Submission From ${name}!`,
        text: `my name is ${name} and here is my submission to the weird gif gallery:`,
        attachments: [
          {
            filename: req.file.originalname || 'submission.gif',
            content: req.file.buffer,
            contentType: req.file.mimetype
          }
        ]
      };
  
      await TRANSPORTER.sendMail(mailOptions);
  
      res.type('text').send("success!");
    } catch (err) {
      res.type('json').status(500).send({
        "message": "an error occurred on the server",
        "err": err
      });
    }
  }
  
});

app.post('/stats', async (req, res) => {
  try {
    let visitCount = await fetch(HITCOUNT_URL);
    await statusCheck(visitCount);
    visitCount = await visitCount.json();
    
    res.json({
      visitcount: visitCount["info"]["views"],
      lastupdate: visitCount["info"]["last_updated"]
    }); // maybe instead of sending coords we could somehow make the map on the server 
  } catch (error) {
    console.error('Error fetching location:', error);
    res.type('json').status(500).send({
      "message": "an error occurred on the server",
      "err": error
    });
  }
});

app.post("/friends", upload.none(), async (req, res) => {
  if (!req.body) {
    res.type('text').status(400).send("Looks like u don't have a body to go along with ur request.");
  } else if (!req.body.name || !req.body.age || !req.body.moc || !req.body.handle || !req.body.about || !req.body.opener ) {
    res.type('text').status(400).send("Missing one or more required parameters!");
  } else {
    try {
      let {name, moc, age, handle, opener, about, extra } = req.body;

      let mailOptions = {
        from: process.env.GMAIL_ADDY,
        to: process.env.GMAIL_ADDY,
        subject: `New Friend Request From: ${name}`,
        text: `
name: ${name},
age: ${age},
preferred method of contact: ${moc},
internet handle: ${handle},
opener: ${opener},
about me: ${about},
more suff: ${extra}`
      };

      await TRANSPORTER.sendMail(mailOptions);

      res.type('text').send("Success!");
    } catch (err) {
      console.log(err);
      res.type('json').status(500).send({
        "message": "an error occurred on the server",
        "err": err
      });
    }
  }
});

// gets entries between start and end index from firestore db
async function getEntries(start = 0, end = 0) {
  if (start >= end) {
    end = start + 1;
  }

  const entriesRef = collection(firestoreDb, "entries");

  // Query all entries ordered by 'order' descending (newest first)
  const q = query(entriesRef, orderBy("order", "desc"));
  const snapshot = await getDocs(q);

  // Slice from start to end

  if (end - start === 1) {
    // single entry
    return [snapshot.docs[snapshot.docs.length - start].data()]
  } else {
    const paginatedDocs = snapshot.docs.slice(start, end);
    return paginatedDocs.map((doc) => doc.data());
  }
  
}

async function statusCheck(res) {
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

// NOT IN USE.  Retrieves data from a sqlite database
async function getDBConnection() {
  const dbpath = "data/data.db";
  const db = await open({
    filename: dbpath,
    driver: sqlite3.Database
  });

  return db;
}

app.use(express.static('public'));
const PORT = process.env.PORT || 8080;
app.listen(PORT);

module.exports = app;