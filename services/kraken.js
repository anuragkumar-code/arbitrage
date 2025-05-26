const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const KRAKEN_API_URL = 'https://api.kraken.com/0';
const KRAKEN_API_KEY = process.env.KRAKEN_API_KEY;
const KRAKEN_API_SECRET = process.env.KRAKEN_API_SECRET;

// Helper function to generate Kraken API signature
function getKrakenSignature(urlpath, data, nonce) {
  const message = nonce + data;
  const secret = Buffer.from(KRAKEN_API_SECRET, 'base64');
  const hash = crypto.createHash('sha256');
  const hmac = crypto.createHmac('sha512', secret);
  
  hash.update(message);
  const hashDigest = hash.digest('binary');
  hmac.update(urlpath + hashDigest, 'binary');
  
  return hmac.digest('base64');
}

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(endpoint, data = {}) {
  const nonce = Date.now() * 1000;
  const stringData = Object.entries({ ...data, nonce })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = getKrakenSignature(`/0/private/${endpoint}`, stringData, nonce);

  try {
    const response = await axios.post(`${KRAKEN_API_URL}/private/${endpoint}`, stringData, {
      headers: {
        'API-Key': KRAKEN_API_KEY,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.error && response.data.error.length > 0) {
      throw new Error(`Kraken API Error: ${response.data.error.join(', ')}`);
    }

    return response.data.result;
  } catch (error) {
    console.error('Kraken API Error:', error.message);
    throw error;
  }
}

async function getKrakenPrice(symbol) {
  try {
    const response = await axios.get(`${KRAKEN_API_URL}/public/Ticker`, {
      params: {
        pair: symbol
      }
    });

    const data = response.data.result[Object.keys(response.data.result)[0]];
    return {
      bid: parseFloat(data.b[0]),
      ask: parseFloat(data.a[0]),
      last: parseFloat(data.c[0]),
      volume: parseFloat(data.v[1])
    };
  } catch (error) {
    console.error('Kraken API Error:', error.message);
    throw error;
  }
}

async function placeKrakenBuy(symbol, amount) {
  try {
    const result = await makeAuthenticatedRequest('AddOrder', {
      pair: symbol,
      type: 'buy',
      ordertype: 'market',
      volume: amount.toString()
    });

    // Wait for order to be filled
    const orderStatus = await checkOrderStatus(result.txid[0]);
    return {
      filled: orderStatus.status === 'closed',
      price: parseFloat(orderStatus.price) || 0,
      txid: result.txid[0]
    };
  } catch (error) {
    console.error('Kraken Buy Error:', error.message);
    throw error;
  }
}

async function placeKrakenSell(symbol, amount) {
  try {
    const result = await makeAuthenticatedRequest('AddOrder', {
      pair: symbol,
      type: 'sell',
      ordertype: 'market',
      volume: amount.toString()
    });

    // Wait for order to be filled
    const orderStatus = await checkOrderStatus(result.txid[0]);
    return {
      filled: orderStatus.status === 'closed',
      price: parseFloat(orderStatus.price) || 0,
      txid: result.txid[0]
    };
  } catch (error) {
    console.error('Kraken Sell Error:', error.message);
    throw error;
  }
}

async function checkOrderStatus(txid) {
  try {
    const result = await makeAuthenticatedRequest('QueryOrders', {
      txid: txid
    });
    return result[txid];
  } catch (error) {
    console.error('Kraken Order Status Error:', error.message);
    throw error;
  }
}

async function getKrakenBalance(currency) {
  try {
    const result = await makeAuthenticatedRequest('Balance');
    const balance = result[currency] || '0';
    return parseFloat(balance);
  } catch (error) {
    console.error('Kraken Balance Error:', error.message);
    throw error;
  }
}

// Helper function to get trading fees
async function getKrakenFees() {
  try {
    const result = await makeAuthenticatedRequest('TradeVolume');
    return result.fees;
  } catch (error) {
    console.error('Kraken Fees Error:', error.message);
    throw error;
  }
}

module.exports = {
  getKrakenPrice,
  placeKrakenBuy,
  placeKrakenSell,
  getKrakenBalance,
  getKrakenFees
}; 