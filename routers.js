const Router = require('koa-router');
const methods = require('./lib/methods');

const router = new Router();

router
  .get('/', methods.indexGet)
  .post('/', methods.indexPost)

  .get('/statement/reset', methods.reset)
  .get('/statement/delete', methods.deleteStatement)

  .get('/statement', methods.statement)
  .get('/dingding', methods.dingdingIndexGet)
  .post('/dingding', methods.dingdingIndexPost)

  .get('/api/get_statement_json', methods.api.getStatementJson)
  .get('/api/get_payment_json', methods.api.getPaymentData)
  .post('/api/get_saved_data', methods.api.getSavedData)
  .post('/api/dingding_save_monthly', methods.api.dingdingSaveMonthly);

module.exports = router;
