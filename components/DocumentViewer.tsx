
import React, { useState } from 'react';
import { AnalysisResult, SuspiciousArea } from '../types';

interface DocumentViewerProps {
  result: AnalysisResult;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ result }) => {
  const [hoveredArea, setHoveredArea] = useState<SuspiciousArea | null>(null);

  // Gemini returns [ymin, xmin, ymax, xmax] in 0-1000 range
  const getBoxStyle = (box: [number, number, number, number]) => {
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
    };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Visual Analysis Pane */}
      <div className="flex-1">
        <div className="relative border rounded-lg overflow-hidden bg-gray-900 aspect-[3/4] max-h-[700px]">
          <img 
            src={result.thumbnail} 
            alt="Document Analysis" 
            className="w-full h-full object-contain"
          />
          
          {/* Overlays */}
          {result.suspiciousAreas.map((area, idx) => (
            <div
              key={idx}
              className="absolute border-2 border-red-500 bg-red-500/10 cursor-help transition-all hover:bg-red-500/30"
              style={getBoxStyle(area.box_2d)}
              onMouseEnter={() => setHoveredArea(area)}
              onMouseLeave={() => setHoveredArea(null)}
            >
              <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] px-1 py-0.5 whitespace-nowrap -translate-y-full">
                {area.label}
              </div>
            </div>
          ))}

          {/* Tooltip */}
          {hoveredArea && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur shadow-xl border-l-4 border-red-600 p-3 rounded text-sm z-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="font-bold text-red-600 mb-1">{hoveredArea.label}</div>
              <div className="text-gray-700">{hoveredArea.reason}</div>
            </div>
          )}
        </div>
      </div>

      {/* Details Pane */}
      <div className="w-full lg:w-96 space-y-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Forensic Summary</h4>
          <div className={`text-lg font-bold mb-2 ${
            result.status === 'FORGED' ? 'text-red-600' : 
            result.status === 'SUSPICIOUS' ? 'text-amber-600' : 'text-green-600'
          }`}>
            {result.status}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {result.summary}
          </p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                result.confidenceScore > 0.8 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${result.confidenceScore * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Confidence Score</span>
            <span>{(result.confidenceScore * 100).toFixed(1)}%</span>
          </div>
        </div>

        {result.metadataInconsistencies.length > 0 && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-500 mb-3">Structural Flags</h4>
            <ul className="space-y-2">
              {result.metadataInconsistencies.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="text-red-500 mt-0.5">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">OCR Extracted Data</h4>
          <div className="space-y-3">
            {result.extractedFields.map((field, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase">{field.label}</div>
                  <div className="text-sm text-gray-800 font-semibold">{field.value}</div>
                </div>
                {field.confidence && (
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {Math.round(field.confidence * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
