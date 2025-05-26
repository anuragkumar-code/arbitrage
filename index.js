require('dotenv').config();
const db = require('./db');
const { getBinancePrice } = require('./services/binance');
const { getCoinbasePrice } = require('./services/coinbase');
const checkAndExecuteArbitrage = require('./engine/arbitrageBot');

(async () => {
  try {
    console.log('\n🔌 Starting Arbitrage System Checks...\n');

    // DB Connection check
    await db.execute('SELECT 1');
    console.log('✅ MySQL connection: OK');

    // Binance API check
    const binancePrice = await getBinancePrice('BTCUSDT');
    console.log(`✅ Binance API: BTC Price = $${binancePrice}`);

    // Coinbase API check
    const coinbasePrice = await getCoinbasePrice('BTC-USD');
    console.log(`✅ Coinbase API: Bid = $${coinbasePrice.bid} | Ask = $${coinbasePrice.ask}`);

    console.log('\n🚀 All systems operational. Starting arbitrage engine...\n');

    // Start arbitrage loop
    require('./engine/runner');

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
})();
