'use strict';

const Sequelize = require('sequelize');
const XLSX = require('xlsx');
const Op = Sequelize.Op;

const sequelize = new Sequelize('test', 'test', 'test', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

const Entry = sequelize.define('as_is', {
  site: Sequelize.TEXT,
  name: Sequelize.TEXT,
  position: Sequelize.TEXT,
  email: Sequelize.TEXT,
  linkedin_profile: Sequelize.TEXT,
  company: Sequelize.TEXT,
  headquarters: Sequelize.TEXT,
  session_time: Sequelize.DATE
});

const Columns = sequelize.define('columns', {
  name: Sequelize.TEXT,
  synonym: Sequelize.TEXT
});


async function parse(path) {
  const notfound_cols = [];
  const parsed = XLSX.readFile(path);
  const columns = await Columns.findAll({
    where: {
      name: {
        [Op.ne]: null
      }
    }
  }).then(response => {
    const columns = response.map(d => {
      return {
        name: d.name.toString().toLowerCase().trim(),
        synonym: d.synonym.toString().toLowerCase().trim()
      };
    }).filter(d => {
      if (d.name) return true;
      return false;
    });
    return columns;
  });

  console.log('parsing');
  const sheets = Object.keys(parsed.Sheets).reduce((acc, key) => {
    console.log(key);
    acc[key] = XLSX.utils.sheet_to_json(parsed.Sheets[key]);
    return acc;
  }, {});
  console.log('sheets parsed');

  const t = sequelize.transaction().then(async function(t) {
    const session_time = new Date();
    async function createquery(row, i, arr) {
      let row_;
      try {
        row_ = Object.keys(row).reduce((acc, key) => {
          const column = columns.find(d => d.synonym === key.trim().toLowerCase());
          if (!column) {
            if (notfound_cols.find(d => d === key)) {
            } else {
              notfound_cols.push(key);
            }
          } else {
            acc[column.name] = row[key].toString().trim();
          }
          return acc;
        }, {});
      } catch(e) {
        console.error(e);
      }
      try {
        if (row_.email && row_.name) {
          row_.session_time = session_time;
          await Entry.create(row_, { transaction: t });
        }
      } catch(e) {
        console.log(row_, e);
      }
    }

    async function process_sheet(key, i) {
      const rows = sheets[key];
      return await rows.map(createquery);
    }

    await Object.keys(sheets).map(process_sheet);
    console.log('commit');
    await t.commit();
    console.log('done');
  });

  await t;
  console.log('synonyms...');
  await notfound_cols.map(async function(synonym) {
    console.log('>', synonym);
    return await Columns.create({
      synonym: synonym
    });
  });
  console.log('...synonyms done');
  console.log('finally');
}

module.exports = {
  toSQL: parse
};
