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

const open = require('sqlite').open;
const sqlite3 = require('sqlite3');

const storage = multer.memoryStorage();
const upload = multer({ storage });

dotenv.config();

const app = express();

app.use(cors()); // cors
app.use(express.urlencoded({ extended: true })); // multipart-formdata params

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

app.get("/qotd", async (req, res) => {
  try {
    let jsonfileloc = path.join(process.cwd(), "api/data/questions.json");
    let qotdInfo = await fs.readFile(jsonfileloc, "utf8");
    qotdInfo = JSON.parse(qotdInfo);

    res.json(qotdInfo[0]);
  } catch (err) {
    res.type('json').status(500).send({
      "message": "an error occurred on the server",
      "err": err
    });
  }
});

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
  let db;
  try {
    db = await getDBConnection();

    if (!req.query.topentry) {
      let entries = await db.all("SELECT * FROM entries ORDER BY time");

      res.json({
        "totalEntries": entries.length,
        "entry": entries
      });
    } else {
      let topentry = req.query.topentry;
      let query = "SELECT * FROM entries ORDER BY time DESC LIMIT ? OFFSET ?";

      let entries = await db.all(query, parseInt(req.query.offset) || 100, (parseInt(topentry) || 1) - 1);
      let entryCount = await db.get("SELECT COUNT(*) as count FROM entries");
  
      res.json({
        "totalEntries": entryCount.count, // TODO: get total number of entries
        "entry": entries
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      "status": "error",
      "message": err.message
    })
  } finally {
    await db?.close();
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
      console.log(err);
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
    
    let jsonfileloc = path.join(process.cwd(), "api/data/locations.json");
    let locations = await fs.readFile(jsonfileloc, "utf-8");
    locations = JSON.parse(locations);

    let ip = req.headers['x-forwarded-for'];
    let response;

    if (ip) {
      response = await fetch(`http://ip-api.com/json/${ip}`);
      await statusCheck(response);
    }
    
    if (response?.lon && response?.lat && response?.status !== "fail") {
      //  if could get user's ip- get their location
      response = await response.json();
      locations.push({ latitude: response.lat, longitude: response.lon, timestamp: new Date().toISOString() });
    
      if (locations.length > 100) {
        locations.shift(); // Remove the oldest entry
      }
    
      await fs.writeFile(jsonfileloc, JSON.stringify(locations));
    }
    
    res.json({
      visitcount: visitCount["info"]["views"],
      lastupdate: visitCount["info"]["last_updated"],
      visits: locations.slice(0, 100)
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

async function statusCheck(res) {
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

async function getDBConnection() {
  const dbpath = path.join(process.cwd(), "data/data.db");
  const db = await open({
    filename: dbpath,
    driver: sqlite3.Database
  });

  return db;
}

// app.use(express.static('public'));
const PORT = process.env.PORT || 8080;
app.listen(PORT);

module.exports = app;