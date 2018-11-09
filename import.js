const fs = require('fs');
const sharp = require('sharp');
const uniqueFilename = require('unique-filename')
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();
var sqlite3 = require('sqlite3').verbose();
const algoliasearch = require('algoliasearch');
var algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
var algoliaIndex = algoliaClient.initIndex('algolia_image_search');

// export GOOGLE_APPLICATION_CREDENTIALS=/Users/chrischabot/Projects/algolia-image-search/credentials.json
// export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
// export ALGOLIA_APP_ID="your App ID"
// export ALGOLIA_API_KEY="Your Admin API key"


function processImage(fileName, cb) {
   if (fs.existsSync(fileName)) {
      resizeImage(fileName, (imageName, thumbName) => {
         detectLabels(fileName, (labels) => {
            updateDB(imageName, thumbName, labels, () => {
               indexImage(imageName, thumbName, labels, () => {
                  cb(labels);
               });
            });
         });
      });
   } else {
      console.log('ERROR: File doesnt exist');
   }
}

// Resize image and create a thumbnail using sharp
function resizeImage(fileName, cb) {
   var tempName = uniqueFilename('./static/images/', 'img');
   var imageName = tempName + '.png';
   var thumbName = tempName + '-thumb.png';
   var inputBuffer = fs.readFileSync(fileName);
   sharp(inputBuffer)
      .resize(320)
      .toFile(thumbName);
   sharp(inputBuffer)
      .resize(1280)
      .toFile(imageName);
   cb(imageName, thumbName);
}

// Add image data to algolia
function indexImage(imageName, thumbName, labels, cb) {
   algoliaIndex.addObject({
      "objectID": imageName,
      "labels": labels,
      "thumb": thumbName
   }, cb);
}

// Add the image & labels record to the sqlite database
function updateDB(imageName, thumbName, labels, cb) {
   var db = new sqlite3.Database('./db/images.db');
   // create table on the first run
   if (!fs.existsSync('./db/images.db')) {
      db.run("CREATE TABLE images (imageName TEXT, thumbName TEXT, labels TEXT)", (err) => {
         if (err) {
            console.log('ERROR', err.message);
         }
      });
   }
   // insert image information
   var sql = 'INSERT INTO images VALUES (?, ?, ?)';
   db.run(sql, imageName, thumbName, JSON.stringify(labels), (err) => {
      if (err) {
         return console.error(err.message);
      }
   });
   db.close();
   cb(imageName, thumbName, labels);
}

// Performs label detection on the image
function detectLabels(fileName, cb) {
   visionClient
      .labelDetection(fileName)
      .then(results => {
         var ret = [];
         const labels = results[0].labelAnnotations;
         labels.forEach(label => ret.push(label.description));
         cb(ret);
      })
      .catch(err => {
         console.error('ERROR:', err);
      });
}

// main loop -- run processImage on each of the images specified in the command line parameters
process.argv.forEach(function(fileName, index, array) {
   // index 0 = node, index 1 = import.js, start processing at index 2
   if (index > 1) {
      if (!fs.existsSync(fileName)) {
         console.log('Invalid file: ', fileName);
      } else {
         processImage(fileName, (results) => {
            console.log('Labels for ', fileName);
            console.log(results);
         });
      }
   }
});
