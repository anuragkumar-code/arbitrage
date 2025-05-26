const { CoinbaseAdvancedTradeClient } = require('coinbase-advanced-node');
require('dotenv').config();

const coinbase = new CoinbaseAdvancedTradeClient({
  apiKey: process.env.COINBASE_API_KEY,
  apiSecret: process.env.COINBASE_API_SECRET,
  passphrase: process.env.COINBASE_PASSPHRASE,
  useSandbox: false, // set to true for sandbox
});

async function getCoinbasePrice(symbol = 'BTC-USD') {
  const ticker = await coinbase.getBestBidAsk(symbol);
  return {
    bid: parseFloat(ticker.bestBid),
    ask: parseFloat(ticker.bestAsk),
  };
}

async function placeCoinbaseBuy(symbol = 'BTC-USD', baseSize) {
  return await coinbase.placeMarketOrder({
    product_id: symbol,
    side: 'BUY',
    base_size: baseSize.toString(),
  });
}

async function placeCoinbaseSell(symbol = 'BTC-USD', baseSize) {
  return await coinbase.placeMarketOrder({
    product_id: symbol,
    side: 'SELL',
    base_size: baseSize.toString(),
  });
}

async function getCoinbaseBalance(currency = 'BTC') {
  const accounts = await coinbase.listAccounts();
  const acc = accounts.find((a) => a.currency === currency);
  return acc ? parseFloat(acc.available_balance.value) : 0;
}

module.exports = {
  getCoinbasePrice,
  placeCoinbaseBuy,
  placeCoinbaseSell,
  getCoinbaseBalance,
};
