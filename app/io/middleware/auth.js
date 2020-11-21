'use strict';

const PREFIX = 'cloudbuild';
const CloudBuildTask = require('../../models/CloudBuildTask');

module.exports = () => {
  return async (ctx, next) => {
    const { app, socket, logger, helper } = ctx;
    const id = socket.id;
    const task = id;
    try {
      const nsp = app.io.of('/');
      const query = socket.handshake.query;

      socket.emit(id, helper.parseMsg('connect', {
        type: 'connect',
        message: '云构建服务连接成功',
      }));
      const tick = (id, msg) => {
        logger.debug('#tick', id, msg);
        // 踢出用户前发送消息
        socket.emit(id, helper.parseMsg('deny', msg));
        // 调用 adapter 方法踢出用户，客户端触发 disconnect 事件
        nsp.adapter.remoteDisconnect(id, true, err => {
          logger.error(err);
        });
      };
      let hasTask = await app.redis.get(`${PREFIX}:${task}`);
      if (!hasTask) {
        await app.redis.set(`${PREFIX}:${task}`, JSON.stringify(query));
      }
      logger.info('query', JSON.stringify(query));
      hasTask = await app.redis.get(`${PREFIX}:${task}`);
      if (!hasTask) {
        tick(id, {
          type: 'deleted',
          message: '云构建任务创建失败，自动退出',
        });
        return;
      }
      socket.join(task);

      await next();

      logger.info('#leave', task);
      if (hasTask) {
        // 兜底逻辑，确保缓存文件被删除
        const cloudBuildTask = new CloudBuildTask({
          repo: query.repo,
          type: query.type,
          name: query.name,
          branch: query.branch,
          version: query.version,
          prod: query.prod,
          keepCache: query.keepCache,
          cnpm: query.cnpm,
          buildCmd: query.buildCmd,
        }, { ctx, app });
        cloudBuildTask.clean();
        await app.redis.del(`${PREFIX}:${task}`);
      }
    } catch (e) {
      logger.error('build error', e.message);
      await app.redis.del(`${PREFIX}:${task}`);
    }
  };
};
