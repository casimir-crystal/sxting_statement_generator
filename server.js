const path = require('path');

const Koa = require('koa');
const render = require('koa-ejs');
const hosting = require('koa-static');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const nocache = require('koa-no-cache');

const router = require('./routers');

const app = new Koa();

// active koa-bodyparser
app.use(bodyParser());

// set a static path for css files refer
app.use(hosting(path.join(__dirname, 'public')));

// cache not allowed
app.use(nocache());

// set the view engine as 'ejs'
render(app, {
  root: path.join(__dirname, 'views'),
  viewExt: 'ejs',
  cache: false,
  debug: false,
  layout: false,
});

// set koa-session
app.keys = ['sec_keys'];
app.use(session(app));

app.use(router.routes(), router.allowedMethods());
app.listen(80);

// eslint-disable-next-line no-console
console.log('Server is running at http://127.0.0.1:80/');
