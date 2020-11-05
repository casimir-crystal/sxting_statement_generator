const appendMessageToLoginDiv = (style, header, body) => {
  const message = `<article class="message ${style} animate__animated animate__fadeInUp">
                   <div class="message-header">
                     <p>${header}</p>
                   </div>
                   <div class="message-body">
                     ${body}
                   </div>
                 </article>`;

  const loginDiv = document.querySelector('#login');

  const preMessage = loginDiv.querySelector('article');
  if (preMessage) preMessage.remove();

  loginDiv.insertAdjacentHTML('beforeend', message);
};

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

const transformCallback = async () => {
  await animateCSS('#login', 'fadeOutDown');
  document.querySelector('#login').hidden = true;

  document.querySelector('#information').hidden = false;
  animateCSS('#information', 'fadeInUp');
};

const credential = new function RememberCredentials() {
  this.save = () => {
    localStorage.setItem('username', document.querySelector('#username').value);
    localStorage.setItem('password', document.querySelector('#password').value);
  };

  this.load = () => {
    document.querySelector('#username').value = localStorage.getItem('username');
    document.querySelector('#password').value = localStorage.getItem('password');
  };
}();

async function editCurrent() {
  const inputs = {};
  document.querySelectorAll('input:not([id])').forEach((input) => {
    inputs[input.name] = input;
  });

  function autofill(name, value) {
    inputs[name].value = Math.round((value + Number.EPSILON) * 100) / 100;
  }

  const statement = await fetch('/api/statement_json').then((res) => res.json());
  autofill('店机美团_sales', statement.美团外卖);
  autofill('店机美团_amount', statement.线上GC);
  autofill('店机口碑_sales', statement.口碑掌柜);
  autofill('店机开店宝_sales', statement['开店宝(美团)']);
  autofill('昨日累计_sales', statement.累计营业额 - statement.营业额);
  autofill('昨日累计_amount', statement.累计GC - statement.GC);
  autofill('小程序累计_sales', statement.小程序累计 - statement.小程序);

  transformCallback();
}

async function submitLogin(event) {
  event.preventDefault();

  // start to loading fetch process
  document.querySelector('#loginButton').classList.add('is-loading');
  credential.save();

  const inputs = ['username', 'password', 'date'];
  const request = {};
  inputs.forEach((input) => {
    request[input] = document.querySelector(`#${input}`).value;
  });

  const result = await fetch('/api/saved_info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify(request),
  }).then((res) => res.json());

  if (!result.status) {
    appendMessageToLoginDiv('is-danger', '失败', '登陆失败。用户名密码错误，或该用户已在其他设备登陆');
    document.querySelector('#loginButton').classList.remove('is-loading');
    return;
  }

  if (result.fileExists) {
    appendMessageToLoginDiv('is-info', '报表已存在', `
      <p>已经存在该用户当日的报表，请选择查看或修改。</p>
      <div class="block" style="margin: 10px 0;">
        <a href="/statement"><button class="button is-link is-light">查看</button></a>
        <button class="button is-primary is-light" id="edit-current">修改</button>
      </div>
    `);

    document.querySelector('#edit-current').addEventListener('click', () => editCurrent());
  } else {
    appendMessageToLoginDiv('is-success', '成功', '数据获取成功。请继续提交下一步数据。');
    setTimeout(transformCallback, 1500);

    if (result.lastTotals) {
      document.querySelector('#request-yesterday-statement').remove();
    }
  }
}

function setDefaultDate() {
  const dateControl = document.querySelector('input[type="date"]');
  const date = new Date();
  dateControl.value = [
    date.getFullYear(),
    (`0${date.getMonth() + 1}`).slice(-2),
    (`0${date.getDate()}`).slice(-2),
  ].join('-');
}

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  credential.load();

  document.querySelector('#login').addEventListener('submit', submitLogin);
});
