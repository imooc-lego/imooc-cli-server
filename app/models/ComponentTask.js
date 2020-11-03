'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const userHome = require('user-home');
const Git = require('simple-git');
const OSS = require('./OSSTask');
const config = require('../../config/db');

class ComponentTask {
  constructor({ repo, version, name, branch, buildPath, examplePath }, { ctx }) {
    this._ctx = ctx;
    this._repo = repo;
    this._name = name;
    this._branch = branch;
    this._version = version;
    this._dir = path.resolve(userHome, '.imooc-cli', 'node_modules', `${this._name}@${this._version}`);
    this._sourceCodeDir = path.resolve(this._dir, this._name);
    this._buildPath = path.resolve(this._sourceCodeDir, buildPath);
    this._examplePath = path.resolve(this._sourceCodeDir, examplePath);
    this._buildDir = buildPath;
    this._exampleDir = examplePath;
    fse.ensureDirSync(this._dir);
    fse.emptyDirSync(this._dir);
    this._git = new Git(this._dir);
    this.oss = new OSS(config.OSS_COMPONENT_BUCKET);
  }

  async downloadAndBuild() {
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

  async publishBuild() {
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
            const uploadOSSRes = await this.oss.put(`${this._name}@${this._version}/${this._buildDir}/${file}`, filepath);
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

  async publishExample() {
    return new Promise(resolve => {
      require('glob')('**', {
        cwd: this._examplePath,
        nodir: true,
        ignore: '**/node_modules/**',
      }, (err, files) => {
        if (err) {
          resolve(false);
        } else {
          Promise.all(files.map(async file => {
            const filepath = path.resolve(this._examplePath, file);
            const uploadOSSRes = await this.oss.put(`${this._name}@${this._version}/${this._exampleDir}/${file}`, filepath);
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

  clean() {
    if (fs.existsSync(this._dir)) {
      fse.removeSync(this._dir);
    }
  }
}

module.exports = ComponentTask;
