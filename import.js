   // Command line import tool to manually import 1 or multiple images
//   # node import.js /path/to/image.jpg

// To run, export the following environment variables to configure access for Google API's and Algolia
//  # export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
//  # export ALGOLIA_APP_ID="your App ID"
//  # export ALGOLIA_API_KEY="Your Admin API key"


const fs = require('fs');
var processImage = require('./processImage.js');

// main loop -- run processImage on each of the images specified in the command line parameters
process.argv.forEach(function(fileName, index, array) {
   // # node import.js path/to/image.jpg
   // becomes index 0 = node, index 1 = import.js, so start processing at index 2
   if (index > 1) {
      if (!fs.existsSync(fileName)) {
         console.log('Invalid file: ', fileName);
      } else {
         processImage.process(fileName, (result) => {
            console.log('Result for ', fileName);
            console.log(result);
         });
      }
   }
});
