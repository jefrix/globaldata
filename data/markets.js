window.GLOBALDATA_MARKETS = {
  "generatedAt": "2026-05-13T15:09:52.214Z",
  "refreshMs": 60000,
  "source": "Yahoo Finance chart API via optional GlobalData API route; static fallbacks are generated snapshots.",
  "categories": [
    {
      "id": "americas",
      "label": "AMERICAS",
      "items": [
        {
          "id": "dow",
          "label": "DOW",
          "name": "Dow Jones Industrial Average",
          "symbol": "^DJI",
          "type": "index",
          "exchange": "New York",
          "region": "United States",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EDJI",
          "fallback": {
            "price": 49472.18,
            "previousClose": 49760.56,
            "change": -288.3799999999974,
            "changePct": -0.5795352785418761,
            "currency": "USD",
            "exchange": "DJI",
            "exchangeName": "DJI",
            "dayHigh": 49680.97,
            "dayLow": 49451,
            "volume": 153697330,
            "marketTime": "2026-05-13T15:09:52.000Z"
          }
        },
        {
          "id": "sp500",
          "label": "S&P 500",
          "name": "S&P 500",
          "symbol": "^GSPC",
          "type": "index",
          "exchange": "New York",
          "region": "United States",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EGSPC",
          "fallback": {
            "price": 7412.42,
            "previousClose": 7400.96,
            "change": 11.460000000000036,
            "changePct": 0.15484477689380888,
            "currency": "USD",
            "exchange": "SNP",
            "exchangeName": "SNP",
            "dayHigh": 7415.53,
            "dayLow": 7375.13,
            "volume": 894795212,
            "marketTime": "2026-05-13T15:09:51.000Z"
          }
        },
        {
          "id": "nasdaq",
          "label": "NASDAQ",
          "name": "Nasdaq Composite",
          "symbol": "^IXIC",
          "type": "index",
          "exchange": "New York",
          "region": "United States",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EIXIC",
          "fallback": {
            "price": 26266.922,
            "previousClose": 26088.203,
            "change": 178.71899999999732,
            "changePct": 0.6850567668459085,
            "currency": "USD",
            "exchange": "NIM",
            "exchangeName": "Nasdaq GIDS",
            "dayHigh": 26274.78,
            "dayLow": 25990.158,
            "volume": 3463234000,
            "marketTime": "2026-05-13T15:09:52.000Z"
          }
        },
        {
          "id": "russell",
          "label": "RUSSELL 2000",
          "name": "Russell 2000",
          "symbol": "^RUT",
          "type": "index",
          "exchange": "Chicago",
          "region": "United States",
          "sourceUrl": "https://finance.yahoo.com/quote/%5ERUT",
          "fallback": {
            "price": 2833.939,
            "previousClose": 2842.831,
            "change": -8.89200000000028,
            "changePct": -0.31278679597908843,
            "currency": "USD",
            "exchange": "WCB",
            "exchangeName": "Chicago Options",
            "dayHigh": 2848.954,
            "dayLow": 2815.958,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:50.000Z"
          }
        },
        {
          "id": "tsx",
          "label": "TSX",
          "name": "S&P/TSX Composite",
          "symbol": "^GSPTSE",
          "type": "index",
          "exchange": "Toronto",
          "region": "Canada",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EGSPTSE",
          "fallback": {
            "price": 34109.42,
            "previousClose": 34290.73,
            "change": -181.31000000000495,
            "changePct": -0.5287434825680437,
            "currency": "CAD",
            "exchange": "TSI",
            "exchangeName": "Toronto",
            "dayHigh": 34267.37,
            "dayLow": 34055.56,
            "volume": 60504203,
            "marketTime": "2026-05-13T15:09:46.000Z"
          }
        },
        {
          "id": "bovespa",
          "label": "IBOVESPA",
          "name": "Bovespa Index",
          "symbol": "^BVSP",
          "type": "index",
          "exchange": "Sao Paulo",
          "region": "Brazil",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EBVSP",
          "fallback": {
            "price": 180275.81,
            "previousClose": 180342.33,
            "change": -66.51999999998952,
            "changePct": -0.03688540566154908,
            "currency": "BRL",
            "exchange": "SAO",
            "exchangeName": "Sýo Paulo",
            "dayHigh": 180386.02,
            "dayLow": 178734.42,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:30.000Z"
          }
        },
        {
          "id": "mexico-ipc",
          "label": "IPC MEXICO",
          "name": "S&P/BMV IPC",
          "symbol": "^MXX",
          "type": "index",
          "exchange": "Mexico City",
          "region": "Mexico",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EMXX",
          "fallback": {
            "price": 70603.37,
            "previousClose": 70036.66,
            "change": 566.7099999999919,
            "changePct": 0.8091619446158509,
            "currency": "MXN",
            "exchange": "MEX",
            "exchangeName": "Mexico",
            "dayHigh": 70792.79,
            "dayLow": 69963.31,
            "volume": 10262524,
            "marketTime": "2026-05-13T14:49:53.000Z"
          }
        }
      ]
    },
    {
      "id": "europe",
      "label": "EUROPE",
      "items": [
        {
          "id": "ftse",
          "label": "FTSE 100",
          "name": "FTSE 100",
          "symbol": "^FTSE",
          "type": "index",
          "exchange": "London",
          "region": "United Kingdom",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EFTSE",
          "fallback": {
            "price": 10305.25,
            "previousClose": 10265.32,
            "change": 39.93000000000029,
            "changePct": 0.3889795934271926,
            "currency": "GBP",
            "exchange": "FGI",
            "exchangeName": "FTSE Index",
            "dayHigh": 10360.45,
            "dayLow": 10240.39,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:53.000Z"
          }
        },
        {
          "id": "dax",
          "label": "DAX",
          "name": "DAX Performance Index",
          "symbol": "^GDAXI",
          "type": "index",
          "exchange": "Frankfurt",
          "region": "Germany",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EGDAXI",
          "fallback": {
            "price": 24140.49,
            "previousClose": 23954.93,
            "change": 185.5600000000013,
            "changePct": 0.7746213409932791,
            "currency": "EUR",
            "exchange": "GER",
            "exchangeName": "XETRA",
            "dayHigh": 24226.17,
            "dayLow": 24002.46,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:53.000Z"
          }
        },
        {
          "id": "cac",
          "label": "CAC 40",
          "name": "CAC 40",
          "symbol": "^FCHI",
          "type": "index",
          "exchange": "Paris",
          "region": "France",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EFCHI",
          "fallback": {
            "price": 8005.99,
            "previousClose": 7979.92,
            "change": 26.06999999999971,
            "changePct": 0.3266950044611939,
            "currency": "EUR",
            "exchange": "PAR",
            "exchangeName": "Paris",
            "dayHigh": 8029.94,
            "dayLow": 7931.78,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:45.000Z"
          }
        },
        {
          "id": "eurostoxx",
          "label": "EURO STOXX 50",
          "name": "Euro Stoxx 50",
          "symbol": "^STOXX50E",
          "type": "index",
          "exchange": "Eurozone",
          "region": "Europe",
          "sourceUrl": "https://finance.yahoo.com/quote/%5ESTOXX50E",
          "fallback": {
            "price": 5851.62,
            "previousClose": 5808.45,
            "change": 43.17000000000007,
            "changePct": 0.7432275391885972,
            "currency": "EUR",
            "exchange": "ZRH",
            "exchangeName": "Zurich",
            "dayHigh": 5855.75,
            "dayLow": 5801.16,
            "volume": 0,
            "marketTime": "2026-05-13T14:54:45.000Z"
          }
        }
      ]
    },
    {
      "id": "asia",
      "label": "ASIA PACIFIC",
      "items": [
        {
          "id": "nikkei",
          "label": "NIKKEI 225",
          "name": "Nikkei 225",
          "symbol": "^N225",
          "type": "index",
          "exchange": "Tokyo",
          "region": "Japan",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EN225",
          "fallback": {
            "price": 63272.11,
            "previousClose": 62742.57,
            "change": 529.5400000000009,
            "changePct": 0.843988379819317,
            "currency": "JPY",
            "exchange": "OSA",
            "exchangeName": "Osaka",
            "dayHigh": 63347.91,
            "dayLow": 62318.87,
            "volume": 0,
            "marketTime": "2026-05-13T06:45:03.000Z"
          }
        },
        {
          "id": "hang-seng",
          "label": "HANG SENG",
          "name": "Hang Seng Index",
          "symbol": "^HSI",
          "type": "index",
          "exchange": "Hong Kong",
          "region": "Hong Kong",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EHSI",
          "fallback": {
            "price": 26388.44,
            "previousClose": 26347.91,
            "change": 40.529999999998836,
            "changePct": 0.15382624276460197,
            "currency": "HKD",
            "exchange": "HKG",
            "exchangeName": "HKSE",
            "dayHigh": 26458.9,
            "dayLow": 26220.12,
            "volume": 0,
            "marketTime": "2026-05-13T08:08:38.000Z"
          }
        },
        {
          "id": "shanghai",
          "label": "SHANGHAI",
          "name": "Shanghai Composite",
          "symbol": "000001.SS",
          "type": "index",
          "exchange": "Shanghai",
          "region": "China",
          "sourceUrl": "https://finance.yahoo.com/quote/000001.SS",
          "fallback": {
            "price": 4242.572,
            "previousClose": 4225.02,
            "change": 17.55199999999968,
            "changePct": 0.4154299861302355,
            "currency": "CNY",
            "exchange": "SHH",
            "exchangeName": "Shanghai",
            "dayHigh": 4245.068,
            "dayLow": 4192.314,
            "volume": 1782397164,
            "marketTime": "2026-05-13T07:00:29.000Z"
          }
        },
        {
          "id": "shenzhen",
          "label": "SHENZHEN",
          "name": "Shenzhen Component",
          "symbol": "399001.SZ",
          "type": "index",
          "exchange": "Shenzhen",
          "region": "China",
          "sourceUrl": "https://finance.yahoo.com/quote/399001.SZ",
          "fallback": {
            "price": 16089.749,
            "previousClose": 15899.3,
            "change": 190.44900000000052,
            "changePct": 1.197845188152941,
            "currency": "CNY",
            "exchange": "SHZ",
            "exchangeName": "Shenzhen",
            "dayHigh": 16100.456,
            "dayLow": 15713.542,
            "volume": 2282633277,
            "marketTime": "2026-05-13T08:29:55.000Z"
          }
        },
        {
          "id": "kospi",
          "label": "KOSPI",
          "name": "KOSPI Composite",
          "symbol": "^KS11",
          "type": "index",
          "exchange": "Seoul",
          "region": "South Korea",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EKS11",
          "fallback": {
            "price": 7844.01,
            "previousClose": 7643.15,
            "change": 200.86000000000058,
            "changePct": 2.6279740682833728,
            "currency": "KRW",
            "exchange": "KSC",
            "exchangeName": "KSE",
            "dayHigh": 7855.47,
            "dayLow": 7402.36,
            "volume": 738739,
            "marketTime": "2026-05-13T09:05:40.000Z"
          }
        },
        {
          "id": "asx",
          "label": "ASX 200",
          "name": "S&P/ASX 200",
          "symbol": "^AXJO",
          "type": "index",
          "exchange": "Sydney",
          "region": "Australia",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EAXJO",
          "fallback": {
            "price": 8630.4,
            "previousClose": 8670.7,
            "change": -40.30000000000109,
            "changePct": -0.4647836968180319,
            "currency": "AUD",
            "exchange": "ASX",
            "exchangeName": "ASX",
            "dayHigh": 8670.7,
            "dayLow": 8590.7,
            "volume": 0,
            "marketTime": "2026-05-13T06:50:45.000Z"
          }
        },
        {
          "id": "nifty",
          "label": "NIFTY 50",
          "name": "Nifty 50",
          "symbol": "^NSEI",
          "type": "index",
          "exchange": "Mumbai",
          "region": "India",
          "sourceUrl": "https://finance.yahoo.com/quote/%5ENSEI",
          "fallback": {
            "price": 23412.6,
            "previousClose": 23379.55,
            "change": 33.04999999999927,
            "changePct": 0.14136285771111623,
            "currency": "INR",
            "exchange": "NSI",
            "exchangeName": "NSE",
            "dayHigh": 23582.95,
            "dayLow": 23262.55,
            "volume": 0,
            "marketTime": "2026-05-13T10:01:19.000Z"
          }
        },
        {
          "id": "sensex",
          "label": "SENSEX",
          "name": "BSE Sensex",
          "symbol": "^BSESN",
          "type": "index",
          "exchange": "Mumbai",
          "region": "India",
          "sourceUrl": "https://finance.yahoo.com/quote/%5EBSESN",
          "fallback": {
            "price": 74608.98,
            "previousClose": 74559.24,
            "change": 49.73999999999069,
            "changePct": 0.06671205339538155,
            "currency": "INR",
            "exchange": "BSE",
            "exchangeName": "BSE",
            "dayHigh": 75191.57,
            "dayLow": 74134.48,
            "volume": 0,
            "marketTime": "2026-05-13T10:00:53.000Z"
          }
        }
      ]
    },
    {
      "id": "metals",
      "label": "PRECIOUS / INDUSTRIAL METALS",
      "items": [
        {
          "id": "gold",
          "label": "GOLD",
          "name": "Gold Futures",
          "symbol": "GC=F",
          "type": "metal",
          "exchange": "COMEX",
          "region": "USD/oz",
          "sourceUrl": "https://finance.yahoo.com/quote/GC%3DF",
          "fallback": {
            "price": 4686.6,
            "previousClose": 4686.7,
            "change": -0.0999999999994543,
            "changePct": -0.0021336974843590224,
            "currency": "USD",
            "exchange": "CMX",
            "exchangeName": "COMEX",
            "dayHigh": 4734.8,
            "dayLow": 4676,
            "volume": 78360,
            "marketTime": "2026-05-13T14:59:54.000Z"
          }
        },
        {
          "id": "silver",
          "label": "SILVER",
          "name": "Silver Futures",
          "symbol": "SI=F",
          "type": "metal",
          "exchange": "COMEX",
          "region": "USD/oz",
          "sourceUrl": "https://finance.yahoo.com/quote/SI%3DF",
          "fallback": {
            "price": 88.615,
            "previousClose": 85.591,
            "change": 3.024000000000001,
            "changePct": 3.533081749249338,
            "currency": "USD",
            "exchange": "CMX",
            "exchangeName": "COMEX",
            "dayHigh": 88.98,
            "dayLow": 86.33,
            "volume": 33392,
            "marketTime": "2026-05-13T14:59:54.000Z"
          }
        },
        {
          "id": "platinum",
          "label": "PLATINUM",
          "name": "Platinum Futures",
          "symbol": "PL=F",
          "type": "metal",
          "exchange": "NYMEX",
          "region": "USD/oz",
          "sourceUrl": "https://finance.yahoo.com/quote/PL%3DF",
          "fallback": {
            "price": 2188.1,
            "previousClose": 2119.1,
            "change": 69,
            "changePct": 3.256099287433344,
            "currency": "USD",
            "exchange": "NYM",
            "exchangeName": "NY Mercantile",
            "dayHigh": 2192.1,
            "dayLow": 2116.6,
            "volume": 12746,
            "marketTime": "2026-05-13T14:59:24.000Z"
          }
        },
        {
          "id": "palladium",
          "label": "PALLADIUM",
          "name": "Palladium Futures",
          "symbol": "PA=F",
          "type": "metal",
          "exchange": "NYMEX",
          "region": "USD/oz",
          "sourceUrl": "https://finance.yahoo.com/quote/PA%3DF",
          "fallback": {
            "price": 1526.5,
            "previousClose": 1490.3,
            "change": 36.200000000000045,
            "changePct": 2.429041132657857,
            "currency": "USD",
            "exchange": "NYM",
            "exchangeName": "NY Mercantile",
            "dayHigh": 1530,
            "dayLow": 1497.5,
            "volume": 3170,
            "marketTime": "2026-05-13T14:59:36.000Z"
          }
        },
        {
          "id": "copper",
          "label": "COPPER",
          "name": "Copper Futures",
          "symbol": "HG=F",
          "type": "metal",
          "exchange": "COMEX",
          "region": "USD/lb",
          "sourceUrl": "https://finance.yahoo.com/quote/HG%3DF",
          "fallback": {
            "price": 6.665,
            "previousClose": 6.531,
            "change": 0.13400000000000034,
            "changePct": 2.0517531771551116,
            "currency": "USD",
            "exchange": "CMX",
            "exchangeName": "COMEX",
            "dayHigh": 6.716,
            "dayLow": 6.601,
            "volume": 42734,
            "marketTime": "2026-05-13T14:59:55.000Z"
          }
        }
      ]
    },
    {
      "id": "crypto",
      "label": "CRYPTO",
      "items": [
        {
          "id": "btc",
          "label": "BTC",
          "name": "Bitcoin",
          "symbol": "BTC-USD",
          "type": "crypto",
          "exchange": "Crypto",
          "region": "USD",
          "sourceUrl": "https://finance.yahoo.com/quote/BTC-USD",
          "fallback": {
            "price": 79571.99,
            "previousClose": 80473.984,
            "change": -901.9939999999915,
            "changePct": -1.1208516779783035,
            "currency": "USD",
            "exchange": "CCC",
            "exchangeName": "CCC",
            "dayHigh": 81265.375,
            "dayLow": 79601.766,
            "volume": 31414235136,
            "marketTime": "2026-05-13T15:09:54.000Z"
          }
        },
        {
          "id": "eth",
          "label": "ETH",
          "name": "Ethereum",
          "symbol": "ETH-USD",
          "type": "crypto",
          "exchange": "Crypto",
          "region": "USD",
          "sourceUrl": "https://finance.yahoo.com/quote/ETH-USD",
          "fallback": {
            "price": 2261.8,
            "previousClose": 2274.4106,
            "change": -12.610599999999977,
            "changePct": -0.5544557345977889,
            "currency": "USD",
            "exchange": "CCC",
            "exchangeName": "CCC",
            "dayHigh": 2321.588,
            "dayLow": 2258.4165,
            "volume": 14746963968,
            "marketTime": "2026-05-13T15:09:51.000Z"
          }
        },
        {
          "id": "sol",
          "label": "SOL",
          "name": "Solana",
          "symbol": "SOL-USD",
          "type": "crypto",
          "exchange": "Crypto",
          "region": "USD",
          "sourceUrl": "https://finance.yahoo.com/quote/SOL-USD",
          "fallback": {
            "price": 91.33,
            "previousClose": 94.27931,
            "change": -2.949309999999997,
            "changePct": -3.1282685458771358,
            "currency": "USD",
            "exchange": "CCC",
            "exchangeName": "CCC",
            "dayHigh": 95.78143,
            "dayLow": 91.55093,
            "volume": 4247814144,
            "marketTime": "2026-05-13T15:09:54.000Z"
          }
        },
        {
          "id": "xrp",
          "label": "XRP",
          "name": "XRP",
          "symbol": "XRP-USD",
          "type": "crypto",
          "exchange": "Crypto",
          "region": "USD",
          "sourceUrl": "https://finance.yahoo.com/quote/XRP-USD",
          "fallback": {
            "price": 1.4253,
            "previousClose": 1.436126,
            "change": -0.010826000000000002,
            "changePct": -0.7538335772766458,
            "currency": "USD",
            "exchange": "CCC",
            "exchangeName": "CCC",
            "dayHigh": 1.467889,
            "dayLow": 1.424625,
            "volume": 2231354112,
            "marketTime": "2026-05-13T15:09:57.000Z"
          }
        },
        {
          "id": "bnb",
          "label": "BNB",
          "name": "BNB",
          "symbol": "BNB-USD",
          "type": "crypto",
          "exchange": "Crypto",
          "region": "USD",
          "sourceUrl": "https://finance.yahoo.com/quote/BNB-USD",
          "fallback": {
            "price": 670.44,
            "previousClose": 664.54694,
            "change": 5.893060000000105,
            "changePct": 0.8867785923444483,
            "currency": "USD",
            "exchange": "CCC",
            "exchangeName": "CCC",
            "dayHigh": 684.91144,
            "dayLow": 664.54694,
            "volume": 1993540992,
            "marketTime": "2026-05-13T15:09:32.000Z"
          }
        }
      ]
    }
  ]
};
