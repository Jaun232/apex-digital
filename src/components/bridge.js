const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const API_KEY = "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";

// Universal logger to prove traffic is physically hitting the port
app.use((req, res, next) => {
  console.log(`📡 [TRAFFIC LOG] ${req.method} ${req.url}`);
  next();
});

app.post('/v1/chat/completions', async (req, res) => {
  console.log("📥 [BRIDGE] Intercepted payload from editor workspace...");

  const isStream = req.body.stream ?? true;

  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Accept": isStream ? "text/event-stream" : "application/json",
    "Content-Type": "application/json"
  };

  try {
    const response = await axios.post(invokeUrl, req.body, {
      headers: headers,
      responseType: isStream ? 'stream' : 'json'
    });

    console.log(`✅ [NVIDIA INTERCEPT] Connected (${response.status}) -> Distributing active stream...`);
    res.status(response.status);

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        console.log("🏁 [BRIDGE] Stream sequence finalized successfully.");
        res.end();
      });
    } else {
      res.json(response.data);
    }

  } catch (error) {
    console.error("\n❌ [BRIDGE INTERCEPT EXCEPTION]");
    if (error.response) {
      console.error(`👉 Status Code Returned: ${error.response.status}`);
      if (error.response.data && typeof error.response.data.on === 'function') {
        error.response.data.on('data', (chunk) => {
          console.error(`👉 Upstream Message: ${chunk.toString()}`);
        });
      } else {
        console.error("👉 Error Payload:", error.response.data);
      }
      res.status(error.response.status).send("Upstream error.");
    } else {
      console.error(`👉 Exception Context: ${error.message}`);
      res.status(500).send("Internal proxy connection error.");
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Transparent Proxy Server Active on http://localhost:${PORT}\n`);
});