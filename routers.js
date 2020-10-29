const Router = require('koa-router');
const methods = require('./models/methods');

const router = new Router();

router
.get('/', methods.indexGet)
.post('/', methods.indexPost)

.get('/reset', methods.reset)
.get('/delete_statement', methods.deleteStatement)

.get('/fetch_statement', methods.fetchStatement)
.get('/dingding', methods.dingdingIndexGet)
.post('/dingding', methods.dingdingIndexPost)

.post('/api/request_from_background', methods.api.requestFromBackground)

.get('/api/fetch_statement_json', methods.api.fetchStatementJson)
.get('/api/is_yesterday_statement_exists', methods.api.isYesterdayStatementExists)

.post('/api/dingding_save_monthly', methods.api.dingdingSaveMonthly);

module.exports = router;