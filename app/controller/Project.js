'use strict';

const Controller = require('egg').Controller;
const OSS = require('../models/OSSTask');
const mongo = require('../utils/mongo');
const config = require('../../config/db');
const { PROJECT_TYPE_PROD } = require('../const');

function success(message, data) {
  return {
    code: 0,
    message,
    data,
  };
}

function failed(message, data) {
  return {
    code: -1,
    message,
    data,
  };
}

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

  async getOSSProject() {
    const { ctx } = this;
    const ossProjectName = ctx.query.name;
    let ossProjectType = ctx.query.type;
    if (!ossProjectName) {
      ctx.body = failed('项目名称不存在');
      return;
    }
    if (!ossProjectType) {
      ossProjectType = PROJECT_TYPE_PROD;
    }
    let oss;
    if (ossProjectType === PROJECT_TYPE_PROD) {
      oss = new OSS(config.OSS_PROD_BUCKET);
    }
    if (oss) {
      const fileList = await oss.list(`${ossProjectName}/`);
      ctx.body = success('获取项目文件成功', fileList);
      return;
    }
    ctx.body = failed('获取项目文件失败');
  }
}

module.exports = ProjectController;
