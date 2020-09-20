'use strict';

const Controller = require('egg').Controller;
const mongo = require('../utils/mongo');

class ProjectController extends Controller {
  async getTemplate() {
    const { ctx } = this;
    const data = await mongo().query('template');
    if (data && data.length > 0) {
      ctx.body = data;
    } else {
      ctx.body = [];
    }
  }
}

module.exports = ProjectController;
