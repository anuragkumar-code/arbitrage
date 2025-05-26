const { setIntervalAsync } = require('set-interval-async/fixed');
const checkAndExecuteArbitrage = require('./arbitrageBot');

setIntervalAsync(async () => {
  await checkAndExecuteArbitrage();
}, 5000); // check every 5 seconds
