const animateCSS = (element, animation) => 
  // We create a Promise and return it
  new Promise((resolve, reject) => {
    let isShow;
    const prefix = 'animate__'
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    node.classList.add(`${prefix}animated`, animationName);

    function handleAnimationEnd() {
      node.classList.remove(`${prefix}animated`, animationName);
      resolve('Animation ended');
    }

    node.addEventListener('animationend', handleAnimationEnd, { once: true });
  });


const loadTarget = new function() {
  this.save = () => {
    localStorage.setItem('lastTarget', document.querySelector('#targetTomorrow').value);
  };

  this.load = () => {
    document.querySelector('#targetToday').value = localStorage.getItem('lastTarget');
  };
}


async function monthlyOnSubmit(event) {
  event.preventDefault();

  let salesLevels = {};
  Array.from(document.querySelectorAll('input.sales-levels')).forEach(e => salesLevels[e.id] = parseInt(e.value));

  await fetch('/api/dingding_monthly_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(salesLevels)
  });

  await animateCSS('#monthly', 'flipOutX');
  document.querySelector('#monthly').hidden = true;
}


async function dailyOnSubmit(event) {
  event.preventDefault();
  loadTarget.save();

  let salesTargets = {};
  Array.from(document.querySelectorAll('input.sales-targets')).forEach(e => salesTargets[e.id] = parseInt(e.value));

  let response = await fetch(`/api/format_dingding_statement?${(new URLSearchParams(salesTargets)).toString()}`);
  document.querySelector('textarea').value = await response.text();

  document.querySelector('#result-area').style.display = '';
  await animateCSS('#result-area', 'fadeInUp');

  document.querySelector('#result-area').scrollIntoView({behavior: 'smooth'})
}


function onCopyButtonClicked() {
  let textarea = document.querySelector('textarea');
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
}

document.addEventListener('DOMContentLoaded', async () => {
  loadTarget.load();
  document.querySelector('#monthly').addEventListener('submit', monthlyOnSubmit);
  document.querySelector('#daily').addEventListener('submit', dailyOnSubmit);
  document.querySelector('#copy').addEventListener('click', onCopyButtonClicked);
});