/**
 * Automatically fetch the payment via HTTP requests, return data in Object.
 * An admin account's username and password is required.
 * 
 * if login is a failure, then returns false.
 *
 * @param username - the admin's account of your store
 *                   suffix will be set to '@sxting'
 * @param password - the username's password
 * @param date in format 'yyyy-mm-dd' as string; or a Date object, payment of the specific day to fetch 
 * @requires account has not already login at other platform
 * @returns {type: {key: values}} payment data object
 */

'use strict';

const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;


function parseHtmlTableIntoObject(html) {
  const { document } = (new JSDOM(html)).window;
  const tableObject = {};

  const tbody = document.querySelector('tbody');
  const tfoot = tbody.nextElementSibling;

  const tbodyRows = tbody.querySelectorAll('tr');
  const tfootRows = tfoot.querySelectorAll('tr')[1];

  for (let row of [...tbodyRows, tfootRows]) {
     let [type, amount, sales]= Array.from((row.querySelectorAll('td').length) ? row.querySelectorAll('td') : row.querySelectorAll('th')).map(e => e.textContent);

    tableObject[`${type}_amount`] = Number(amount);
    tableObject[`${type}_sales`] = Number(sales);
  }

  return tableObject;
}



async function getLoginCookie(username, password) {
  /**
   * Login to pay.kaiweixin.cn
   */
  const loginForm = `username=${username}&ent=sxting&password=${password}`;
  let loginResponse = await axios.post('http://pay.kaiweixin.cn/Stores/index.php?a=Public&m=login', loginForm);

  let loginCookie;
  const cookiesArray = Array.from(loginResponse.headers['set-cookie']);
  cookiesArray.forEach(cookie => {
    if (cookie.split('=')[0] === 'ST_USER_SAVE_ID') loginCookie = cookie;
  });

  // Failed to login; maybe the credential is incorrect or the user has already login on another platform
  if (!loginCookie) return false;

  return loginCookie;
}


const syncData = (cookie, date) => axios.get(`http://pay.kaiweixin.cn/Stores/index.php?day=${date}&a=apis&m=synckaigedianordercode`, {'headers': {'Cookie': cookie}});


async function fetchPayment(cookie, date) {
  const paymentPageUrl = `http://pay.kaiweixin.cn/Stores/index.php?bdate=${date}+00%3A00%3A00&edate=${date}+23%3A59%3A59&a=Statics&m=payType`;
  const paymentResponse = await axios.get(paymentPageUrl, {'headers': {'Cookie': cookie}});

  return parseHtmlTableIntoObject(paymentResponse.data);
}

  // export the main function
module.exports = { getLoginCookie: getLoginCookie,
                   syncData: syncData,
                   fetchPayment: fetchPayment };