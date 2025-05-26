// const {
//     getCoinbasePrice,
//     placeCoinbaseBuy,
//     placeCoinbaseSell,
//     getCoinbaseBalance,
//   } = require('../services/coinbase');
  
//   const {
//     getBinancePrice,
//     placeBinanceBuy,
//     placeBinanceSell,
//     getBinanceBalance,
//   } = require('../services/binance');
  
//   const db = require('../db');
  
//   const SYMBOL_BINANCE = 'BTCUSDT';
//   const SYMBOL_COINBASE = 'BTC-USD';
  
//   const MIN_SPREAD_PERCENT = 1.0; // Threshold for trade
//   const TRADE_SIZE_BTC = 0.001; // Amount to trade per opportunity
  
//   async function checkAndExecuteArbitrage() {
//     try {
//       const coinbase = await getCoinbasePrice(SYMBOL_COINBASE); // { bid, ask }
//       const binance = await getBinancePrice(SYMBOL_BINANCE); // single price
  
//       const coinbaseAsk = coinbase.ask; // buy here
//       const coinbaseBid = coinbase.bid; // sell here
//       const binancePrice = binance; 
  
//       const spread1 = ((binancePrice - coinbaseAsk) / coinbaseAsk) * 100;
  
//       const spread2 = ((coinbaseBid - binancePrice) / binancePrice) * 100;
  
//       console.log(`[${new Date().toISOString()}]`);
//       console.log(`Coinbase Ask: $${coinbaseAsk} | Bid: $${coinbaseBid}`);
//       console.log(`Binance Price: $${binancePrice}`);
//       console.log(`Spread Buy@CB -> Sell@Binance: ${spread1.toFixed(2)}%`);
//       console.log(`Spread Buy@Binance -> Sell@CB: ${spread2.toFixed(2)}%`);
  
//       if (spread1 >= MIN_SPREAD_PERCENT) {
//         // logic to buy on Coinbase, sell on Binance
//         const cbBalance = await getCoinbaseBalance('USD');
//         const bnBalance = await getBinanceBalance('BTC');
  
//         if (cbBalance >= coinbaseAsk * TRADE_SIZE_BTC && bnBalance >= TRADE_SIZE_BTC) {
//           console.log('Executing arbitrage: BUY @Coinbase → SELL @Binance');
//           await placeCoinbaseBuy(SYMBOL_COINBASE, TRADE_SIZE_BTC);
//           await placeBinanceSell(SYMBOL_BINANCE, TRADE_SIZE_BTC);
//           await logTrade('Coinbase', 'Binance', coinbaseAsk, binancePrice, spread1);
//         } else {
//           console.log('Insufficient balances');
//         }
//       }
  
//       if (spread2 >= MIN_SPREAD_PERCENT) {
//         // logic to buy on Binance, sell on Coinbase
//         const bnBalance = await getBinanceBalance('USDT');
//         const cbBalance = await getCoinbaseBalance('BTC');
  
//         if (bnBalance >= binancePrice * TRADE_SIZE_BTC && cbBalance >= TRADE_SIZE_BTC) {
//           console.log('Executing arbitrage: BUY @Binance → SELL @Coinbase');
//           await placeBinanceBuy(SYMBOL_BINANCE, TRADE_SIZE_BTC);
//           await placeCoinbaseSell(SYMBOL_COINBASE, TRADE_SIZE_BTC);
//           await logTrade('Binance', 'Coinbase', binancePrice, coinbaseBid, spread2);
//         } else {
//           console.log('Insufficient balances');
//         }
//       }
//     } catch (err) {
//       console.error('Arbitrage error:', err.message);
//     }
//   }
  
//   async function logTrade(from, to, buyPrice, sellPrice, spread) {
//     await db.execute(
//       'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread) VALUES (?, ?, ?, ?, ?)',
//       [from, to, buyPrice, sellPrice, spread.toFixed(2)]
//     );
//   }
  

// handling in case of errors below
const { getBinanceBidAsk, placeBinanceBuy, placeBinanceSell } = require('../services/binance');
const { getCoinbasePrice, placeCoinbaseBuy, placeCoinbaseSell } = require('../services/coinbase');
const db = require('../db');

const SPREAD_THRESHOLD = 0.5; // percent
const TRADE_AMOUNT_USD = 20; // USD amount per trade

// Retry helper
async function retry(fn, retries = 3, delayMs = 2000) {
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

async function checkAndExecuteArbitrage() {
  try {
    const binance = await getBinanceBidAsk('BTCUSDT'); // { bid, ask }
    const coinbase = await getCoinbasePrice('BTC-USD'); // { bid, ask }

    const midPrice = (binance.bid + binance.ask + coinbase.bid + coinbase.ask) / 4;

    // Spread if buying on Binance (lower ask) and selling on Coinbase (higher bid)
    const spreadBinanceBuy = calculateSpread(binance.ask, coinbase.bid);

    // Spread if buying on Coinbase (lower ask) and selling on Binance (higher bid)
    const spreadCoinbaseBuy = calculateSpread(coinbase.ask, binance.bid);

    console.log(`Spread Buy Binance, Sell Coinbase: ${spreadBinanceBuy.toFixed(2)}%`);
    console.log(`Spread Buy Coinbase, Sell Binance: ${spreadCoinbaseBuy.toFixed(2)}%`);

    if (spreadBinanceBuy > SPREAD_THRESHOLD) {
      console.log('🔥 Arbitrage: Buy on Binance, Sell on Coinbase');

      const btcQuantity = +(TRADE_AMOUNT_USD / binance.ask).toFixed(6);

      // Buy Binance
      const buyResult = await retry(() => placeBinanceBuy('BTCUSDT', btcQuantity));
      if (!buyResult || !buyResult.filled) throw new Error('Binance buy failed');

      // Sell Coinbase
      try {
        const sellResult = await retry(() => placeCoinbaseSell('BTC-USD', btcQuantity.toString()));
        if (!sellResult || !sellResult.filled) throw new Error('Coinbase sell failed');
      } catch (err) {
        console.error('Coinbase sell failed. Attempting compensation sell on Binance...');
        await retry(() => placeBinanceSell('BTCUSDT', btcQuantity));
      }

      await db.execute(
        'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        ['Binance', 'Coinbase', binance.ask, coinbase.bid, spreadBinanceBuy, btcQuantity]
      );
    } else if (spreadCoinbaseBuy > SPREAD_THRESHOLD) {
      console.log('🔥 Arbitrage: Buy on Coinbase, Sell on Binance');

      const btcQuantity = +(TRADE_AMOUNT_USD / coinbase.ask).toFixed(6);

      // Buy Coinbase
      const buyResult = await retry(() => placeCoinbaseBuy('BTC-USD', btcQuantity.toString()));
      if (!buyResult || !buyResult.filled) throw new Error('Coinbase buy failed');

      // Sell Binance
      try {
        const sellResult = await retry(() => placeBinanceSell('BTCUSDT', btcQuantity));
        if (!sellResult || !sellResult.filled) throw new Error('Binance sell failed');
      } catch (err) {
        console.error('Binance sell failed. Attempting compensation sell on Coinbase...');
        await retry(() => placeCoinbaseSell('BTC-USD', btcQuantity.toString()));
      }

      await db.execute(
        'INSERT INTO trades (exchange_from, exchange_to, price_from, price_to, spread, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        ['Coinbase', 'Binance', coinbase.ask, binance.bid, spreadCoinbaseBuy, btcQuantity]
      );
    } else {
      console.log('No arbitrage opportunity found.');
    }
  } catch (err) {
    console.error('Error during arbitrage:', err.message);
  }
}

module.exports = checkAndExecuteArbitrage;
