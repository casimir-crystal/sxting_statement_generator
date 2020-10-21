const animateCSS = (element, animation) => 
  // We create a Promise and return it
  new Promise((resolve, reject) => {
    let isShow;
    const prefix = 'animate__'
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    if (node.hidden) {
      isShow = true;
      node.hidden = false; 
    }

    node.classList.add(`${prefix}animated`, animationName);

    function handleAnimationEnd() {
      if (!isShow) node.hidden = true;
      node.classList.remove(`${prefix}animated`, animationName);
      resolve('Animation ended');
    }

    node.addEventListener('animationend', handleAnimationEnd, { once: true });
  });


function monthlyOnSubmit(event) {
  event.preventDefault();

  const salesLevels = {};
  Array.from(document.querySelectorAll('input.sales-levels')).forEach(e => salesLevels[e.id] = parseInt(e.value))

  let response = fetch('/api/save_monthly_dingding_data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(salesLevels)
  });

  response
  .then(() => animateCSS('#monthly', 'fadeOutDown')
  .then(() => document.querySelector('#monthly').hidden = true));
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#monthly').addEventListener('submit', monthlyOnSubmit);
});