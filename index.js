const express = require('express')
const app = express()
const port = 8080
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/images.db');

app.use(express.static('static'))

app.get('/', (req, res) => {
   var template = fs.readFileSync('./static/template.html').toString();
   var images = '';
   db.all('SELECT * FROM images ORDER BY fileName', [], (err, rows) => {
      if (err) {
         console.error('sqlite error: ', err);
      }
      rows.forEach((row) => {
         images = images + '<div class="image-thumb" style="background-image: url(\'/images/' + row.imageID + '-thumb.png"\') data-labels=\'' + row.labels + '\'></div>' + "\n";
      });
      var ret = template.replace('{images}', images);
      res.send(ret);
   });
});

app.listen(port, () => console.log(`Algolia image search is listening on port ${port}`))
