'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const userHome = require('user-home');
const Git = require('simple-git');
const OSS = require('./OSSTask');
const config = require('../../config/db');

const SUCCESS = 0;
const FAILED = -1;

class CloudBuildTask {
  constructor({ repo, type, name, branch, version, prod, keepCache, cnpm, buildCmd }, { ctx }) {
    this._ctx = ctx;
    this._repo = repo;
    this._type = type;
    this._name = name;
    this._branch = branch;
    this._version = version;
    this._prod = prod;
    this._keepCache = keepCache;
    this._cnpm = cnpm;
    this._buildCmd = buildCmd;
    this._dir = path.resolve(userHome, '.imooc-cli', 'cloudbuild', `${this._name}@${this._version}`);
    this._sourceCodeDir = path.resolve(this._dir, this._name);
    this.log('this._dir', this._dir);
    this.log('this._sourceCodeDir', this._sourceCodeDir);
  }

  async prepare() {
    fse.ensureDirSync(this._dir);
    fse.emptyDirSync(this._dir);
    this._git = new Git(this._dir);
    if (this.isProd()) {
      this.oss = new OSS(config.OSS_PROD_BUCKET);
    } else {
      this.oss = new OSS(config.OSS_DEV_BUCKET);
    }
    return this.success();
  }

  async download() {
    await this._git.clone(this._repo);
    this._git = new Git(this._sourceCodeDir);
    await this._git.checkout([
      '-b',
      this._branch,
      `origin/${this._branch}`,
    ]);
    if (fs.existsSync(this._sourceCodeDir)) {
      return true;
    }
    return false;
  }

  async install() {
    let res = true;
    if (this.isCnpm()) {
      res && (res = await this.execCommand('cnpm install'));
    } else {
      res && (res = await this.execCommand('npm install --only=prod --registry=https://registry.npm.taobao.org'));
      res && (res = await this.execCommand('npm install --only=dev --registry=https://registry.npm.taobao.org'));
    }
    return res;
  }

  async build() {
    let res = true;
    if (this._buildCmd && this._buildCmd.startsWith('npm run build')) {
      res && (res = await this.execCommand(this._buildCmd));
    } else {
      res && (res = await this.execCommand('npm run build'));
    }
    return res;
  }

  async prePublish() {
    const buildPath = this.findBuildPath();
    if (!buildPath) {
      return this.failed('未找到构建路径，请检查');
    }
    this._buildPath = buildPath;
    return this.success();
  }

  async publish() {
    return new Promise(resolve => {
      require('glob')('**', {
        cwd: this._buildPath,
        nodir: true,
        ignore: '**/node_modules/**',
      }, (err, files) => {
        if (err) {
          resolve(false);
        } else {
          Promise.all(files.map(async file => {
            const filepath = path.resolve(this._buildPath, file);
            const uploadOSSRes = await this.oss.put(`${this._name}/${file}`, filepath);
            return uploadOSSRes;
          })).then(() => {
            resolve(true);
          }).catch(err => {
            this.log(err);
            resolve(false);
          });
        }
      });
    });
  }

  log(msg, data) {
    this._ctx.logger.info(msg, data);
  }

  success(message, data) {
    return this.response(SUCCESS, message, data);
  }

  failed(message, data) {
    return this.response(FAILED, message, data);
  }

  response(code, message, data) {
    return {
      code,
      message,
      data,
    };
  }

  findBuildPath() {
    const buildDir = [ 'dist', 'build' ];
    const buildPath = buildDir.find(dir => fs.existsSync(path.resolve(this._sourceCodeDir, dir)));
    this.log('buildPath', buildPath);
    if (buildPath) {
      return path.resolve(this._sourceCodeDir, buildPath);
    }
    return null;
  }

  clean() {
    if (fs.existsSync(this._dir) && !this.isKeepCache()) {
      this.log('do clean', this._dir);
      fse.removeSync(this._dir);
    }
  }

  execCommand(command) {
    const commands = command.split(' ');
    if (commands.length === 0) {
      return null;
    }
    const firstCommand = commands[0];
    const leftCommand = commands.slice(1) || [];
    return new Promise(resolve => {
      const p = exec(firstCommand, leftCommand, {
        cwd: this._sourceCodeDir,
      }, { stdio: 'pipe' });
      p.on('error', e => {
        this._ctx.logger.error('build error', e);
        resolve(false);
      });
      p.on('exit', c => {
        this._ctx.logger.debug('build exit', c);
        resolve(true);
      });
      p.stdout.on('data', data => {
        this._ctx.socket.emit('building', data.toString());
      });
      p.stderr.on('data', data => {
        this._ctx.socket.emit('building', data.toString());
      });
    });
  }

  isProd() {
    return this._prod === 'true';
  }

  isKeepCache() {
    return this._keepCache === 'true';
  }

  isCnpm() {
    return this._cnpm === 'true';
  }
}

function exec(command, args, options) {
  const win32 = process.platform === 'win32';

  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? [ '/c' ].concat(command, args) : args;

  return require('child_process').spawn(cmd, cmdArgs, options || {});
}

module.exports = CloudBuildTask;
