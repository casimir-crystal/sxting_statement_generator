const { StatementFile } = require('./utils/utils');

const formatDingdingStatement = async (ctx) => {
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

  return `日期: ${thisMonth}月${thisDay}日
班次: 晚班
营业目标: ${targetToday}
实际达成: ${statement['营业额']}
完成率: ${roundValue(statement['营业额'] / targetToday)}%
小程序客单价: ${statement['小程序AC']}
总营业额: ${statement['累计营业额']}
明日目标: ${targetTomorrow}
${thisMonth}月份时间进度目标:
第一档: ${level1} 完成率: ${roundValue(statement['累计营业额'] / level1)}%
第二档: ${level2} 完成率: ${roundValue(statement['累计营业额'] / level2)}%
第三档: ${level3} 完成率: ${roundValue(statement['累计营业额'] / level3)}%
活动追踪:
1. 小程序当日金额: ${statement['小程序']}
2. 小程序日完成比: ${roundValue(statement['小程序'] / statement['营业额'])}%
3. 小程序月完成比: ${roundValue(statement['小程序累计'] / statement['累计营业额'])}%
总结：`;
};

module.exports = formatDingdingStatement;
