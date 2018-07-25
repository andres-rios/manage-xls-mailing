'use strict';

const { toSQL } = require('./parseToSQL.js');

process.on('message', async (msg) => {
  try {
    await toSQL(msg.path);
    process.send({
      action: 'exit'
    });
  } catch(e) {
    process.send({
      action: 'error',
      error: e
    });
    console.error(e);
  }
});
