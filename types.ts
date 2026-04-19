
export enum ForgeryStatus {
  AUTHENTIC = 'AUTHENTIC',
  SUSPICIOUS = 'SUSPICIOUS',
  FORGED = 'FORGED',
  PENDING = 'PENDING'
}

export interface SuspiciousArea {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  label: string;
  reason: string;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  timestamp: string;
  status: ForgeryStatus;
  confidenceScore: number;
  summary: string;
  extractedFields: ExtractedField[];
  suspiciousAreas: SuspiciousArea[];
  metadataInconsistencies: string[];
  thumbnail: string;
}

export interface BatchStats {
  total: number;
  forged: number;
  suspicious: number;
  authentic: number;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  bio?: string;
}
