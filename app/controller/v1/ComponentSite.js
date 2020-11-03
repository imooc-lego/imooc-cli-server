'use strict';

const Controller = require('egg').Controller;
const mongo = require('../../utils/mongo');

class ComponentSiteController extends Controller {
  async index() {
    const { ctx } = this;
    const data = await mongo().query('componentSite');
    if (data && data.length > 0) {
      ctx.body = data[0];
    } else {
      ctx.body = {};
    }
  }
}

module.exports = ComponentSiteController;
