
import React, { useRef } from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center
          ${isProcessing ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 hover:border-blue-500 hover:bg-blue-50 group'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple
          accept="image/*,.pdf" 
          className="hidden" 
        />
        
        <div className="mb-4 p-4 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Upload Documents</h3>
        <p className="text-gray-500 text-sm text-center">
          Drag and drop PDF or Images of salary slips, ID cards, or bank statements.
          <br />
          Supports batch processing for loan pipelines.
        </p>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="mt-3 font-medium text-blue-700">Analyzing security layers...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
