const appendMessageToLoginDiv = (style, header, body) => {
  let message = `<article class="message ${style} animate__animated animate__fadeInUp">
                   <div class="message-header">
                     <p>${header}</p>
                   </div>
                   <div class="message-body">
                     ${body}
                   </div>
                 </article>`;

  let loginDiv = document.querySelector('#login');

  let preMessage = loginDiv.querySelector('article');
  if (preMessage) preMessage.remove();

  loginDiv.insertAdjacentHTML('beforeend', message);
};


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


const transformCallback = async () => {
  await animateCSS('#login', 'fadeOutDown');
  document.querySelector('#login').hidden = true;

  document.querySelector('#information').hidden = false;
  animateCSS('#information', 'fadeInUp');
}


const credential = new function() {
  this.save = () => {
    localStorage.setItem('username', document.querySelector('#username').value);
    localStorage.setItem('password', document.querySelector('#password').value);
  };

  this.load = () => {
    document.querySelector('#username').value = localStorage.getItem('username');
    document.querySelector('#password').value = localStorage.getItem('password');
  };
}



const submitLogin = async function(event) {
  event.preventDefault();

  // start to loading fetch process
  document.querySelector('#loginButton').classList.add('is-loading');
  credential.save();

  const content = { username: document.querySelector('#username').value,
                    password: document.querySelector('#password').value,
                    date: document.querySelector('#date').value };

  let response = await fetch('/api/request_from_background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(content)
  });

  // fetch process is finished
  document.querySelector('#loginButton').classList.remove('is-loading');


  if (response.ok) {
    appendMessageToLoginDiv('is-success', '成功', '数据获取成功。请继续提交下一步数据。');
    let yesterdayStatementExists = await fetch('/api/is_yesterday_statement_exists');
    if (yesterdayStatementExists.ok) document.querySelector('#request-yesterday-statement').remove();

    setTimeout(transformCallback, 1500);
  } else {
    appendMessageToLoginDiv('is-danger', '失败', '登陆失败。用户名密码错误，或该用户已在其他设备登陆');
  }
};


document.addEventListener('DOMContentLoaded', () => {
  // set default date as today
  const dateControl = document.querySelector('input[type="date"]');
  let date = new Date();
  dateControl.value = [date.getFullYear(), date.getMonth()+1, date.getDate()].join('-');

  credential.load();
  document.querySelector('#login').addEventListener('submit', submitLogin);
});