import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GET /api/test-gemini
 * Test the Gemini API key and connectivity
 */
export async function GET() {
  console.log("[TEST-GEMINI] Testing Gemini API connection");
  
  try {
    // Check if API key is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[TEST-GEMINI] GEMINI_API_KEY is not set in environment variables");
      return NextResponse.json({
        success: false,
        error: "API key is not configured",
        recommendation: "Set the GEMINI_API_KEY environment variable"
      }, { status: 500 });
    }
    
    // Initialize Gemini API client
    console.log("[TEST-GEMINI] Initializing Gemini client with key (first 4 chars):", apiKey.substring(0, 4) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test models
    const models = ["gemini-1.5-flash", "gemini-2.5-flash-preview-04-17"];
    const results: Record<string, { success: boolean; response?: string; error?: string }> = {};
    
    for (const modelName of models) {
      console.log("[TEST-GEMINI] Testing model:", modelName);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Simple test prompt
        const prompt = "Respond with 'OK' if you can see this message.";
        console.log("[TEST-GEMINI] Sending test prompt to", modelName);
        
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        console.log("[TEST-GEMINI] Response from", modelName, ":", response);
        
        results[modelName] = {
          success: true,
          response: response.substring(0, 100) // Limit response length
        };
      } catch (modelError) {
        console.error("[TEST-GEMINI] Error testing model", modelName, ":", modelError);
        results[modelName] = {
          success: false,
          error: modelError instanceof Error ? modelError.message : "Unknown error"
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Gemini API connection test completed",
      apiKeySet: true,
      apiKeyMasked: apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4),
      results
    });
  } catch (error) {
    console.error("[TEST-GEMINI] Unexpected error during API test:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
} 