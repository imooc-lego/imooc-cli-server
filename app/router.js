'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, io } = app;

  // http request
  router.get('/project/template', controller.project.getTemplate);
  router.get('/project/oss', controller.project.getOSSProject);
  router.get('/oss/get', controller.project.getOSSFile);
  router.resources('components', '/api/v1/components', controller.v1.components);
  router.resources('componentSite', '/api/v1/componentSite', controller.v1.componentSite);

  // socket.io
  io.of('/').route('build', io.controller.nsp.build);
};
