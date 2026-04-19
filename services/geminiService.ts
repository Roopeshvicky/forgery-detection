
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ForgeryStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are an expert Forensic Document Examiner (FDE) specialized in detecting digital and physical document forgery. 
Your task is to analyze uploaded documents (Salary Slips, Bank Statements, ID Cards, etc.) for signs of tampering.

Analyze the following:
1. Font Inconsistencies: Mismatched fonts, weight, or kerning that suggest text replacement.
2. Digital Splicing: Alignment issues, pixelation around text boundaries, or mismatched background noise.
3. Logical Errors: Date inconsistencies, mathematical errors in financial tables, or invalid ID patterns.
4. Metadata/Structural Clues: Signs of being edited in software like Photoshop or online PDF editors.

RETURN JSON format with the following structure:
{
  "status": "AUTHENTIC" | "SUSPICIOUS" | "FORGED",
  "confidenceScore": number (0-1),
  "summary": "detailed explanation of findings",
  "extractedFields": [{"label": "Name", "value": "...", "confidence": 0.95}],
  "suspiciousAreas": [{"box_2d": [ymin, xmin, ymax, xmax], "label": "Font Mismatch", "reason": "..."}],
  "metadataInconsistencies": ["list of structural issues detected"]
}

Use normalized coordinates [0-1000] for box_2d.
`;

export const analyzeDocument = async (base64Data: string, fileName: string, mimeType: string): Promise<AnalysisResult> => {
  const model = 'gemini-3-flash-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: "Analyze this document for forgery. Perform OCR and forensic analysis. Provide the results in the specified JSON format." },
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            extractedFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["label", "value"]
              }
            },
            suspiciousAreas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  box_2d: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER },
                    minItems: 4,
                    maxItems: 4
                  },
                  label: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["box_2d", "label", "reason"]
              }
            },
            metadataInconsistencies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["status", "confidenceScore", "summary"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      fileName,
      fileType: mimeType,
      timestamp: new Date().toISOString(),
      status: data.status as ForgeryStatus,
      confidenceScore: data.confidenceScore,
      summary: data.summary,
      extractedFields: data.extractedFields || [],
      suspiciousAreas: data.suspiciousAreas || [],
      metadataInconsistencies: data.metadataInconsistencies || [],
      thumbnail: `data:${mimeType};base64,${base64Data}`
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
};
