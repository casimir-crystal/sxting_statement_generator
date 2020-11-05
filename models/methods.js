const path = require('path');
const fs = require('fs').promises;

const payment = require('./payment');
const formatStatement = require('./format_statement');
const formatDingdingStatement = require('./format_dingding_statement');
const getLastTotals = require('./utils/getLastTotals');
const { toLocaleDateString, StatementFile } = require('./utils/utils');

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleDateString = toLocaleDateString;

const methods = new function CreateMethods() {
  this.api = {};

  this.reset = async (ctx) => {
    ctx.session = null;
    ctx.redirect('/');
  };

  this.deleteStatement = async (ctx) => {
    await new StatementFile(ctx).delete();
    ctx.redirect('/');
  };

  this.indexGet = async (ctx) => {
    await ctx.render('index');
  };

  this.indexPost = async (ctx) => {
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

  this.statement = async (ctx) => {
    const statement = await new StatementFile(ctx).read();
    await ctx.render('statement', { statement });
  };

  this.dingdingIndexGet = async (ctx) => {
    const yearAndMonth = ctx.session.date.slice(0, 7);

    const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, ctx.session.username, '_dingding');
    const hasMonthlyData = await dingdingMonthFile.isExists();

    await ctx.render('dingding', { hasMonthlyData });
  };

  this.dingdingIndexPost = async (ctx) => {
    ctx.body = await formatDingdingStatement(ctx);
  };

  this.api.savedInfo = async (ctx) => {
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
    if (!ctx.session.isPassed && !ctx.session.cookie) {
      ctx.body = response;
      return;
    }

    response.status = true;
    ctx.session.isPassed = true;

    if ((await getLastTotals(ctx.session.date, ctx.session.username))) {
      response.lastTotals = true;
    }

    if ((await new StatementFile(ctx).isExists())) {
      response.fileExists = true;
    } else if (!ctx.session.cookie) {
      response.status = false;
      ctx.session.isPassed = false;
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

  this.api.statementJson = async (ctx) => {
    const statement = await new StatementFile(ctx).read();
    ctx.body = statement;
  };

  this.api.dingdingSaveMonthly = async (ctx) => {
    const yearAndMonth = ctx.session.date.slice(0, 7);

    const file = new StatementFile(ctx, yearAndMonth, null, '_dingding');
    await file.write(JSON.stringify(ctx.request.body));

    ctx.response.status = 200;
  };
}();

module.exports = methods;
