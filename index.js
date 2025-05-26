require('dotenv').config();
const db = require('./db');
const { getBinancePrice } = require('./services/binance');
const { getCoinbasePrice } = require('./services/coinbase');
const { getKrakenPrice } = require('./services/kraken');
const checkAndExecuteMultiExchangeArbitrage = require('./engine/multiExchangeArbitrage');

(async () => {
  try {
    console.log('\n🔌 Starting Multi-Exchange Arbitrage System...\n');

    // DB Connection check
    await db.execute('SELECT 1');
    console.log('✅ MySQL connection: OK');

    // Exchange API checks
    const binancePrice = await getBinancePrice('BTCUSDT');
    console.log(`✅ Binance API: BTC Price = $${binancePrice}`);

    const coinbasePrice = await getCoinbasePrice('BTC-USD');
    console.log(`✅ Coinbase API: Bid = $${coinbasePrice.bid} | Ask = $${coinbasePrice.ask}`);

    const krakenPrice = await getKrakenPrice('XBTUSD');
    console.log(`✅ Kraken API: Bid = $${krakenPrice.bid} | Ask = $${krakenPrice.ask}`);

    console.log('\n🚀 All systems operational. Starting multi-exchange arbitrage engine...\n');

    // Start arbitrage loop
    require('./engine/runner');

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
})();
