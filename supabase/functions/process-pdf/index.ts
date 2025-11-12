import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessPdfRequest {
  filePath: string;
  documentId: string;
}

interface ProcessPdfResponse {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pages: number;
    length: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { filePath, documentId }: ProcessPdfRequest = await req.json();

    if (!filePath || !documentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing filePath or documentId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing PDF: ${filePath} for document: ${documentId}`);

    const bucketName = "policy-documents";
    const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download PDF: ${downloadResponse.statusText}`);
    }

    const pdfBuffer = await downloadResponse.arrayBuffer();
    console.log(`Downloaded PDF: ${pdfBuffer.byteLength} bytes`);

    const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;

    const data = await pdfParse(Buffer.from(pdfBuffer));

    const extractedText = data.text.trim();
    console.log(`Extracted text: ${extractedText.length} characters from ${data.numpages} pages`);

    if (!extractedText || extractedText.length < 10) {
      throw new Error("Extracted text is too short or empty. The PDF may be scanned or contain only images.");
    }

    const response: ProcessPdfResponse = {
      success: true,
      text: extractedText,
      metadata: {
        pages: data.numpages,
        length: extractedText.length,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing PDF:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    const response: ProcessPdfResponse = {
      success: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});