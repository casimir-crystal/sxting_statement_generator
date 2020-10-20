'use strict';

const Koa = require('koa')
const Router = require('koa-router');
const render = require('koa-ejs')
const hosting = require('koa-static')
const bodyParser = require('koa-bodyparser');

const fs = require('fs').promises
const path = require('path')
const fetchPaymentPromise = require('./model/fetchPaymentPromise');

const app = new Koa()
const router = new Router();

// active koa-bodyparser
app.use(bodyParser());

// set a static path for css files refer
app.use(hosting(path.join(__dirname, 'public')))

// set the view engine as 'ejs'
render(app, {
  root: path.join(__dirname, 'view'),
  viewExt: 'ejs',
  layout: false,
  cache: false,
  debug: false,
});

// log the current date for every session
app.use((ctx, next) => {
  ctx.state = ctx.state || {};
  ctx.state.now = new Date();
  return next();
});


router.get('/', async ctx => {
  await ctx.render('main');

}).post('/', async ctx => {
  ctx.body = ctx.request.body;

}).get('/fetch_statement', async ctx => {
  await ctx.render('fetch_statement', { statement });

}).get('/api/request_to_background', async ctx => {
  let { username, password, date } = ctx.query;
  if (!date) date = ctx.state.now;  // if there's no date option, then use today

  let filePath = path.join(__dirname, 'data', date.toLocaleDateString() + '_pc.json');
  

  const contentObject = await fetchPaymentPromise(username, password, date);

  if (!contentObject) {
    ctx.response.status = 400;
  } else {
    await fs.writeFile(filePath, JSON.stringify(contentObject));
    ctx.body = contentObject;
  }
});


app.use(router.routes(), router.allowedMethods());
app.listen(3000);

console.log('Server is running at http://127.0.0.1:3000/');