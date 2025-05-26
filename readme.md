# 🤖 Crypto Arbitrage Bot — Backend

This is the backend service for a **real-time crypto arbitrage trading bot**. It continuously monitors price spreads between **Binance** and **Coinbase (Advanced Trade)** and automatically executes profitable trades when the spread exceeds a configurable threshold.

---

## 📌 Features

- 🔁 Real-time arbitrage detection (Coinbase ↔ Binance)
- ⚡ Executes market buy/sell trades based on opportunity
- 💰 Configurable trade amount and spread threshold
- 🔐 Secure API key management via `.env`
- 📊 MySQL logging for executed trades
- 🧠 Modular architecture (Binance/Coinbase services, arbitrage engine)

---

## 📦 Tech Stack

- **Node.js + Express**
- **MySQL** (for trade logging)
- **Binance REST API**
- **Coinbase Advanced Trade API**
- **dotenv** for secrets
- **Modular** service-based structure

---

## 🚀 Getting Started

### 1. Clone the repo


## 🚀 Install dependencies

### npm install

## 🚀 Set up environment variables

## ⚙️ Run the Bot
# node engine/runner.js