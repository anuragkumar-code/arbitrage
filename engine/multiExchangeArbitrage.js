const { getBinanceBidAsk, placeBinanceBuy, placeBinanceSell } = require('../services/binance');
const { getCoinbasePrice, placeCoinbaseBuy, placeCoinbaseSell } = require('../services/coinbase');
const { getKrakenPrice, placeKrakenBuy, placeKrakenSell } = require('../services/kraken');
const { getDynamicThreshold } = require('../services/openai');
const db = require('../db');

const TRADE_AMOUNT_USD = 20;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Exchange configurations
const EXCHANGES = {
  binance: {
    name: 'Binance',
    symbol: 'BTCUSDT',
    getPrice: getBinanceBidAsk,
    buy: placeBinanceBuy,
    sell: placeBinanceSell
  },
  coinbase: {
    name: 'Coinbase',
    symbol: 'BTC-USD',
    getPrice: getCoinbasePrice,
    buy: placeCoinbaseBuy,
    sell: placeCoinbaseSell
  },
  kraken: {
    name: 'Kraken',
    symbol: 'XBTUSD',
    getPrice: getKrakenPrice,
    buy: placeKrakenBuy,
    sell: placeKrakenSell
  }
};

// Retry helper
async function retry(fn, retries = RETRY_ATTEMPTS, delayMs = RETRY_DELAY_MS) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed: ${err.message}`);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delayMs));
      else throw err;
    }
  }
}

function calculateSpread(price1, price2) {
  return ((price2 - price1) / ((price1 + price2) / 2)) * 100;
}

async function getAllPrices() {
  const prices = {};
  for (const [exchangeId, exchange] of Object.entries(EXCHANGES)) {
    try {
      prices[exchangeId] = await retry(() => exchange.getPrice(exchange.symbol));
    } catch (err) {
      console.error(`Failed to get price from ${exchange.name}:`, err.message);
    }
  }
  return prices;
}

async function findArbitrageOpportunities(prices) {
  const opportunities = [];
  const exchanges = Object.keys(prices);

  for (let i = 0; i < exchanges.length; i++) {
    for (let j = i + 1; j < exchanges.length; j++) {
      const exchange1 = exchanges[i];
      const exchange2 = exchanges[j];

      if (!prices[exchange1] || !prices[exchange2]) continue;

      // Check both directions
      const spread1 = calculateSpread(prices[exchange1].ask, prices[exchange2].bid);
      const spread2 = calculateSpread(prices[exchange2].ask, prices[exchange1].bid);

      if (spread1 > 0) {
        opportunities.push({
          buyExchange: exchange1,
          sellExchange: exchange2,
          spread: spread1,
          buyPrice: prices[exchange1].ask,
          sellPrice: prices[exchange2].bid
        });
      }

      if (spread2 > 0) {
        opportunities.push({
          buyExchange: exchange2,
          sellExchange: exchange1,
          spread: spread2,
          buyPrice: prices[exchange2].ask,
          sellPrice: prices[exchange1].bid
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.spread - a.spread);
}

async function executeArbitrage(opportunity) {
  const buyExchange = EXCHANGES[opportunity.buyExchange];
  const sellExchange = EXCHANGES[opportunity.sellExchange];

  const btcQuantity = +(TRADE_AMOUNT_USD / opportunity.buyPrice).toFixed(6);

  console.log(`🔥 Executing arbitrage: Buy on ${buyExchange.name}, Sell on ${sellExchange.name}`);
  console.log(`Spread: ${opportunity.spread.toFixed(2)}%`);

  // Buy on first exchange
  const buyResult = await retry(() => 
    buyExchange.buy(buyExchange.symbol, btcQuantity.toString())
  );
  if (!buyResult || !buyResult.filled) throw new Error(`${buyExchange.name} buy failed`);

  // Sell on second exchange
  try {
    const sellResult = await retry(() => 
      sellExchange.sell(sellExchange.symbol, btcQuantity.toString())
    );
    if (!sellResult || !sellResult.filled) throw new Error(`${sellExchange.name} sell failed`);
  } catch (err) {
    console.error(`${sellExchange.name} sell failed. Attempting compensation sell on ${buyExchange.name}...`);
    await retry(() => buyExchange.sell(buyExchange.symbol, btcQuantity.toString()));
    throw err;
  }

  // Log the trade
  await db.execute(
    'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread, quantity) VALUES (?, ?, ?, ?, ?, ?)',
    [buyExchange.name, sellExchange.name, opportunity.buyPrice, opportunity.sellPrice, opportunity.spread, btcQuantity]
  );

  return {
    success: true,
    profit: (opportunity.sellPrice - opportunity.buyPrice) * btcQuantity,
    spread: opportunity.spread
  };
}

async function checkAndExecuteMultiExchangeArbitrage() {
  try {
    // Get prices from all exchanges
    const prices = await getAllPrices();
    
    // Get market data summary for dynamic threshold
    const marketDataSummary = Object.entries(prices)
      .map(([exchange, data]) => `${exchange}: bid=${data.bid}, ask=${data.ask}`)
      .join(', ');
    
    const SPREAD_THRESHOLD = await getDynamicThreshold(marketDataSummary);

    // Find arbitrage opportunities
    const opportunities = await findArbitrageOpportunities(prices);
    
    // Execute the best opportunity if it meets the threshold
    if (opportunities.length > 0 && opportunities[0].spread > SPREAD_THRESHOLD) {
      const result = await executeArbitrage(opportunities[0]);
      console.log(`✅ Arbitrage executed successfully! Profit: $${result.profit.toFixed(2)}`);
    } else {
      console.log('No profitable arbitrage opportunities found.');
    }
  } catch (err) {
    console.error('Error during multi-exchange arbitrage:', err.message);
  }
}

module.exports = checkAndExecuteMultiExchangeArbitrage; 