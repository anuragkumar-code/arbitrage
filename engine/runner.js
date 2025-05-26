const checkAndExecuteMultiExchangeArbitrage = require('./multiExchangeArbitrage');

const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

async function runArbitrageLoop() {
  while (true) {
    try {
      await checkAndExecuteMultiExchangeArbitrage();
    } catch (err) {
      console.error('Error in arbitrage loop:', err.message);
    }
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
  }
}

runArbitrageLoop();
