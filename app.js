const express = require('express');
const { engine } = require('express-handlebars');
const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');

const app = express();

app.engine('hbs', engine({ extname: '.hbs', defaultLayout: false }));app.set('view engine', 'hbs');
app.set('views', './views');

app.use(express.static('public'));

const uploadsDir = './public/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).send('Error parsing form: ' + err.message);
    }

    const name   = fields.name?.[0];
    const email  = fields.email?.[0];
    const course = fields.course?.[0];

    const uploadedFile = files.profilePicture?.[0];
    if (!uploadedFile || uploadedFile.size === 0) {
      return res.status(400).send('Please upload a profile picture.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(uploadedFile.headers['content-type'])) {
      return res.status(400).send('Only .jpg, .jpeg, and .png files are allowed.');
    }

    const originalName = path.basename(uploadedFile.originalFilename);
    const destination  = path.join(uploadsDir, originalName);

    fs.rename(uploadedFile.path, destination, (renameErr) => {
      if (renameErr) {
        const readStream  = fs.createReadStream(uploadedFile.path);
        const writeStream = fs.createWriteStream(destination);
        readStream.pipe(writeStream);
        writeStream.on('finish', () => {
          fs.unlink(uploadedFile.path, () => {}); // clean up temp file
          renderProfile();
        });
        writeStream.on('error', (e) => res.status(500).send('File save error: ' + e.message));
      } else {
        renderProfile();
      }
    });

    function renderProfile() {
      res.render('profile', {
        name,
        email,
        course,
        imagePath: `/uploads/${originalName}`,
      });
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/register to get started`);
});
