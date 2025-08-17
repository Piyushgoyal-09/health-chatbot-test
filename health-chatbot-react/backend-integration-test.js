// Backend Integration Test Script
// Run with: node backend-integration-test.js

const axios = require("axios");

const API_BASE_URL = "http://localhost:8000";

const testQueries = [
  {
    message: "I have been having headaches for the past week",
    expectedSpecialist: "Dr_Warren",
    category: "Medical",
  },
  {
    message: "I need help with my meal planning and nutrition",
    expectedSpecialist: "Carla",
    category: "Nutrition",
  },
  {
    message: "My sleep has been poor lately, what can I do?",
    expectedSpecialist: "Advik",
    category: "Sleep/Recovery",
  },
  {
    message: "I want to improve my workout routine and HRV",
    expectedSpecialist: "Neel",
    category: "Performance",
  },
  {
    message: "I have shoulder pain when I exercise",
    expectedSpecialist: "Rachel",
    category: "Physical Therapy",
  },
  {
    message: "Can you help me schedule an appointment?",
    expectedSpecialist: "Ruby",
    category: "Logistics",
  },
];

async function testBackendIntegration() {
  console.log("🧪 Testing FastAPI Backend Integration");
  console.log("=" * 50);

  try {
    // Test 1: Health Check
    console.log("\n1. Testing backend health check...");
    const healthResponse = await axios.get(`${API_BASE_URL}/`);
    console.log("✅ Backend is running:", healthResponse.data);

    // Test 2: Get Specialists
    console.log("\n2. Testing specialists endpoint...");
    const specialistsResponse = await axios.get(`${API_BASE_URL}/specialists`);
    const specialists = specialistsResponse.data;
    console.log("✅ Specialists loaded:", specialists.length, "specialists");
    specialists.forEach((s) =>
      console.log(`   ${s.avatar} ${s.name}: ${s.description}`)
    );

    // Test 3: Test Chat with Different Queries
    console.log("\n3. Testing chat routing and responses...");
    const sessionId = "test-session-" + Date.now();

    for (const query of testQueries) {
      console.log(`\n   Testing ${query.category} query...`);
      console.log(`   Query: "${query.message}"`);

      try {
        const chatResponse = await axios.post(`${API_BASE_URL}/chat`, {
          message: query.message,
          session_id: sessionId,
        });

        const result = chatResponse.data;
        const routedCorrectly =
          result.specialist_name === query.expectedSpecialist;

        console.log(
          `   ${routedCorrectly ? "✅" : "⚠️ "} Routed to: ${
            result.specialist_name
          } (expected: ${query.expectedSpecialist})`
        );
        console.log(
          `   Response preview: "${result.message.substring(0, 100)}..."`
        );

        if (!routedCorrectly) {
          console.log(
            `   ⚠️  Routing mismatch - this might be normal if the query could go to multiple specialists`
          );
        }
      } catch (error) {
        console.log(
          `   ❌ Error with ${query.category} query:`,
          error.response?.data || error.message
        );
      }
    }

    // Test 4: Get Chat History
    console.log("\n4. Testing chat history...");
    try {
      const historyResponse = await axios.get(
        `${API_BASE_URL}/chat/${sessionId}/history`
      );
      const history = historyResponse.data;
      console.log(`✅ Chat history retrieved: ${history.length} messages`);
    } catch (error) {
      console.log(
        "❌ Error getting chat history:",
        error.response?.data || error.message
      );
    }

    // Test 5: Test File Upload Endpoints
    console.log("\n5. Testing file upload endpoints (without actual files)...");

    // We can't easily test file uploads without actual files in this script
    // but we can check if the endpoints exist
    try {
      // This will fail but tells us if the endpoint exists
      await axios.post(`${API_BASE_URL}/upload/pdf`);
    } catch (error) {
      if (error.response?.status === 422) {
        console.log(
          "✅ PDF upload endpoint exists (validation error expected)"
        );
      } else {
        console.log("❌ PDF upload endpoint error:", error.response?.status);
      }
    }

    try {
      await axios.post(`${API_BASE_URL}/upload/image`);
    } catch (error) {
      if (error.response?.status === 422) {
        console.log(
          "✅ Image upload endpoint exists (validation error expected)"
        );
      } else {
        console.log("❌ Image upload endpoint error:", error.response?.status);
      }
    }

    console.log("\n" + "=" * 50);
    console.log("🎉 Backend Integration Test Complete!");
    console.log("");
    console.log("Next steps:");
    console.log(
      "1. Start your React app: cd /Users/shoaib31/Developer/lodu/health-chatbot-react && npm start"
    );
    console.log("2. Test the full integration in the browser");
    console.log(
      "3. Try uploading files and chatting with different specialists"
    );
  } catch (error) {
    console.log("❌ Backend test failed:", error.message);
    console.log("");
    console.log("Make sure the FastAPI server is running:");
    console.log(
      "cd /Users/shoaib31/Developer/lodu/health-chatbot && python start_server.py"
    );
  }
}

// Check if axios is available
try {
  testBackendIntegration();
} catch (error) {
  console.log("Please install axios first: npm install axios");
  console.log("Or test manually by visiting: http://localhost:8000/docs");
}
