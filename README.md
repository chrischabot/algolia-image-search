# Algolia Image Search

With the advances of ML and being able to detect elements, logos, texts and landmarks in images, the world of searchable information is vastly increasing.

This demo app shows how to combine Google's Vision API image detection with Algolia's search functionality to make images searchable.

# Setup

## Configuring Authentication

This demo requires both a Google API credentials.json file used to configure service access to the Vision API's, as well as an Algolia Application ID and Admin API Key.

To setup the Google authentication follow the instructions at https://cloud.google.com/vision/docs/

The Algolia App ID and Admin Key can be found in your Algolia Dashboard under the "Api Keys" menu.

Once those are obtained, use these environment variables to configure access:

```
# export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
# export ALGOLIA_APP_ID="your App ID"
# export ALGOLIA_API_KEY="Your Admin API key"
```

## Installing dependencies

Make sure you have the latest version of Node.js installed, and run the following commands to install the dependencies for this demo app:

```
cd algolia-image-search
npm install node-gyp
npm install grpc --build-from-source
npm install
```
## Running the image importer

The demo app comes with sample images in the example_images directory. To import them, create a `algolia_image_search` index in your Algolia dashboard, and run the following command:
```
node import.js example_images/*
```

Once completed, visit the indices section in your dashboard, and select only `labels` as Searchable attribute.

## Running the demo

Run `node index.html` and visit http://localhost:8080/ to view the application.
