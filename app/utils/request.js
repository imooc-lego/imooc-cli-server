'use strict';

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

module.exports = {
  success,
  failed,
};
