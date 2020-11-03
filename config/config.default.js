/* eslint valid-jsdoc: "off" */

'use strict';

const { REDIS_PWD, REDIS_PORT, REDIS_HOST, MYSQL_PWD, MYSQL_DB, MYSQL_USER, MYSQL_PORT, MYSQL_HOST } = require('./db');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1600481410432_2197';

  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  config.cluster = {
    listen: {
      port: 7002,
    },
  };

  config.redis = {
    client: {
      port: REDIS_PORT,
      host: REDIS_HOST,
      password: REDIS_PWD,
      db: 0,
    },
  };

  config.io = {
    init: {
      wsEngine: 'ws',
    },
    namespace: {
      '/': {
        connectionMiddleware: [
          'auth',
        ],
        packetMiddleware: [],
      },
    },

    redis: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PWD,
      db: 0,
    },
  };

  // mysql
  config.mysql = {
    client: {
      // host
      host: MYSQL_HOST,
      // 端口号
      port: MYSQL_PORT,
      // 用户名
      user: MYSQL_USER,
      // 密码
      password: MYSQL_PWD,
      // 数据库名
      database: MYSQL_DB,
    },
    // 是否加载到 app 上，默认开启
    app: true,
    // 是否加载到 agent 上，默认关闭
    agent: false,
  };

  return {
    ...config,
    ...userConfig,
  };
};
