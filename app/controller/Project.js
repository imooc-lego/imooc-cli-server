'use strict';

const Controller = require('egg').Controller;
const OSS = require('../models/OSSTask');
const mongo = require('../utils/mongo');
const config = require('../../config/db');
const { PROJECT_TYPE_PROD } = require('../const');
const { success, failed } = require('../utils/request');

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
    } else {
      oss = new OSS(config.OSS_DEV_BUCKET);
    }
    if (oss) {
      const fileList = await oss.list(`${ossProjectName}/`);
      ctx.body = success('获取项目文件成功', fileList);
      return;
    }
    ctx.body = failed('获取项目文件失败');
  }

  async getOSSFile() {
    const { ctx } = this;
    const file = ctx.query.name;
    let ossProjectType = ctx.query.type;
    if (!file) {
      ctx.body = failed('请提供OSS文件名称');
      return;
    }
    if (!ossProjectType) {
      ossProjectType = PROJECT_TYPE_PROD;
    }
    let oss;
    if (ossProjectType === PROJECT_TYPE_PROD) {
      oss = new OSS(config.OSS_PROD_BUCKET);
    } else {
      oss = new OSS(config.OSS_DEV_BUCKET);
    }
    if (oss) {
      const fileList = await oss.list(file);
      ctx.body = success('获取项目文件成功', fileList);
      return;
    }
    ctx.body = failed('获取项目文件失败');
  }
}

module.exports = ProjectController;
