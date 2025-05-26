const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function getDynamicThreshold(marketDataSummary) {
    const prompt = `
    You're a crypto trading assistant. Analyze this market snapshot:
    
    - Binance: bid ${binance.bid}, ask ${binance.ask}
    - Coinbase: bid ${coinbase.bid}, ask ${coinbase.ask}
    
    Based on volatility and price differences, what is a good arbitrage spread threshold in percent for low-risk trading (e.g. 0.2 to 1.0%)?
    Only return a number like 0.3 or 0.6. No text.
    `;

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    max_tokens: 5,
    temperature: 0.2,
  });

  const threshold = parseFloat(response.data.choices[0].text.trim());
  return threshold || 0.5; // fallback
}

module.exports = { getDynamicThreshold };
