'use strict';

function formatStatement(date, fullInfo) {
  date = new Date(Date.parse(date));
  const weekdayTable = ['日', '一', '二', '三', '四', '五', '六'];

  fullInfo = new Proxy(fullInfo, {
    get: (target, name) => name in target ? target[name] : 0
  });

  let statementObj = {
    [`${date.getMonth()+1}月`]: date.getDate(),
    '星期': weekdayTable[date.getDay()],
    '天气': '',
    '营业额': null,
    'GC': null,
    'AC': null,
    '累计营业额': null,
    '累计GC': null,
    '饿了么': '',
    '美团外卖': fullInfo['meituan_sales'],
    '线上合计': fullInfo['meituan_sales'],
    '线上GC': fullInfo['meituan_amount'],
    '线上AC': fullInfo['meituan_sales'] / fullInfo['meituan_amount'],
    '现金': fullInfo['现金支付_sales'],
    '微信': fullInfo['微信支付_sales'],
    '支付宝': fullInfo['支付宝支付_sales'],
    '口碑掌柜': fullInfo['koubei_sales'],
    '开店宝(美团)': fullInfo['kaidianbao_sales'],
    '银行App': '',
    '商场': fullInfo['商场购物卡券_sales'],
    '小程序累计': fullInfo['开个店支付_sales'] + fullInfo['小程序累计_sales'],
    'POS机': '',
    '小程序': fullInfo['开个店支付_sales'],
    '小程序GC': fullInfo['开个店支付_amount'],
    '小程序AC': fullInfo['开个店支付_sales'] / fullInfo['开个店支付_amount'],
    '线下合计': [fullInfo[`现金支付_sales`],
               fullInfo[`微信支付_sales`],
               fullInfo[`支付宝支付_sales`],
               fullInfo[`开个店支付_sales`],
               fullInfo[`商场购物卡券_sales`],
               fullInfo[`koubei_sales`],
               fullInfo[`kaidianbao_sales`]
              ].reduce((sum, sales) => sum + sales),
    '线下GC': null,
    '线下AC': null,
    '储蓄卡/福利券': fullInfo['营销员赠送_sales'] + fullInfo['会员卡支付_sales'],
    '签名': ''
  };

  statementObj['线下GC'] = fullInfo['实收_amount'] - fullInfo['美团买单_amount'];
  statementObj['线下AC'] = statementObj['线下合计'] / statementObj['线下GC'];

  statementObj['营业额'] = statementObj['美团外卖'] + statementObj['线下合计'];
  statementObj['GC'] = statementObj['线上GC'] + statementObj['线下GC'];
  statementObj['AC'] = statementObj['营业额'] / statementObj['GC'];

  statementObj['累计营业额'] = statementObj['营业额'] + fullInfo['昨日累计_sales'];
  statementObj['累计GC'] = statementObj['GC'] + fullInfo['昨日累计_amount'];


  // round every numbers in the object to at most 2 decimal
  statementObj = new Proxy(statementObj, {
    get: (target, name) => (typeof target[name] === 'number') ? 
         Math.round((target[name] + Number.EPSILON) * 100) / 100 :
         target[name]
  });

  return statementObj;
}


module.exports = formatStatement;