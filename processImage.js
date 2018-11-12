// Export the following environment variables to configure access for Google API's and Algolia
//  # export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
//  # export ALGOLIA_APP_ID="your App ID"
//  # export ALGOLIA_API_KEY="Your Admin API key"

const fs = require('fs');
const sharp = require('sharp');
const uuid = require('uuid/v1');
const sqlite3 = require('sqlite3').verbose();

// By default, the Google Vision API client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GCLOUD_PROJECT environment variable. See
// https://googlecloudplatform.github.io/gcloud-node/#/docs/google-cloud/latest/guides/authentication
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();

// This demo uses ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables
// These are located in your Algolia dashboard in the 'API Keys' menu
const algoliasearch = require('algoliasearch');
var algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
var algoliaIndex = algoliaClient.initIndex('algolia_image_search');

// Path to which resized image + thumbnail are saved
const imagePath = './static/images/';


module.exports = {
  process: processImage
}


// Process the specified image file:
// resize it, detect labels and text elements, save it to the DB and add it to the Algolia search index
function processImage(fileName, cb) {
   if (fs.existsSync(fileName)) {
      resizeImage(fileName, (imageID, fileName) => {
         annotateImage(fileName, (labels, texts, landmarks, logos) => {
            updateDB(imageID, labels, texts, landmarks, logos, fileName, () => {
               indexImage(imageID, labels, texts, landmarks, logos, fileName, () => {
                  cb({'imageID': imageID, 'labels' : labels, 'texts': texts, 'landmarks': landmarks, 'logos': logos, 'filename': baseName(fileName)});
               });
            });
         });
      });
   } else {
      console.log('ERROR: File missing: ', fileName);
   }
}


// Resize image and create a thumbnail using sharp
function resizeImage(fileName, cb) {
   var imageID = uuid();
   var imageName = imagePath + imageID + '.png';
   var thumbName = imagePath + imageID + '-thumb.png';
   var inputBuffer = fs.readFileSync(fileName);
   sharp(inputBuffer)
      .resize(320)
      .toFile(thumbName);
   sharp(inputBuffer)
      .resize(1280)
      .max()
      .toFile(imageName);
   cb(imageID, fileName);
}


// Add all image information to the algolia search index
function indexImage(imageID, labels, texts, landmarks, logos, fileName, cb) {
   algoliaIndex.addObject({
      "imageID": imageID,
      "labels": labels,
      "fileName": baseName(fileName),
      "texts": texts,
      "landmarks": landmarks,
      "logos": logos
   }, cb);
}


// Add the image & labels record to the sqlite database
function updateDB(imageID, labels, texts, landmarks, logos, fileName, cb) {
   var db = new sqlite3.Database('./db/images.db');
   // create table on the first run
   if (!fs.existsSync('./db/images.db')) {
      db.run("CREATE TABLE images (imageID TEXT, labels TEXT, texts TEXT, landmarks TEXT, logos TEXT, fileName TEXT)", (err) => {
         if (err) {
            console.log('ERROR', err.message);
         }
      });
   }
   // insert image information
   var sql = 'INSERT INTO images VALUES (?, ?, ?, ?, ?, ?)';
   db.run(sql, imageID, JSON.stringify(labels), texts, landmarks, logos, baseName(fileName), (err) => {
      if (err) {
         return console.error(err.message);
      }
   });
   db.close();
   cb();
}


// Performs label detection on the image using the Google Vision API client
function annotateImage(fileName, cb) {
   const request = {
      "image": {
         "source": {
            "filename": fileName
         }
      },
      "features": [{
            "type": "LABEL_DETECTION"
         },
         {
            "type": "WEB_DETECTION"
         },
         {
            "type": "TEXT_DETECTION"
         },
         {
            "type": "LOGO_DETECTION"
         },
         {
            "type": "LANDMARK_DETECTION"
         }
      ]
   };

   visionClient.annotateImage(request).then((results) => {
      var labels = [];
      const labelsRes = results[0].labelAnnotations;
      labelsRes.forEach(label => labels.push(label.description
               .replace(',""','')
               .replace("\'", "")
               .replace("\'","")
               .toLowerCase()));

      var texts = [];
      const textRes = results[0].textAnnotations;
      textRes.forEach(text => texts.push(text.description));

      var landmarks = [];
      const landmarksRes = results[0].landmarkAnnotations;
      landmarksRes.forEach(landmark => landmarks.push(landmark.description));

      var logos = [];
      const logosRes = results[0].logoAnnotations;
      logosRes.forEach(logo => logos.push(logo.description));

      var webEntities = [];
      const webEntitiesRes = results[0].webDetection.webEntities;
      webEntitiesRes.forEach(entity => webEntities.push(entity.description
               .replace(',""','')
               .replace("\'", "")
               .replace("\'","")
               .toLowerCase()));

      // Merge EXIF web entities tags with the Vision API labels to simplify the data model as they're all image tags
      labels = labels.concat(webEntities);

      // Convert textual labels to a format that's valid & easily matched in javascript

      cb(labels, texts.toString(), landmarks.toString(), logos.toString());
   });
}


// returns the base name of an file path, ie /foo/bar/cat.txt becomes cat.txt
function baseName(path) {
   return path.split('/').reverse()[0];
}
