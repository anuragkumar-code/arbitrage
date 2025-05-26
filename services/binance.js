const Binance = require('node-binance-api');
require('dotenv').config();

const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
});

async function getBinancePrice(symbol = 'BTCUSDT') {
  const { price } = await binance.prices(symbol);
  return parseFloat(price);
}

async function placeBinanceBuy(symbol = 'BTCUSDT', quantity) {
  return await binance.marketBuy(symbol, quantity);
}

async function placeBinanceSell(symbol = 'BTCUSDT', quantity) {
  return await binance.marketSell(symbol, quantity);
}

async function getBinanceBalance(asset = 'BTC') {
  const balances = await binance.balance();
  return balances[asset]?.available || 0;
}

module.exports = {
  getBinancePrice,
  placeBinanceBuy,
  placeBinanceSell,
  getBinanceBalance,
};
