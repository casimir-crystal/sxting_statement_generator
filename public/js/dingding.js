const animateCSS = (element, animation) => new Promise((resolve) => {
  const prefix = 'animate__';
  const animationName = `${prefix}${animation}`;
  const node = document.querySelector(element);

  node.classList.add(`${prefix}animated`, animationName);

  function handleAnimationEnd() {
    node.classList.remove(`${prefix}animated`, animationName);
    resolve('Animation ended');
  }

  node.addEventListener('animationend', handleAnimationEnd, { once: true });
});

const copyTextareaContent = (element) => {
  const textarea = document.querySelector(element);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
};

// TODO: Set and load
const targets = new function LoadTargets() {
  this.save = () => {
    localStorage.setItem('lastTarget', document.querySelector('#targetTomorrow').value);
  };

  this.load = () => {
    document.querySelector('#targetToday').value = localStorage.getItem('lastTarget');
  };
}();

async function monthlyOnSubmit(event) {
  event.preventDefault();

  const salesLevels = {};
  Array.from(document.querySelectorAll('input.sales-levels')).forEach((e) => {
    salesLevels[e.id] = parseInt(e.value, 10);
  });

  await fetch('/api/dingding_save_monthly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(salesLevels),
  });

  await animateCSS('#monthly', 'flipOutX');
  document.querySelector('#monthly').hidden = true;
  await animateCSS('#daily', 'flipInX'); // TODO: pick a better animation
}

async function dailyOnSubmit(event) {
  event.preventDefault();
  targets.save();

  const salesTargets = {};
  Array.from(document.querySelectorAll('input.sales-targets')).forEach((e) => {
    salesTargets[e.id] = parseInt(e.value, 10);
  });

  const response = await fetch('/dingding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(salesTargets),
  });

  document.querySelector('textarea').value = await response.text();

  document.querySelector('#result-area').style.display = '';
  await animateCSS('#result-area', 'fadeInUp');

  document.querySelector('#result-area').scrollIntoView({ behavior: 'smooth' });
}

function onCopyButtonClicked() {
  copyTextareaContent('textarea');
}

async function onWechatReportButtonClick() {
  // const response = await fetch('/api/fetch_statement_json');
  // const statement = await response.json();

  const date = new Date();
  const today = `${date.getMonth() + 1}.${date.getDate()}`;

  const text = `店铺名：盛香亭
销售日期：${today}
客单数：
销售金额：`;

  document.querySelector('#other-info').value = text;
  document.querySelector('#other-info').style.display = '';
  await animateCSS('#other-info', 'fadeInUp');

  document.querySelector('#other-info').scrollIntoView({ behavior: 'smooth' });

  copyTextareaContent('#other-info');
}

document.addEventListener('DOMContentLoaded', async () => {
  targets.load();
  document.querySelector('#monthly').addEventListener('submit', monthlyOnSubmit);
  document.querySelector('#daily').addEventListener('submit', dailyOnSubmit);
  document.querySelector('#copy').addEventListener('click', onCopyButtonClicked);
  document.querySelector('#wechat-report').addEventListener('click', onWechatReportButtonClick);
});
