'use strict';
const path = require('path');
const fs = require('fs').promises;

const payment = require('./payment');
const formatStatement = require('./format_statement');
const formatDingdingStatement = require('./format_dingding_statement');
const getLastTotal = require('./utils/get_last_total');
const { toLocaleDateString, StatementFile } = require("./utils/utils");


Date.prototype.toLocaleDateString = toLocaleDateString;

const methods = new function() {
  this.api = {};

  this.reset = async ctx => {
    ctx.session = null;
    ctx.redirect('/');
  };

  this.deleteStatement = async ctx => {
    await new StatementFile(ctx).delete();
    ctx.redirect('/');
  };

  this.indexGet = async ctx => {
    await ctx.render('index');
  };

  this.indexPost = async ctx => {
    // fetch the payment data here now
    const paymentData = await payment.fetchPayment(ctx.session.cookie, ctx.session.date);

    let fullInfo = Object.assign(ctx.request.body, paymentData);

    // if yesterday's statement exists, we need to assign these data to `fullInfo`
    let yesterdayAllSalesAndGC = await getLastTotal(ctx.session.date, ctx.session.username);
    if (yesterdayAllSalesAndGC) fullInfo = Object.assign(fullInfo, yesterdayAllSalesAndGC);

    for (let key of Object.keys(fullInfo)) {
      fullInfo[key] = Number(fullInfo[key]);
    }

    await new StatementFile(ctx).write(JSON.stringify(formatStatement(ctx.session.date, fullInfo)));
    ctx.redirect('/fetch_statement');
  };


  this.fetchStatement = async ctx => {
    const statement = await new StatementFile(ctx).read();
    await ctx.render('fetch_statement', { statement });
  };

  this.dingdingIndexGet = async ctx => {
    const yearAndMonth = ctx.session.date.slice(0, 7);

    const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, ctx.session.username, '_dingding');
    const hasMonthlyData = await dingdingMonthFile.isExists();

    await ctx.render('dingding', { hasMonthlyData });
  };

  this.dingdingIndexPost = async ctx => {
    ctx.body = await formatDingdingStatement(ctx);
  };

  this.api.requestFromBackground = async ctx => {
    let { username, password, date } = ctx.request.body;
    ctx.session.date = (new Date(Date.parse(date))).toLocaleDateString();

    ctx.session.username = username;
    ctx.session.cookie = await payment.getLoginCookie(username, password);

    if (!ctx.session.cookie) {
      ctx.response.status = 400;  // failed to login
      return;
    }

    // create folder to save this user's statements
    try {
      await fs.mkdir(path.join(__dirname, '..', 'data', ctx.session.username));
    } catch(error) {
      if (error.code !== 'EEXIST') throw error;
    }

    // sync the data of kaigedian immediately
    payment.syncData(ctx.session.cookie, ctx.session.date);
    ctx.response.status = 200;
  };

  this.api.isYesterdayStatementExists = async ctx => {
    const yesterdayStatementExists = await getLastTotal(ctx.session.date, ctx.session.username);

    if (yesterdayStatementExists) {
      ctx.response.status = 200;  // OK
    } else {
      ctx.response.status = 400;  // NO
    }
  };

  this.api.fetchStatementJson = async ctx => {
    const statement = await new StatementFile(ctx).read();
    ctx.body = statement;
  };

  this.api.dingdingSaveMonthly = async ctx => {
    const yearAndMonth = ctx.session.date.slice(0, 7);
  
    const file = new StatementFile(ctx, yearAndMonth, null, '_dingding');
    await file.write(JSON.stringify(ctx.request.body));
  
    ctx.response.status = 200;
  };
};

module.exports = methods;