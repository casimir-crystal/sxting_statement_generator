const { toLocaleDateString, StatementFile } = require('./utils');

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleDateString = toLocaleDateString;

async function getLastTotal(date, username) {
  const dateObject = new Date(Date.parse(date));

  // if today is the first day of a month, yesterday's statement could be empty
  if (dateObject.getDate() === 1) {
    return {
      小程序累计_sales: 0,
      昨日累计_sales: 0,
      昨日累计_amount: 0,
    };
  }

  dateObject.setDate(dateObject.getDate() - 1);
  const yesterday = dateObject.toLocaleDateString();

  const statement = await new StatementFile(null, yesterday, username).read();
  if (!statement) return false;

  return {
    小程序累计_sales: statement['小程序累计'],
    昨日累计_sales: statement['累计营业额'],
    昨日累计_amount: statement['累计GC'],
  };
}

module.exports = getLastTotal;
