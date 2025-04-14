import { NextResponse } from "next/server";
import { extractTextFromPdf, parsePdfContent } from "@/lib/actions/resume-parser";

export async function POST(req: Request) {
  try {
    // Get the PDF data from the request
    const data = await req.json();
    const { pdfBase64 } = data;
    
    if (!pdfBase64) {
      console.error("API route: Missing PDF data in request");
      return NextResponse.json(
        { success: false, error: "Missing PDF data" },
        { status: 400 }
      );
    }
    
    // First, extract text from the PDF
    console.log("API route: Starting PDF text extraction");
    let pdfText: string;
    try {
      pdfText = await extractTextFromPdf(pdfBase64);
      console.log(`API route: Successfully extracted ${pdfText.length} characters of text`);
      
      if (pdfText.length < 100) {
        console.warn("API route: Extracted text is suspiciously short");
      }
    } catch (extractError) {
      console.error("API route: Error extracting PDF text:", extractError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to extract text from PDF",
          message: extractError instanceof Error ? extractError.message : String(extractError)
        },
        { status: 500 }
      );
    }
    
    // Then, parse the text with Gemini AI
    console.log("API route: Starting parsing with Gemini AI");
    try {
      const resumeData = await parsePdfContent(pdfText);
      console.log(`API route: Successfully parsed resume data with ${resumeData.skills.length} skills`);
      
      // Return the results
      return NextResponse.json({
        success: true,
        pdfTextLength: pdfText.length,
        pdfTextSample: pdfText.substring(0, 500) + "...",
        parsedData: resumeData
      });
    } catch (parseError) {
      console.error("API route: Error parsing resume data:", parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to parse resume data",
          message: parseError instanceof Error ? parseError.message : String(parseError),
          pdfTextSample: pdfText.substring(0, 500) + "..."
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in test CV parsing route:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 