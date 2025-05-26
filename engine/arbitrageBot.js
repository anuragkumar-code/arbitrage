const {
    getCoinbasePrice,
    placeCoinbaseBuy,
    placeCoinbaseSell,
    getCoinbaseBalance,
  } = require('../services/coinbase');
  
  const {
    getBinancePrice,
    placeBinanceBuy,
    placeBinanceSell,
    getBinanceBalance,
  } = require('../services/binance');
  
  const db = require('../db');
  
  const SYMBOL_BINANCE = 'BTCUSDT';
  const SYMBOL_COINBASE = 'BTC-USD';
  
  const MIN_SPREAD_PERCENT = 1.0; // Threshold for trade
  const TRADE_SIZE_BTC = 0.001; // Amount to trade per opportunity
  
  async function checkAndExecuteArbitrage() {
    try {
      const coinbase = await getCoinbasePrice(SYMBOL_COINBASE); // { bid, ask }
      const binance = await getBinancePrice(SYMBOL_BINANCE); // single price
  
      const coinbaseAsk = coinbase.ask; // buy here
      const coinbaseBid = coinbase.bid; // sell here
      const binancePrice = binance; 
  
      const spread1 = ((binancePrice - coinbaseAsk) / coinbaseAsk) * 100;
  
      const spread2 = ((coinbaseBid - binancePrice) / binancePrice) * 100;
  
      console.log(`[${new Date().toISOString()}]`);
      console.log(`Coinbase Ask: $${coinbaseAsk} | Bid: $${coinbaseBid}`);
      console.log(`Binance Price: $${binancePrice}`);
      console.log(`Spread Buy@CB -> Sell@Binance: ${spread1.toFixed(2)}%`);
      console.log(`Spread Buy@Binance -> Sell@CB: ${spread2.toFixed(2)}%`);
  
      if (spread1 >= MIN_SPREAD_PERCENT) {
        // logic to buy on Coinbase, sell on Binance
        const cbBalance = await getCoinbaseBalance('USD');
        const bnBalance = await getBinanceBalance('BTC');
  
        if (cbBalance >= coinbaseAsk * TRADE_SIZE_BTC && bnBalance >= TRADE_SIZE_BTC) {
          console.log('Executing arbitrage: BUY @Coinbase → SELL @Binance');
          await placeCoinbaseBuy(SYMBOL_COINBASE, TRADE_SIZE_BTC);
          await placeBinanceSell(SYMBOL_BINANCE, TRADE_SIZE_BTC);
          await logTrade('Coinbase', 'Binance', coinbaseAsk, binancePrice, spread1);
        } else {
          console.log('Insufficient balances');
        }
      }
  
      if (spread2 >= MIN_SPREAD_PERCENT) {
        // logic to buy on Binance, sell on Coinbase
        const bnBalance = await getBinanceBalance('USDT');
        const cbBalance = await getCoinbaseBalance('BTC');
  
        if (bnBalance >= binancePrice * TRADE_SIZE_BTC && cbBalance >= TRADE_SIZE_BTC) {
          console.log('Executing arbitrage: BUY @Binance → SELL @Coinbase');
          await placeBinanceBuy(SYMBOL_BINANCE, TRADE_SIZE_BTC);
          await placeCoinbaseSell(SYMBOL_COINBASE, TRADE_SIZE_BTC);
          await logTrade('Binance', 'Coinbase', binancePrice, coinbaseBid, spread2);
        } else {
          console.log('Insufficient balances');
        }
      }
    } catch (err) {
      console.error('Arbitrage error:', err.message);
    }
  }
  
  async function logTrade(from, to, buyPrice, sellPrice, spread) {
    await db.execute(
      'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread) VALUES (?, ?, ?, ?, ?)',
      [from, to, buyPrice, sellPrice, spread.toFixed(2)]
    );
  }
  