const axios = require('axios');

const localBridgeUrl = "http://localhost:3000/v1/chat/completions";

const payload = {
  model: "google/gemma-4-31b-it",
  messages: [
    { role: "user", content: "Ping" }
  ],
  stream: true
};

console.log("📡 Firing clean payload to local proxy...");

async function runDiagnostic() {
  try {
    const response = await axios({
      method: 'post',
      url: localBridgeUrl,
      data: payload,
      responseType: 'stream'
    });

    console.log("📥 Handshake success! Stream connected. Output:\n");

    response.data.on('data', (chunk) => {
      // Print chunks to terminal as they arrive
      process.stdout.write(chunk.toString());
    });

    response.data.on('end', () => {
      console.log("\n\n✅ Stream transaction finalized successfully.");
    });

    response.data.on('error', (streamErr) => {
      console.error("\n❌ Error inside data stream processing:", streamErr.message);
    });

  } catch (error) {
    console.error("\n❌ Request failed to initialize:");
    if (error.response) {
      console.error(`👉 Status Code: ${error.response.status}`);
      console.error(`👉 Message: Context broken or route misaligned.`);
    } else {
      console.error(`👉 Error Message: ${error.message}`);
    }
  }
}

// Fire execution
runDiagnostic();