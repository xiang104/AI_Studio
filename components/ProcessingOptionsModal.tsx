
import React, { useState } from 'react';

export interface ProcessingOptions {
  generateSummary: boolean;
  generateTranscript: boolean;
}

interface ProcessingOptionsModalProps {
  audioBlob: Blob | null;
  onClose: () => void;
  onConfirm: (blob: Blob, options: ProcessingOptions) => void;
}

export const ProcessingOptionsModal: React.FC<ProcessingOptionsModalProps> = ({ audioBlob, onClose, onConfirm }) => {
  const [options, setOptions] = useState<ProcessingOptions>({
    generateSummary: true,
    generateTranscript: true,
  });

  if (!audioBlob) {
    return null;
  }

  const handleConfirm = () => {
    if (!options.generateSummary && !options.generateTranscript) {
      alert('請至少選擇一個處理選項。');
      return;
    }
    onConfirm(audioBlob, options);
  };

  const handleCheckboxChange = (option: keyof ProcessingOptions, checked: boolean) => {
    setOptions(prev => ({ ...prev, [option]: checked }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" aria-labelledby="processing-options-title">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col" role="document">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id="processing-options-title" className="text-xl font-bold text-white">處理選項</h2>
          <button onClick={onClose} aria-label="關閉" className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="p-6 space-y-4">
          <p className="text-gray-300">請選擇要為此音訊執行的 AI 任務：</p>
          <fieldset className="space-y-3">
            <legend className="sr-only">AI 任務選項</legend>
            <label className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={options.generateTranscript}
                onChange={(e) => handleCheckboxChange('generateTranscript', e.target.checked)}
                className="w-5 h-5 text-indigo-500 bg-gray-600 border-gray-500 rounded focus:ring-indigo-600 ring-offset-gray-800 focus:ring-2"
              />
              <span className="ml-3 text-white font-medium">產生逐字稿</span>
            </label>
            <label className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={options.generateSummary}
                onChange={(e) => handleCheckboxChange('generateSummary', e.target.checked)}
                className="w-5 h-5 text-indigo-500 bg-gray-600 border-gray-500 rounded focus:ring-indigo-600 ring-offset-gray-800 focus:ring-2"
              />
              <span className="ml-3 text-white font-medium">產生摘要</span>
            </label>
          </fieldset>
        </div>
        <footer className="p-4 border-t border-gray-700 flex justify-end space-x-3">
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            取消
          </button>
          <button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            確認
          </button>
        </footer>
      </div>
    </div>
  );
};
