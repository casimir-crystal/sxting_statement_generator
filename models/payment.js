/**
 * Automatically fetch the payment via HTTP requests, return data in Object.
 * An admin account's username and password is required.
 *
 * Can syncs the kaigedian data with cookie, with at least 1 minute delay after the request.
 *
 * When failed to login (can't get the cookie), return false.
 */

const axios = require('axios');
const jsdom = require('jsdom');

const { JSDOM } = jsdom;

function parsePageToObject(html) {
  const { document } = new JSDOM(html).window;
  const tableObject = {};

  const tbody = document.querySelector('tbody');

  tbody.querySelectorAll('tr').forEach((row) => {
    const [type, amount, sales] = Array.from(
      row.querySelectorAll('td').length
        ? row.querySelectorAll('td')
        : row.querySelectorAll('th'),
    ).map((e) => e.textContent);

    tableObject[`${type}_amount`] = Number(amount);
    tableObject[`${type}_sales`] = Number(sales);
  });

  return tableObject;
}

async function getLoginCookie(username, password) {
  /**
   * Login to pay.kaiweixin.cn
   */
  const loginForm = `username=${username}&ent=sxting&password=${password}`;
  const loginResponse = await axios.post(
    'http://pay.kaiweixin.cn/Stores/index.php?a=Public&m=login',
    loginForm,
  );

  let loginCookie;
  const cookiesArray = Array.from(loginResponse.headers['set-cookie']);
  cookiesArray.forEach((cookie) => {
    if (cookie.split('=')[0] === 'ST_USER_SAVE_ID') loginCookie = cookie;
  });

  // Failed to login
  if (!loginCookie) return false;

  return loginCookie;
}

function syncData(cookie, date) {
  axios.get(
    `http://pay.kaiweixin.cn/Stores/index.php?day=${date}&a=apis&m=synckaigedianordercode`,
    { headers: { Cookie: cookie } },
  );
}

async function fetchPayment(cookie, date) {
  const paymentPageUrl = `http://pay.kaiweixin.cn/Stores/index.php?bdate=${date}+00%3A00%3A00&edate=${date}+23%3A59%3A59&a=Statics&m=payType`;
  const paymentResponse = await axios.get(paymentPageUrl, {
    headers: { Cookie: cookie },
  });

  return parsePageToObject(paymentResponse.data);
}

// export the main function
module.exports = {
  getLoginCookie,
  syncData,
  fetchPayment,
};
