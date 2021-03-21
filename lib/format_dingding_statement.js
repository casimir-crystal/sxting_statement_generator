const { StatementFile } = require('./utils/utils');

const formatDingdingStatement = async (ctx, fullInfo) => {
  const statement = await new StatementFile(ctx).read();

  const roundValue = (value) => Math.round((value + Number.EPSILON) * 100 * 100) / 100;
  const dailyData = ctx.request.body;

  const yearAndMonth = ctx.session.date.slice(0, 7);

  const dingdingMonthFile = new StatementFile(ctx, yearAndMonth, null, '_dingding');
  const monthlyData = await dingdingMonthFile.read();

  const {
    level1,
    level2,
    level3,
    targetToday,
    targetTomorrow,
  } = Object.assign(monthlyData, dailyData);

  const date = new Date(Date.parse(ctx.session.date));
  const thisMonth = date.getMonth() + 1;
  const thisDay = date.getDate();

  return `
日期: ${thisMonth}月${thisDay}日 小票业绩: ${fullInfo['实收_sales']}
今日上班人数:
今日目标: ${targetToday} 
今日实收: ${statement['营业额']}
达成率: ${roundValue(statement['营业额'] / targetToday)}%
GC: ${statement['GC']}; AC: ${statement['AC']}
小程序实收: ${statement['小程序']}
GC: ${statement['小程序GC']}; AC: ${statement['小程序AC']}; SSS: ${roundValue(statement['小程序'] / statement['营业额'])}%
外卖实收: ${statement['线上合计']}
GC: ${statement['线上GC']}; AC: ${statement['线上AC']}; SSS: ${roundValue(statement['线上合计'] / statement['营业额'])}%
--------------------------                  
总营业额: ${statement['累计营业额']}
${thisMonth}月份时间进度目标:
第一档: ${level1} 完成率: ${roundValue(statement['累计营业额'] / level1)}%
第二档: ${level2} 完成率: ${roundValue(statement['累计营业额'] / level2)}%
第三档: ${level3} 完成率: ${roundValue(statement['累计营业额'] / level3)}%
-------------------------                  
门店商场活动:                   
1.            
门店市场活动:                   
1.               
             
总结                       
1.`;
};

module.exports = formatDingdingStatement;
