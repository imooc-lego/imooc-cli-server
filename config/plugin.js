'use strict';

/** @type Egg.EggPlugin */
exports.io = {
  enable: true,
  package: 'egg-socket.io',
};

exports.redis = {
  enable: true,
  package: 'egg-redis',
};

exports.mysql = {
  enable: true,
  package: 'egg-mysql',
};

exports.security = {
  enable: false,
};

exports.cors = {
  enable: true,
  package: 'egg-cors',
};
