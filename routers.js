const Router = require('koa-router');
const methods = require('./models/methods');

const router = new Router();

router
  .get('/', methods.indexGet)
  .post('/', methods.indexPost)

  .get('/reset', methods.reset)
  .get('/delete_statement', methods.deleteStatement)

  .get('/statement', methods.statement)
  .get('/dingding', methods.dingdingIndexGet)
  .post('/dingding', methods.dingdingIndexPost)

  .post('/api/saved_info', methods.api.savedInfo)
  .get('/api/statement_json', methods.api.statementJson)
  .post('/api/dingding_save_monthly', methods.api.dingdingSaveMonthly);

module.exports = router;
