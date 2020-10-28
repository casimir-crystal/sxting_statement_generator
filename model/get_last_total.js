const fs = require('fs').promises;
const { toLocaleDateString, StatementFile } = require("./utils");

Date.prototype.toLocaleDateString = toLocaleDateString;

async function getLastTotal(date, username) {
  let _date = new Date(Date.parse(date));

  // if today is the first day of a month, yesterday's statement could be empty
  if (_date.getDate() === 1) {
    return {
      '小程序累计_sales': 0,
      '昨日累计_sales': 0,
      '昨日累计_amount': 0,
    };
  }

  _date.setDate(_date.getDate() - 1);
  let yesterday = _date.toLocaleDateString();


  const statement = await new StatementFile(null, yesterday, username).read();
  if (!statement) return false;

  return {
    '小程序累计_sales': statement['小程序累计'],
    '昨日累计_sales': statement['累计营业额'],
    '昨日累计_amount': statement['累计GC']
  };

}

module.exports = getLastTotal;