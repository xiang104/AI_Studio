
import React, { useState, useCallback } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const UploadIcon = () => (
    <svg className="w-10 h-10 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
    </svg>
);


export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
       if (file.type.startsWith('audio/')) {
            setSelectedFile(file);
            onFileSelect(file);
        } else {
            alert('請上傳音訊檔案。');
        }
    }
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleReset = () => {
    setSelectedFile(null);
    onFileSelect(null as any);
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-2xl shadow-lg flex flex-col items-center space-y-4">
        <h3 className="text-xl font-semibold text-white">上傳現有音檔</h3>
        
        <label
            htmlFor="dropzone-file"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-700 transition-colors
            ${isDragOver ? 'bg-gray-700 border-indigo-500' : 'bg-gray-800'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon />
                <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                <p className="text-xs text-gray-500">支援 MP3, WAV, OGG, WEBM 等格式</p>
            </div>
            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="audio/*" disabled={isProcessing}/>
        </label>
        
        {selectedFile && (
            <div className="w-full p-3 bg-gray-700 rounded-lg flex justify-between items-center">
                <p className="text-sm text-gray-200 truncate pr-2">{selectedFile.name}</p>
                <button 
                  onClick={handleReset} 
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-white transition-colors text-xs font-bold"
                >
                  清除
                </button>
            </div>
        )}
    </div>
  );
};
