'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const render = require('koa-ejs');
const hosting = require('koa-static');
const bodyParser = require('koa-bodyparser');

const fs = require('fs').promises;
const path = require('path');
const fetchPaymentPromise = require('./model/fetch-payment');
const formatStatement = require('./model/format-statement');

const app = new Koa();
const router = new Router();


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

// log the current date for every session
app.use((ctx, next) => {
  ctx.state = ctx.state || {};
  ctx.state.today = new Date();
  return next();
});


const getDataFilePath = (date, suffix='') => path.join(__dirname, 'data', `${(date instanceof Date) ? date.toLocaleDateString() : date}${suffix}.json`);

router.get('/', async ctx => {
  try {
    await fs.access(getDataFilePath(ctx.state.today));
    ctx.redirect('/fetch_statement');
  } catch(err) {
    ctx.redirect('/request_info');
  }


}).get('/request_info', async ctx => {
  let date = ctx.state.today;
  date.setDate(date.getDate() - 1);

  let yesterday = date.toLocaleDateString();

  // assert there's no yesterday's statement by default
  let noYesterdayStatement = true;
  try {
    // try to read last '累计营业额', if failed, then it's still true
    noYesterdayStatement = (!JSON.parse(await fs.readFile(getDataFilePath(yesterday)))['累计营业额']);
  } catch(err) {
    // if file is not found then we go on, else we have to throw the error
    if (err.code !== 'ENOENT') throw err;
  }

  await ctx.render('request_info', { noYesterdayStatement });


}).post('/request_info', async ctx => {
  let pcInfo = JSON.parse(await fs.readFile(getDataFilePath(ctx.state.today, '_pc')));
  let fullInfo = Object.assign(ctx.request.body, pcInfo);

  for (let key of Object.keys(fullInfo)) {
    fullInfo[key] = Number(fullInfo[key]);
  }

  await fs.writeFile(getDataFilePath(ctx.state.today), JSON.stringify(formatStatement(ctx.state.today, fullInfo)));
  ctx.redirect('/fetch_statement');


}).get('/fetch_statement', async ctx => {
  let { date } = ctx.query;
  if (!date) date = ctx.state.today.toLocaleDateString();

  const statement = JSON.parse(await fs.readFile(getDataFilePath(date)));
  await ctx.render('fetch_statement', { statement });


}).get('/api/request_from_background', async ctx => {
  let { username, password, date } = ctx.query;
  if (!date) date = ctx.state.today;  // if there's no date option, then today
  if (date instanceof Date) date = date.toLocaleDateString();

  const contentObject = await fetchPaymentPromise(username, password, date);

  if (!contentObject) {
    // failed to fetch data
    ctx.response.status = 400;
  } else {
    await fs.writeFile(getDataFilePath(date, '_pc'), JSON.stringify(contentObject));
    ctx.body = contentObject;
  }
});


app.use(router.routes(), router.allowedMethods());
app.listen(3000);

console.log('Server is running at http://127.0.0.1:3000/');