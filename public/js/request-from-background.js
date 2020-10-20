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


const transformCallback = () => animateCSS('#login', 'fadeOutDown').then(() => animateCSS('#information', 'fadeInUp'));

const saveCredential = () => {
  localStorage.setItem('username', document.querySelector('#username').value);
  localStorage.setItem('password', document.querySelector('#password').value);
};

const loadCredential = () => {
  document.querySelector('#username').value = localStorage.getItem('username');
  document.querySelector('#password').value = localStorage.getItem('password');
};

const clickOnRequest = async function() {
  saveCredential();

  // start to loading fetch process
  this.classList.add('is-loading')

  const params = new URLSearchParams({ 
    username: document.querySelector('#username').value,
    password: document.querySelector('#password').value,
  });

  let loginDiv = document.querySelector('#login');
  let response = await fetch(`/api/request_from_background?${params}`);

  // fetch process is loading finished
  this.classList.remove('is-loading');

  if (response.ok) {
    appendMessageToLoginDiv('is-success', '成功', '数据获取成功。请继续提交下一步数据。');
    setTimeout(transformCallback, 1500);
  } else {
    appendMessageToLoginDiv('is-danger', '失败', '登陆失败。用户名密码错误，或本用户已在其他设备登陆');
  }
};


document.addEventListener('DOMContentLoaded', () => {
  loadCredential();
  document.querySelector('#request').addEventListener('click', clickOnRequest);
});