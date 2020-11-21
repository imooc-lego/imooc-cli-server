'use strict';

const Controller = require('egg').Controller;
const CloudBuildTask = require('../../models/CloudBuildTask');
const PREFIX = 'cloudbuild';

async function createCloudBuildTask(ctx, app) {
  const { socket, helper } = ctx;
  const client = socket.id;
  const redisKey = `${PREFIX}:${client}`;
  const redisTask = await app.redis.get(redisKey);
  const task = JSON.parse(redisTask);
  socket.emit('build', helper.parseMsg('create task', {
    message: '创建启动云构建任务',
  }));
  return new CloudBuildTask({
    repo: task.repo,
    type: task.type,
    name: task.name,
    branch: task.branch,
    version: task.version,
    prod: task.prod,
    keepCache: task.keepCache,
    cnpm: task.cnpm,
    buildCmd: task.buildCmd,
  }, { ctx, app });
}

async function prepare(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('prepare', {
    message: '开发执行构建前检查',
  }));
  const prepareRes = await cloudBuildTask.prepare();
  if (!prepareRes || prepareRes.code === -1) {
    socket.emit('build', helper.parseMsg('prepare failed', {
      message: '执行构建检查失败，失败原因：' + prepareRes.message,
    }));
    return;
  }
  socket.emit('build', helper.parseMsg('prepare', {
    message: '构建前检查成功',
  }));
}

async function download(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('download repo', {
    message: '开始下载源码',
  }));
  const downloadRes = await cloudBuildTask.download();
  if (!downloadRes) {
    socket.emit('build', helper.parseMsg('download failed', {
      message: '源码下载失败',
    }));
    return;
  }
  socket.emit('build', helper.parseMsg('download repo', {
    message: '源码下载成功',
  }));
}

async function install(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('build', {
    message: '开始安装依赖',
  }));
  const buildRes = await cloudBuildTask.install();
  if (!buildRes) {
    socket.emit('build', helper.parseMsg('build failed', {
      message: '依赖安装失败',
    }));
    return;
  }
  socket.emit('build', helper.parseMsg('build', {
    message: '依赖安装成功',
  }));
}

async function build(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('build', {
    message: '开启启动云构建',
  }));
  const buildRes = await cloudBuildTask.build();
  if (!buildRes) {
    socket.emit('build', helper.parseMsg('build failed', {
      message: '云构建失败',
    }));
    return;
  }
  socket.emit('build', helper.parseMsg('build', {
    message: '云构建成功',
  }));
}

async function prePublish(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('pre-publish', {
    message: '开始发布前检查',
  }));
  const prePublishRes = await cloudBuildTask.prePublish();
  if (!prePublishRes || prePublishRes.code === -1) {
    socket.emit('build', helper.parseMsg('pre-publish failed', {
      message: '发布前检查失败，失败原因：' + prePublishRes.message,
    }));
    throw new Error('发布终止');
  }
  socket.emit('build', helper.parseMsg('pre-publish', {
    message: '发布前检查通过',
  }));
}

async function publish(cloudBuildTask, socket, helper) {
  socket.emit('build', helper.parseMsg('publish', {
    message: '开始发布',
  }));
  const publishRes = await cloudBuildTask.publish();
  if (!publishRes) {
    socket.emit('build', helper.parseMsg('publish failed', {
      message: '发布失败',
    }));
    return;
  }
  socket.emit('build', helper.parseMsg('publish', {
    message: '发布成功',
  }));
}

class NspController extends Controller {
  async build() {
    const { ctx, app } = this;
    const { socket, helper } = ctx;
    const cloudBuildTask = await createCloudBuildTask(ctx, app);
    try {
      await prepare(cloudBuildTask, socket, helper);
      await download(cloudBuildTask, socket, helper);
      await install(cloudBuildTask, socket, helper);
      await build(cloudBuildTask, socket, helper);
      await prePublish(cloudBuildTask, socket, helper);
      await publish(cloudBuildTask, socket, helper);
      await cloudBuildTask.clean();
      socket.emit('build', helper.parseMsg('build success', {
        message: `云构建成功，访问链接：https://${cloudBuildTask.isProd() ? 'imooc' : 'imooc-dev'}.youbaobao.xyz/${cloudBuildTask._name}/index.html`,
      }));
      socket.disconnect();
    } catch (error) {
      socket.emit('build', helper.parseMsg('error', {
        message: '云构建失败，失败原因：' + error.message,
      }));
      await cloudBuildTask.clean();
      socket.disconnect();
    }
  }
}

module.exports = NspController;
