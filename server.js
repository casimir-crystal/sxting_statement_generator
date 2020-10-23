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
  _date.setDate(_date.getDate() - 1);
  let yesterday = _date.toLocaleDateString();

  try {
    // try to read last '累计营业额'
    const statement = JSON.parse(await fs.readFile(getDataFilePath(yesterday, user)));
    
    return {'小程序累计_sales': statement['小程序累计'],
            '昨日累计_sales': statement['累计营业额'],
            '昨日累计_amount': statement['累计GC']};

  } catch(err) {
    console.err(err);
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
  ctx.session.username = username;
  ctx.session.date = date;

  const contentObject = await fetchPaymentPromise(username, password, date);

  if (!contentObject) {
    // failed to fetch data
    ctx.response.status = 400;
  } else {
    // create the dir first, ignore if exists
    try {
      let dir = path.join(__dirname, 'data', username);
      await fs.mkdir(dir);
    } catch(error) {
      if (error.code !== 'EEXIST') throw error;
    }

    await fs.writeFile(getDataFilePath(date, username, '_pc'), JSON.stringify(contentObject));
    ctx.body = true;
  }


}).get('/api/dingding_monthly_data', async ctx => {
  let date = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${date}_dingding.json`);

  ctx.body = await fs.readFile(monthlyFilePath);


}).post('/api/dingding_monthly_data', async ctx => {
  let date = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${date}_dingding.json`);

  await fs.writeFile(monthlyFilePath, JSON.stringify(ctx.request.body));
  ctx.body = true;


}).get('/api/fetch_statement_json', async ctx => {
  let date = ctx.session.date;
  let username = ctx.session.username;

  const statement = JSON.parse(await fs.readFile(getDataFilePath(date, username)));
  ctx.body = statement;


}).get('/api/is_yesterday_statement_exists', async ctx => {
  let yesterdayStatementExists = await fetchYesterdayStatement(ctx.session.date, ctx.session.username);

  if (yesterdayStatementExists) {
    ctx.response.status = 200;  // OK
  } else {
    ctx.response.status = 400;  // NO
  }


}).get('/dingding', async ctx => {
  let date = ctx.session.date.slice(0, 7)
  const monthlyFilePath = path.join(__dirname, 'data', ctx.session.username, `${date}_dingding.json`);

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
    ctx.redirect('/');
  } catch (error) {
    console.error(error);
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