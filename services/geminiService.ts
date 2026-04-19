
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ForgeryStatus } from "../types";
import { GEMINI_API_KEY } from "./geminiConfig";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

type AnalysisSignals = {
  visualTampering?: number;
  textualConsistency?: number;
  metadataRisk?: number;
  structuralAnomalies?: number;
  evidenceStrength?: number;
  documentQuality?: number;
};

type GeminiAnalysisResponse = {
  status?: ForgeryStatus;
  confidenceScore?: number;
  summary?: string;
  extractedFields?: AnalysisResult["extractedFields"];
  suspiciousAreas?: AnalysisResult["suspiciousAreas"];
  metadataInconsistencies?: string[];
  analysisSignals?: AnalysisSignals;
};

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
  "metadataInconsistencies": ["list of structural issues detected"],
  "analysisSignals": {
    "visualTampering": number (0-1),
    "textualConsistency": number (0-1),
    "metadataRisk": number (0-1),
    "structuralAnomalies": number (0-1),
    "evidenceStrength": number (0-1),
    "documentQuality": number (0-1)
  }
}

Use normalized coordinates [0-1000] for box_2d.
Judge evidence first, verdict second.
Only return FORGED when there are multiple concrete indicators of manipulation or one very strong indicator with clear localization.
Only return AUTHENTIC when the document appears internally consistent, visually clean, and there is no meaningful tampering evidence.
If the image is blurry, partially cropped, low-resolution, or evidence is weak/conflicting, prefer SUSPICIOUS instead of guessing AUTHENTIC or FORGED.
The confidenceScore must represent your confidence in the final status, not a generic constant.
Vary the confidenceScore based on actual evidence quality and quantity:
- Strong, multi-signal proof for FORGED can be 0.88-0.98.
- Mixed but credible issues for SUSPICIOUS should usually be 0.55-0.84.
- Clean documents with only minor uncertainty for AUTHENTIC should usually be 0.70-0.93.
- Avoid repeating the same score across unrelated documents.
Make analysisSignals reflect how much evidence exists in each area.
Keep the summary concise but decisive: explain the top reasons for the verdict and mention image-quality limits when relevant.
`;

const clampScore = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sanitizeSuspiciousAreas = (areas: AnalysisResult["suspiciousAreas"] = []) =>
  areas
    .filter((area) => Array.isArray(area.box_2d) && area.box_2d.length === 4 && typeof area.label === "string" && typeof area.reason === "string")
    .map((area) => ({
      ...area,
      box_2d: area.box_2d.map((point) => clampScore(Number(point), 0, 1000)) as [number, number, number, number],
      label: area.label.trim(),
      reason: area.reason.trim(),
    }))
    .filter((area) => area.label.length > 0 && area.reason.length > 0);

const sanitizeExtractedFields = (fields: AnalysisResult["extractedFields"] = []) =>
  fields
    .filter((field) => typeof field.label === "string" && typeof field.value === "string")
    .map((field) => ({
      label: field.label.trim(),
      value: field.value.trim(),
      confidence: clampScore(
        typeof field.confidence === "number" && Number.isFinite(field.confidence) ? field.confidence : 0.5,
      ),
    }))
    .filter((field) => field.label.length > 0 && field.value.length > 0);

const sanitizeMetadataIssues = (issues: string[] = []) =>
  issues
    .filter((issue): issue is string => typeof issue === "string")
    .map((issue) => issue.trim())
    .filter((issue) => issue.length > 0);

const normalizeSignals = (analysisSignals?: AnalysisSignals): Required<AnalysisSignals> => ({
  visualTampering: clampScore(analysisSignals?.visualTampering ?? 0),
  textualConsistency: clampScore(analysisSignals?.textualConsistency ?? 0.5),
  metadataRisk: clampScore(analysisSignals?.metadataRisk ?? 0),
  structuralAnomalies: clampScore(analysisSignals?.structuralAnomalies ?? 0),
  evidenceStrength: clampScore(analysisSignals?.evidenceStrength ?? 0),
  documentQuality: clampScore(analysisSignals?.documentQuality ?? 0.75),
});

const resolveSignal = (primary: number, fallback: number) => (primary > 0 ? primary : fallback);

const normalizeFieldConfidence = (fields: AnalysisResult["extractedFields"] = []) => {
  const numericConfidences = fields
    .map((field) => field.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number" && Number.isFinite(confidence))
    .map((confidence) => clampScore(confidence));

  return average(numericConfidences);
};

const deriveConfidenceScore = (
  status: ForgeryStatus,
  rawConfidence: number | undefined,
  extractedFields: AnalysisResult["extractedFields"] = [],
  suspiciousAreas: AnalysisResult["suspiciousAreas"] = [],
  metadataInconsistencies: string[] = [],
  analysisSignals?: AnalysisSignals,
) => {
  const suspiciousAreaFactor = clampScore(suspiciousAreas.length / 4);
  const metadataFactor = clampScore(metadataInconsistencies.length / 3);
  const fieldConfidence = normalizeFieldConfidence(extractedFields);
  const normalizedSignals = normalizeSignals(analysisSignals);

  const visualTampering = clampScore(resolveSignal(normalizedSignals.visualTampering, suspiciousAreaFactor * 0.85));
  const textualConsistency = clampScore(resolveSignal(normalizedSignals.textualConsistency, fieldConfidence || 0.5));
  const metadataRisk = clampScore(resolveSignal(normalizedSignals.metadataRisk, metadataFactor * 0.9));
  const structuralAnomalies = clampScore(
    resolveSignal(normalizedSignals.structuralAnomalies, average([suspiciousAreaFactor, metadataFactor])),
  );
  const evidenceStrength = clampScore(
    resolveSignal(
      normalizedSignals.evidenceStrength,
      average([visualTampering, metadataRisk, structuralAnomalies, suspiciousAreas.length > 0 ? 0.75 : fieldConfidence || 0.4]),
    ),
  );
  const documentQuality = normalizedSignals.documentQuality;

  const raw = clampScore(typeof rawConfidence === "number" && Number.isFinite(rawConfidence) ? rawConfidence : evidenceStrength);

  let calibrated: number;
  if (status === ForgeryStatus.FORGED) {
    const forgedEvidence = average([visualTampering, metadataRisk, structuralAnomalies, evidenceStrength]);
    calibrated = 0.5 + forgedEvidence * 0.48;
  } else if (status === ForgeryStatus.SUSPICIOUS) {
    const suspiciousEvidence = average([
      visualTampering,
      metadataRisk,
      structuralAnomalies,
      1 - Math.abs(textualConsistency - 0.5) * 2,
      evidenceStrength,
    ]);
    calibrated = 0.45 + suspiciousEvidence * 0.38;
  } else {
    const authenticityEvidence = average([
      1 - visualTampering,
      textualConsistency,
      1 - metadataRisk,
      1 - structuralAnomalies,
      evidenceStrength,
      documentQuality,
    ]);
    calibrated = 0.52 + authenticityEvidence * 0.4;
  }

  const blended = raw * 0.35 + calibrated * 0.65;
  return Number(clampScore(blended, 0.35, 0.98).toFixed(3));
};

const deriveStatus = (
  rawStatus: ForgeryStatus,
  suspiciousAreas: AnalysisResult["suspiciousAreas"],
  metadataInconsistencies: string[],
  extractedFields: AnalysisResult["extractedFields"],
  analysisSignals?: AnalysisSignals,
) => {
  const fieldConfidence = normalizeFieldConfidence(extractedFields);
  const normalizedSignals = normalizeSignals(analysisSignals);
  const suspiciousAreaFactor = clampScore(suspiciousAreas.length / 4);
  const metadataFactor = clampScore(metadataInconsistencies.length / 3);

  const forgeryEvidence = average([
    resolveSignal(normalizedSignals.visualTampering, suspiciousAreaFactor * 0.9),
    resolveSignal(normalizedSignals.metadataRisk, metadataFactor * 0.85),
    resolveSignal(normalizedSignals.structuralAnomalies, average([suspiciousAreaFactor, metadataFactor])),
    resolveSignal(normalizedSignals.evidenceStrength, suspiciousAreas.length > 0 ? 0.75 : 0.35),
  ]);

  const authenticityEvidence = average([
    1 - resolveSignal(normalizedSignals.visualTampering, suspiciousAreaFactor * 0.9),
    resolveSignal(normalizedSignals.textualConsistency, fieldConfidence || 0.5),
    1 - resolveSignal(normalizedSignals.metadataRisk, metadataFactor * 0.85),
    1 - resolveSignal(normalizedSignals.structuralAnomalies, average([suspiciousAreaFactor, metadataFactor])),
    normalizedSignals.documentQuality,
    fieldConfidence || 0.55,
  ]);

  const lowQuality = normalizedSignals.documentQuality < 0.45;
  const strongForgeryEvidence = forgeryEvidence >= 0.72 && (suspiciousAreas.length >= 2 || metadataInconsistencies.length >= 2);
  const moderateForgeryEvidence = forgeryEvidence >= 0.5 || suspiciousAreas.length > 0 || metadataInconsistencies.length > 0;
  const strongAuthenticityEvidence =
    authenticityEvidence >= 0.76 &&
    suspiciousAreas.length === 0 &&
    metadataInconsistencies.length === 0 &&
    normalizedSignals.visualTampering < 0.22 &&
    normalizedSignals.metadataRisk < 0.22;

  if (strongForgeryEvidence) {
    return ForgeryStatus.FORGED;
  }

  if (lowQuality) {
    return ForgeryStatus.SUSPICIOUS;
  }

  if (strongAuthenticityEvidence) {
    return ForgeryStatus.AUTHENTIC;
  }

  if (moderateForgeryEvidence) {
    return ForgeryStatus.SUSPICIOUS;
  }

  return rawStatus === ForgeryStatus.FORGED ? ForgeryStatus.SUSPICIOUS : rawStatus;
};

const finalizeSummary = (
  summary: string | undefined,
  status: ForgeryStatus,
  suspiciousAreas: AnalysisResult["suspiciousAreas"],
  metadataInconsistencies: string[],
  analysisSignals?: AnalysisSignals,
) => {
  const baseSummary = (summary || "Analysis completed, but the model returned limited explanation.").trim();
  const normalizedSignals = normalizeSignals(analysisSignals);
  const qualityNote =
    normalizedSignals.documentQuality < 0.45
      ? " Image quality was limited, so the result is treated conservatively."
      : "";
  const evidenceNote =
    status === ForgeryStatus.FORGED && suspiciousAreas.length > 0
      ? ` ${suspiciousAreas.length} suspicious area(s) were localized.`
      : status === ForgeryStatus.AUTHENTIC && suspiciousAreas.length === 0 && metadataInconsistencies.length === 0
        ? " No strong tampering indicators were detected."
        : "";

  return `${baseSummary}${evidenceNote}${qualityNote}`.trim();
};

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
            },
            analysisSignals: {
              type: Type.OBJECT,
              properties: {
                visualTampering: { type: Type.NUMBER },
                textualConsistency: { type: Type.NUMBER },
                metadataRisk: { type: Type.NUMBER },
                structuralAnomalies: { type: Type.NUMBER },
                evidenceStrength: { type: Type.NUMBER },
                documentQuality: { type: Type.NUMBER }
              }
            }
          },
          required: ["status", "confidenceScore", "summary"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}') as GeminiAnalysisResponse;
    const rawStatus = (data.status as ForgeryStatus) || ForgeryStatus.SUSPICIOUS;
    const extractedFields = sanitizeExtractedFields(data.extractedFields || []);
    const suspiciousAreas = sanitizeSuspiciousAreas(data.suspiciousAreas || []);
    const metadataInconsistencies = sanitizeMetadataIssues(data.metadataInconsistencies || []);
    const status = deriveStatus(
      rawStatus,
      suspiciousAreas,
      metadataInconsistencies,
      extractedFields,
      data.analysisSignals,
    );
    const confidenceScore = deriveConfidenceScore(
      status,
      data.confidenceScore,
      extractedFields,
      suspiciousAreas,
      metadataInconsistencies,
      data.analysisSignals,
    );
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      fileName,
      fileType: mimeType,
      timestamp: new Date().toISOString(),
      status,
      confidenceScore,
      summary: finalizeSummary(data.summary, status, suspiciousAreas, metadataInconsistencies, data.analysisSignals),
      extractedFields,
      suspiciousAreas,
      metadataInconsistencies,
      thumbnail: `data:${mimeType};base64,${base64Data}`
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
};
