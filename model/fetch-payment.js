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


async function fetchPaymentPromise(username, password, date) {
  // convert Date object to 'yyyy-mm-dd' formatted string
  if (date instanceof Date) date = date.toLocaleDateString();

  const paymentPageUrl = `http://pay.kaiweixin.cn/Stores/index.php?bdate=${date}+00%3A00%3A00&edate=${date}+23%3A59%3A59&a=Statics&m=payType`;
  const postData = `username=${username}&ent=sxting&password=${password}`;

  let loginResponse = await axios.post('http://pay.kaiweixin.cn/Stores/index.php?a=Public&m=login', postData);
  const cookiesArray = Array.from(loginResponse.headers['set-cookie']);

  let loginCookie;
  cookiesArray.forEach(cookie => {
    if (cookie.split('=')[0] === 'ST_USER_SAVE_ID') loginCookie = cookie;
  });
  
  // Failed to login; maybe the credential is incorrect or the user is login on other platform already
  if (!loginCookie) return false;

  // await to sync the sells data of `kaigedian`
  await axios.get(`http://pay.kaiweixin.cn/Stores/index.php?day=${date}&a=apis&m=synckaigedianordercode`, {'headers': {'Cookie': loginCookie}});

  // DEBUG: set sleep for 2 seconds for sync data delay
  await new Promise(r => setTimeout(r, 2000));

  let paymentResponse = await axios.get(paymentPageUrl, {'headers': {'Cookie': loginCookie}});
  return parseHtmlTableIntoObject(paymentResponse.data);
}


// export the main function
module.exports = fetchPaymentPromise;