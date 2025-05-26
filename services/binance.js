const Binance = require('node-binance-api');
require('dotenv').config();

const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
});

async function getBinancePrice(symbol = 'BTCUSDT') {
  const prices = await binance.prices();
  return parseFloat(prices[symbol]);
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

async function getBinanceBidAsk(symbol = 'BTCUSDT') {
  const tickers = await binance.bookTickers();
  const ticker = tickers[symbol];
  if (!ticker) throw new Error(`Symbol ${symbol} not found in Binance tickers`);
  return {
    bid: parseFloat(ticker.bidPrice),
    ask: parseFloat(ticker.askPrice),
  };
}


module.exports = {
  getBinancePrice,
  placeBinanceBuy,
  placeBinanceSell,
  getBinanceBalance,
  getBinanceBidAsk
};
