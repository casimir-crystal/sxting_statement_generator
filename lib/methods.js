const path = require('path');
const fs = require('fs').promises;

const payment = require('./payment');
const formatStatement = require('./format_statement');
const formatDingdingStatement = require('./format_dingding_statement');
const getLastTotals = require('./utils/getLastTotals');
const { toLocaleDateString, StatementFile } = require('./utils/utils');

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleDateString = toLocaleDateString;

const methods = {};

methods.api = {};

methods.reset = async (ctx) => {
  ctx.session = null;
  ctx.redirect('/');
};

methods.deleteStatement = async (ctx) => {
  await new StatementFile(ctx).delete();
  ctx.redirect('/');
};

methods.indexGet = async (ctx) => {
  await ctx.render('index');
};

methods.indexPost = async (ctx) => {
  // fetch the payment data here now
  const paymentData = await payment.fetchPayment(ctx.session.cookie, ctx.session.date);

  let fullInfo = Object.assign(ctx.request.body, paymentData);

  if (!fullInfo['昨日累计_sales']) {
    const lastTotals = await getLastTotals(ctx.session.date, ctx.session.username);
    fullInfo = Object.assign(fullInfo, lastTotals);
  }

  Object.keys(fullInfo).forEach((key) => {
    fullInfo[key] = Number(fullInfo[key]);
  });

  await new StatementFile(ctx).write(JSON.stringify(formatStatement(ctx.session.date, fullInfo)));
  ctx.redirect('/statement');
};

methods.statement = async (ctx) => {
  const statement = await new StatementFile(ctx).read();
  await ctx.render('statement', { statement });
};

methods.dingdingIndexGet = async (ctx) => {
  const yearAndMonth = ctx.session.date.slice(0, 7);

  const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, ctx.session.username, '_dingding');
  const hasMonthlyData = await dingdingMonthFile.isExists();

  await ctx.render('dingding', { hasMonthlyData });
};

methods.dingdingIndexPost = async (ctx) => {
  const paymentData = await payment.fetchPayment(ctx.session.cookie, ctx.session.date);
  ctx.body = await formatDingdingStatement(ctx, paymentData);
};

methods.api.getSavedData = async (ctx) => {
  const { username, password, date } = ctx.request.body;
  ctx.session.date = (new Date(Date.parse(date))).toLocaleDateString();

  ctx.session.username = username;
  ctx.session.cookie = await payment.getLoginCookie(username, password);

  const response = {
    status: false,
    fileExists: false,
    lastTotals: false,
  };

  // failed to login
  if (!ctx.session.cookie) {
    ctx.body = response;
    return;
  }

  response.status = true;

  if ((await getLastTotals(ctx.session.date, ctx.session.username))) {
    response.lastTotals = true;
  }

  if ((await new StatementFile(ctx).isExists())) {
    response.fileExists = true;
  } else if (!ctx.session.cookie) {
    response.status = false;
  }

  // create the username folder to save their statements
  try {
    await fs.mkdir(path.join(__dirname, '..', 'data', ctx.session.username));
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  // sync the data of kaigedian immediately
  payment.syncData(ctx.session.cookie, ctx.session.date);
  ctx.body = response;
};

methods.api.getStatementJson = async (ctx) => {
  const statement = await new StatementFile(ctx).read();
  ctx.body = statement;
};

methods.api.getPaymentData = async (ctx) => {
  // fetch the payment data here now
  const paymentData = await payment.fetchPayment(ctx.session.cookie, ctx.session.date);
  ctx.body = paymentData;
};

methods.api.dingdingSaveMonthly = async (ctx) => {
  const yearAndMonth = ctx.session.date.slice(0, 7);

  const file = new StatementFile(ctx, yearAndMonth, null, '_dingding');
  await file.write(JSON.stringify(ctx.request.body));

  ctx.response.status = 200;
};

module.exports = methods;
