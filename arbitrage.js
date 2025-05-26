const { getCoinbasePrice } = require('./services/coinbase');
const { getBinancePrice } = require('./services/binance');
const db = require('./db');

async function fetchAndCheckArbitrage() {
  const symbol = 'BTC-USD';
  const binanceSymbol = 'BTCUSDT';

  const coinbasePrice = await getCoinbasePrice(symbol);
  const binancePrice = await getBinancePrice(binanceSymbol);

  const diff = coinbasePrice - binancePrice;
  const spread = ((diff / binancePrice) * 100).toFixed(2);

  if (Math.abs(spread) >= 1) {
    await db.execute(
      'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread) VALUES (?, ?, ?, ?, ?)',
      [coinbasePrice > binancePrice ? 'Coinbase' : 'Binance',
       coinbasePrice > binancePrice ? 'Binance' : 'Coinbase',
       coinbasePrice > binancePrice ? coinbasePrice : binancePrice,
       coinbasePrice > binancePrice ? binancePrice : coinbasePrice,
       spread]
    );
  }

  return {
    coinbasePrice,
    binancePrice,
    spread: `${spread}%`,
    opportunity: Math.abs(spread) >= 1
  };
}

module.exports = { fetchAndCheckArbitrage };
