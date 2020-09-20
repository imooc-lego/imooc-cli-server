'use strict';

const Mongodb = require('@pick-star/cli-mongodb');
const { mongodbUrl, mongodbDbName } = require('../../config/db');

function mongo() {
  return new Mongodb(mongodbUrl, mongodbDbName);
}

module.exports = mongo;
