"use strict";
const path = require("path");
const fs = require('fs').promises;

class StatementFile {
  constructor(ctx, date=null, username=null, suffix='') {
    date     = date     || ctx.session.date     || ctx.query.date;
    username = username || ctx.session.username || ctx.query.username;

    this.filePath = path.join(__dirname, "..", "data", username, `${date}${suffix}.json`);
  }

  async _takeCare(method, returnValue=false) {
    let value;

    try {
      value = await method(this.filePath);
    } catch(error) {
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
    return await fs.writeFile(this.filePath, content);
  }

  async isExists() {
    return await this._takeCare(fs.access);
  }

  async delete() {
    return await this._takeCare(fs.unlink);
  }
}

function toLocaleDateString() {
  const _date = new Date(Date.parse(this));
  return [_date.getFullYear(), _date.getMonth() + 1, _date.getDate()].join("-");
}

module.exports = {
  StatementFile: StatementFile,
  toLocaleDateString: toLocaleDateString,
};
