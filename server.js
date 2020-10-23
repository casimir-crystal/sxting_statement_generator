'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const render = require('koa-ejs');
const hosting = require('koa-static');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');

const fs = require('fs').promises;
const path = require('path');
const fetchPaymentPromise = require('./model/fetch-payment');
const formatStatement = require('./model/format-statement');

const app = new Koa();
const router = new Router();


function getDataFilePath(date, username, suffix='') {
  return path.join(__dirname,
                   'data',
                   username,
                   `${date}${suffix}.json`);
}


async function fetchYesterdayStatement(date, user) {
  let _date = new Date(Date.parse(date));

  // if today is the first day of a month, yesterday's statement could be empty
  if (_date.getDate === 1) return {
    '小程序累计_sales': 0,
    '昨日累计_sales': 0,
    '昨日累计_amount': 0
  };

  _date.setDate(_date.getDate() - 1);
  let yesterday = _date.toLocaleDateString();


  try {
    // try to read last '累计营业额'
    const statement = JSON.parse(await fs.readFile(getDataFilePath(yesterday, user)));
    
    return {'小程序累计_sales': statement['小程序累计'],
            '昨日累计_sales': statement['累计营业额'],
            '昨日累计_amount': statement['累计GC']};

  } catch(err) {
    console.error(err);
    return false;  // if any error happens, we just return false
  }
};


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
  const _date = new Date(Date.parse(date));
  ctx.session.username = username;
  ctx.session.date = [_date.getFullYear(), _date.getMonth()+1, _date.getDate()].join('-');

  const contentObject = await fetchPaymentPromise(ctx.session.username, password, ctx.session.date);

  if (!contentObject) {
    // failed to fetch data
    ctx.response.status = 400;
  } else {
    // create the dir first, ignore if exists
    let dir = path.join(__dirname, 'data', ctx.session.username);
    try {
      await fs.mkdir(dir);
    } catch(error) {
      if (error.code !== 'EEXIST') throw error;
    }

    await fs.writeFile(getDataFilePath(ctx.session.date, ctx.session.username, '_pc'), JSON.stringify(contentObject));
    ctx.body = true;
  }


}).post('/api/dingding_monthly_data', async ctx => {
  let date = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${date}_dingding.json`);

  await fs.writeFile(monthlyFilePath, JSON.stringify(ctx.request.body));
  ctx.body = true;


}).get('/api/is_yesterday_statement_exists', async ctx => {
  let yesterdayStatementExists = await fetchYesterdayStatement(ctx.session.date, ctx.session.username);

  if (yesterdayStatementExists) {
    ctx.response.status = 200;  // OK
  } else {
    ctx.response.status = 400;  // NO
  }


}).get('/api/fetch_statement_json', async ctx => {
  let date = ctx.session.date;
  let username = ctx.session.username;

  const statement = JSON.parse(await fs.readFile(getDataFilePath(date, username)));
  ctx.body = statement;


}).get('/api/format_dingding_statement', async ctx => {
  const roundValue = value => Math.round((value + Number.EPSILON) * 100 * 100) / 100;
  const dailyData = ctx.query;

  const yearAndMonth = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${yearAndMonth}_dingding.json`);
  const monthlyData = await JSON.parse(await fs.readFile(monthlyFilePath));

  const statement = JSON.parse(await fs.readFile(getDataFilePath(ctx.session.date, ctx.session.username)));

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
小程序客单价: ${statement['小程序AC']};
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
  let date = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${date}_dingding.json`);

  // if can't access to monthlyDataFile, then we don't have it
  let hasMonthlyData = true;
  try {
    await fs.access(monthlyFilePath);
  } catch(error) {
    hasMonthlyData = false;
  }

  await ctx.render('dingding', { hasMonthlyData });


}).get('/reset', async ctx => {
    ctx.session = null;
    ctx.redirect('/');


}).get('/delete_statement', async ctx => {
  try {
    await fs.unlink(getDataFilePath(ctx.session.date, ctx.session.username));
    ctx.session = null;
  } catch (error) {
    console.error(error);
  } finally {
    ctx.redirect('/');
  }


}).get('/', async ctx => {
  if (ctx.session) {
    try {
        await fs.access(getDataFilePath(ctx.session.date, ctx.session.username));
        ctx.redirect('/fetch_statement');
    } catch {
      // if failed to find today's statement, then expire this session
      ctx.session = null;
    }
  }

  await ctx.render('main');


}).post('/', async ctx => {
  const pcFilePath = getDataFilePath(ctx.session.date, ctx.session.username, '_pc');

  let pcInfo = JSON.parse(await fs.readFile(pcFilePath));
  await fs.unlink(pcFilePath);

  let fullInfo = Object.assign(ctx.request.body, pcInfo);

  // if yesterday's statement exists, we need to assign these data to `fullInfo`
  let yesterdayAllSalesAndGC = await fetchYesterdayStatement(ctx.session.date, ctx.session.username);
  if (yesterdayAllSalesAndGC) fullInfo = Object.assign(fullInfo, yesterdayAllSalesAndGC);

  for (let key of Object.keys(fullInfo)) {
    fullInfo[key] = Number(fullInfo[key]);
  }

  const statement = formatStatement(ctx.session.date, fullInfo);

  await fs.writeFile(getDataFilePath(ctx.session.date, ctx.session.username), JSON.stringify(statement));
  ctx.redirect('/fetch_statement');


}).get('/fetch_statement', async ctx => {
  let { date, username } = ctx.query;
  if (!date || !username) {
    date = ctx.session.date;
    username = ctx.session.username;
  }

  const statement = JSON.parse(await fs.readFile(getDataFilePath(date, username)));
  await ctx.render('fetch_statement', { statement });
});


app.use(router.routes(), router.allowedMethods());
app.listen(3000);

console.log('Server is running at http://127.0.0.1:3000/');