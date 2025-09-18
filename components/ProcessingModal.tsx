
import React, { useState, useEffect } from 'react';
import { generateSummaryFromAudio } from '../services/geminiService';
import { SummaryResult, ProcessingOptions } from '../types';
import Spinner from './Spinner';
import { SummaryDisplay } from './SummaryDisplay';

interface ProcessingModalProps {
  audioBlob: Blob | null;
  options: ProcessingOptions | null;
  onClose: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ audioBlob, options, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (audioBlob && options) {
      // Reset state for new processing request
      setIsProcessing(true);
      setResult(null);
      setError(null);

      const processAudio = async () => {
        try {
          const summaryResult = await generateSummaryFromAudio(audioBlob, options);
          setResult(summaryResult);
        } catch (err) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("發生未知錯誤，請再試一次。");
          }
        } finally {
          setIsProcessing(false);
        }
      };

      processAudio();
    }
  }, [audioBlob, options]);

  if (!audioBlob) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">處理結果</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <div className="overflow-y-auto p-6 space-y-6">
          {isProcessing && (
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <Spinner size="12" color="border-indigo-400" />
              <p className="text-indigo-300 animate-pulse">AI 處理中，請稍候...</p>
              <p className="text-sm text-gray-500">這可能需要幾分鐘的時間，具體取決於音檔長度。</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
              <p className="font-bold">發生錯誤</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && <SummaryDisplay result={result} />}
        </div>
        
        <footer className="p-4 border-t border-gray-700 flex-shrink-0 text-right">
             <button
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                完成
            </button>
        </footer>
      </div>
    </div>
  );
};
