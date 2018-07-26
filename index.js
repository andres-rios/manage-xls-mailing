
'use strict';
const { toCSV } = require('./parseToCSV.js');
const { fork } = require('child_process');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const tmp = require('tmp');
const fs = require('fs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use('/', express.static('static'))
app.post('/upload', multipartMiddleware, async function(req, res, next) {
  const forked = fork('processUpload.js');
  forked.on('message', (msg) => {
    if (msg.action === 'exit') {
      res.json({ msg: 'ok', path: req.files.file.path });
    } else {
      res.json({ msg: 'error', error: msg.error });
    }
    forked.kill();
    fs.unlinkSync(req.files.file.path);
  });

  forked.send({
    action: 'begin', path: req.files.file.path
  });
});

app.get('/download', async function(req, res, next) {
  await toCSV().then(csv => {
    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.fd, csv.toString(), 'utf-8');
    res.download(tmpobj.name, 'export.csv');
    setTimeout(() => {
      tmpobj.removeCallback();
    }, 100);
  }).catch(e => {
    console.error(e);
    next();
  });
});

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelize = new Sequelize('test', 'test', 'test', {
  host: 'localhost',
  dialect: 'postgres'
});


const Videos = sequelize.define('videos', {
  name: Sequelize.TEXT,
  url: Sequelize.TEXT
});
app.get('/videos', async function(req, res, next) {
  const videos = await Videos.findAll({
    order: [
      ['name', 'DESC']
    ]
  });

  res.json(videos);
});
app.put('/videos/:id', async function(req, res, next) {
  const id = ~~req.params.id;
  const updateData = req.body;
  await Videos.update(updateData, { where: { id }});
  res.json(updateData);
});
app.post('/videos', async function(req, res, next) {
  const createData = req.body;
  res.json(await Videos.create(createData));
});


const ManageNames = sequelize.define('manage_names', {
  first_name: {
    type: Sequelize.TEXT,
    primaryKey: true
  },
  c_first_name: Sequelize.TEXT,
  name: Sequelize.TEXT,
  url: Sequelize.TEXT
}, { timestamps: false });
app.get('/manage_names', async function(req, res, next) {

  await ManageNames.findAll({
  }).then(response => {
    res.json(response);
  });

});
app.put('/manage_names/:id', async function(req, res, next) {
  const first_name = req.params.id;
  const updateData = req.body;
  await ManageNames.update(updateData, { where: { first_name }});
  const updated = await ManageNames.findOne({ where: { first_name }});
  res.json(updated);
});


const Columns = sequelize.define('columns', {
  name: Sequelize.TEXT,
  synonym: Sequelize.TEXT
});
app.get('/columns', async function(req, res, next) {
  const columns = await Columns.findAll({
    order: [
      ['name', 'ASC'],
      ['synonym', 'ASC']
    ]
  }).then(response => {
    const columns = response.map(d => {
      return {
        id: Number(d.id),
        name: d.name ? d.name.toString().toLowerCase().trim() : d.name,
        synonym: d.synonym ? d.synonym.toString().toLowerCase().trim() : d.synonym
      };
    });
    return columns;
  });

  res.json(columns);
});
app.put('/columns/:id', async function(req, res, next) {
  const id = ~~req.params.id;
  const updateData = req.body;
  await Columns.update(updateData, { where: { id }});
  res.json(updateData);
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
