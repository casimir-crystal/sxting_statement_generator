/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
const path = require('path');
const fs = require('fs').promises;

class StatementFile {
  constructor(ctx, date = null, username = null, suffix = '') {
    date = date || ctx.session.date; // eslint-disable-line
    username = username || ctx.session.username; // eslint-disable-line

    this.filePath = path.join(__dirname, '..', '..', 'data', username, `${date}${suffix}.json`);
  }

  async _takeCare(method, returnValue = false) {
    let value;

    try {
      value = await method(this.filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return false;
    }

    if (returnValue) return value;
    return true;
  }

  async read() {
    return JSON.parse(await this._takeCare(fs.readFile, true));
  }

  async write(content) {
    await fs.writeFile(this.filePath, content);
  }

  async isExists() {
    const status = await this._takeCare(fs.access);
    return status;
  }

  async delete() {
    await this._takeCare(fs.unlink);
  }
}

function toLocaleDateString() {
  const date = new Date(Date.parse(this));
  return [
    date.getFullYear(),
    (`0${date.getMonth() + 1}`).slice(-2),
    (`0${date.getDate()}`).slice(-2),
  ].join('-');
}

module.exports = {
  StatementFile,
  toLocaleDateString,
};
