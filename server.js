'use strict';

const path = require('path');
const fs = require('fs').promises;

const Koa = require('koa');
const Router = require('koa-router');
const render = require('koa-ejs');
const hosting = require('koa-static');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');

const payment = require('./model/payment');
const formatStatement = require('./model/format_statement');
const getLastTotal = require('./model/get_last_total');
const { toLocaleDateString, StatementFile } = require("./model/utils");


const app = new Koa();
const router = new Router();
Date.prototype.toLocaleDateString = toLocaleDateString;


// active koa-bodyparser
app.use(bodyParser());

// set a static path for css files refer
app.use(hosting(path.join(__dirname, 'public')))

// set the view engine as 'ejs'
render(app, {
  root: path.join(__dirname, 'view'),
  viewExt: 'ejs',
  cache: false,
  debug: false,
  layout: false
});

// set koa-session
app.keys = ['sec_keys'];
app.use(session(app));


router.post('/api/request_from_background', async ctx => {
  let { username, password, date } = ctx.request.body;
  ctx.session.date = (new Date(Date.parse(date))).toLocaleDateString();

  ctx.session.username = username;
  ctx.session.cookie = await payment.getLoginCookie(username, password);

  if (!ctx.session.cookie) {
    ctx.response.status = 400;  // failed to login
    return;
  }

  // create folder to save this user's statements
  let dir = path.join(__dirname, 'data', ctx.session.username);
  try {
    await fs.mkdir(dir);
  } catch(error) {
    if (error.code !== 'EEXIST') throw error;
  }

  // sync the data of kaigedian immediately
  payment.syncData(ctx.session.cookie, ctx.session.date);
  ctx.response.status = 200;


}).get('/api/is_yesterday_statement_exists', async ctx => {
  const yesterdayStatementExists = await getLastTotal(ctx.session.date, ctx.session.username);

  if (yesterdayStatementExists) {
    ctx.response.status = 200;  // OK
  } else {
    ctx.response.status = 400;  // NO
  }


}).get('/api/fetch_statement_json', async ctx => {
  const statement = await new StatementFile(ctx).read();
  ctx.body = statement;


}).post('/api/dingding_monthly_data', async ctx => {
  const yearAndMonth = ctx.session.date.slice(0, 7);

  const file = new StatementFile(ctx, yearAndMonth, null, '_dingding');
  await file.write(JSON.stringify(ctx.request.body));

  ctx.response.status = 200;


}).get('/api/format_dingding_statement', async ctx => {
  const statement = await new StatementFile(ctx).read();

  const roundValue = value => Math.round((value + Number.EPSILON) * 100 * 100) / 100;
  const dailyData = ctx.query;

  const yearAndMonth = ctx.session.date.slice(0, 7);

  const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, null, '_dingding');
  const monthlyData = await dingdingMonthFile.read();

  const { level1,
          level2,
          level3,
          targetToday,
          targetTomorrow } = Object.assign(monthlyData, dailyData);

  const _date = new Date(Date.parse(ctx.session.date));
  const thisMonth = _date.getMonth() + 1;
  const thisDay = _date.getDate();

  ctx.body = `日期: ${thisMonth}月${thisDay}日
班次: 晚班
营业目标: ${targetToday}
实际达成: ${statement['营业额']}
完成率: ${roundValue(statement['营业额'] / targetToday)}%
小程序客单价: ${statement['小程序AC']}
总营业额: ${statement['累计营业额']}
明日目标: ${targetTomorrow}
${thisMonth}月份时间进度目标:
第一档: ${level1} 完成率: ${roundValue(statement['累计营业额'] / level1)}%
第二档: ${level2} 完成率: ${roundValue(statement['累计营业额'] / level2)}%
第三档: ${level3} 完成率: ${roundValue(statement['累计营业额'] / level3)}%
活动追踪:
1. 小程序当日金额: ${statement['小程序']}
2. 小程序日完成比: ${roundValue(statement['小程序'] / statement['营业额'])}%
3. 小程序月完成比: ${roundValue(statement['小程序累计'] / statement['累计营业额'])}%
总结：` ;


}).get('/dingding', async ctx => {
  const yearAndMonth = ctx.session.date.slice(0, 7);

  const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, ctx.session.username, '_dingding');
  const hasMonthlyData = await dingdingMonthFile.isExists();

  await ctx.render('dingding', { hasMonthlyData });


}).get('/reset', async ctx => {
    ctx.session = null;
    ctx.redirect('/');


}).get('/delete_statement', async ctx => {
  await new StatementFile(ctx).delete();
  ctx.redirect('/');


}).get('/', async ctx => {
  await ctx.render('index');


}).post('/', async ctx => {
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


}).get('/fetch_statement', async ctx => {
  const statement = await new StatementFile(ctx).read();
  await ctx.render('fetch_statement', { statement });
});


app.use(router.routes(), router.allowedMethods());
app.listen(3000);

console.log('Server is running at http://127.0.0.1:3000/');