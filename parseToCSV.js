'use strict';

const json2csv = require('json2csv').parse;
const { Client } = require('pg');

async function parse() {
  const client = new Client({
      user: 'test',
      host: 'localhost',
      database: 'test',
      password: 'test',
      port: 5432,
  });
  await client.connect();
  const result = await client.query('SELECT id, first_name, last_name, email, position, company, site FROM as_is')
    .then(data => {
      const fields = ['first_name', 'last_name', 'email', 'position', 'company'];
      const csv = json2csv(data.rows, { fields });
      return csv;
    })
    .catch(e => console.error(e.stack));

  client.end();
  return result;
}

module.exports = {
  toCSV: parse
};
