function formatStatement(date, fullInfo) {
  const weekdayTable = ['日', '一', '二', '三', '四', '五', '六'];

  // eslint-disable-next-line no-param-reassign
  date = new Date(Date.parse(date));

  // eslint-disable-next-line no-param-reassign
  fullInfo = new Proxy(fullInfo, {
    get: (target, name) => (name in target ? target[name] : 0),
  });

  let statement = {
    [`${date.getMonth() + 1}月`]: date.getDate(),
    星期: weekdayTable[date.getDay()],
    天气: '',
    营业额: null,
    GC: null,
    AC: null,
    累计营业额: null,
    累计GC: null,
    饿了么: '',
    美团外卖: fullInfo['店机美团_sales'],
    线上合计: fullInfo['店机美团_sales'],
    线上GC: fullInfo['店机美团_amount'],
    线上AC: fullInfo['店机美团_sales'] / fullInfo['店机美团_amount'],
    现金: fullInfo['现金支付_sales'],
    微信: fullInfo['微信支付_sales'],
    支付宝: fullInfo['支付宝支付_sales'],
    口碑掌柜: fullInfo['店机口碑_sales'],
    '开店宝(美团)': fullInfo['店机开店宝_sales'],
    银行App: '',
    商场: fullInfo['商场购物卡券_sales'],
    小程序累计: fullInfo['开个店支付_sales'] + fullInfo['小程序累计_sales'],
    POS机: '',
    小程序: fullInfo['开个店支付_sales'],
    小程序GC: fullInfo['开个店支付_amount'],
    小程序AC: fullInfo['开个店支付_sales'] / fullInfo['开个店支付_amount'],
    线下合计: [
      fullInfo['现金支付_sales'],
      fullInfo['微信支付_sales'],
      fullInfo['支付宝支付_sales'],
      fullInfo['开个店支付_sales'],
      fullInfo['商场购物卡券_sales'],
      fullInfo['店机口碑_sales'],
      fullInfo['店机开店宝_sales'],
    ].reduce((sum, sales) => sum + sales),
    线下GC: null,
    线下AC: null,
    '储蓄卡/福利券':
      fullInfo['营销员赠送_sales'] + fullInfo['会员卡支付_sales'],
    签名: '',
  };

  statement['线下GC'] = fullInfo['实收_amount'] - fullInfo['美团买单_amount'];
  statement['线下AC'] = statement['线下合计'] / statement['线下GC'];

  statement['营业额'] = statement['美团外卖'] + statement['线下合计'];
  statement.GC = statement['实收_amount'];
  statement.AC = statement['营业额'] / statement.GC;

  statement['累计营业额'] = statement['营业额'] + fullInfo['昨日累计_sales'];
  statement['累计GC'] = statement.GC + fullInfo['昨日累计_amount'];

  // round every numbers in the object to at most 2 decimal
  statement = new Proxy(statement, {
    get: (target, name) => (typeof target[name] === 'number'
      ? Math.round((target[name] + Number.EPSILON) * 100) / 100
      : target[name]),
  });

  return statement;
}

module.exports = formatStatement;
