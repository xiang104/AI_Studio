
// FIX: Create the main application component.
import React, { useState, useCallback } from 'react';
import { Recorder } from './components/Recorder';
import { FileUploader } from './components/FileUploader';
import { ProcessingModal } from './components/ProcessingModal';
import { InputMode, ProcessingOptions } from './types';
import { ProcessingOptionsModal } from './components/ProcessingOptionsModal';

function App() {
  const [audioSource, setAudioSource] = useState<File | null>(null);
  
  // State for the new options modal
  const [blobForOptions, setBlobForOptions] = useState<Blob | null>(null);
  // State for the final processing modal
  const [blobToProcess, setBlobToProcess] = useState<Blob | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions | null>(null);

  const [activeTab, setActiveTab] = useState<InputMode>('record');
  const [isRecording, setIsRecording] = useState(false);
  
  const [recorderKey, setRecorderKey] = useState(Date.now());
  const [uploaderKey, setUploaderKey] = useState(Date.now());

  // This function now triggers the options modal
  const handleProcessRequest = useCallback((blob: Blob) => {
    setBlobForOptions(blob);
  }, []);

  const handleSubmitFile = () => {
    if (audioSource) {
      handleProcessRequest(audioSource);
    }
  };
  
  // This function is called when options are confirmed
  const handleConfirmProcessing = (blob: Blob, options: ProcessingOptions) => {
      setProcessingOptions(options);
      setBlobToProcess(blob);
      setBlobForOptions(null); // Close options modal
  };

  const handleCloseProcessingModal = () => {
    setBlobToProcess(null);
    setProcessingOptions(null);
  };

  const handleResetForTabs = () => {
    setAudioSource(null);
    setBlobToProcess(null);
    setBlobForOptions(null);
    setProcessingOptions(null);
    setRecorderKey(Date.now());
    setUploaderKey(Date.now());
  };

  const TabButton: React.FC<{ tab: InputMode; label: string }> = ({ tab, label }) => {
    const isDisabled = isRecording && activeTab !== tab;
    return (
      <button
        onClick={() => {
          if (activeTab !== tab) {
            handleResetForTabs();
            setActiveTab(tab);
          }
        }}
        disabled={isDisabled}
        className={`w-1/2 py-3 text-sm font-medium rounded-t-lg transition-colors focus:outline-none
          ${activeTab === tab 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isDisabled ? "錄音進行中，無法切換分頁" : ""}
      >
        {label}
      </button>
    );
  };

  const isProcessing = !!blobForOptions || !!blobToProcess;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <main className="container mx-auto px-4 py-8 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
            AI 會議助理
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            錄製或上傳您的會議音檔，讓人們強大的 AI 為您產生逐字稿與摘要。
          </p>
        </header>
        
        <div className="max-w-xl mx-auto">
            <div className="flex">
                <TabButton tab="record" label="錄製音檔" />
                <TabButton tab="upload" label="上傳檔案" />
            </div>
            
            <div className="bg-gray-800 p-6 rounded-b-2xl shadow-2xl">
                  {activeTab === 'record' && (
                    <Recorder key={recorderKey} onProcessRequest={handleProcessRequest} onStatusChange={setIsRecording} />
                  )}
                  {activeTab === 'upload' && (
                    <FileUploader key={uploaderKey} onFileSelect={setAudioSource} isProcessing={isProcessing} />
                  )}
            </div>

            {activeTab === 'upload' && audioSource && (
              <div className="mt-8 text-center">
                  <button
                      onClick={handleSubmitFile}
                      disabled={isProcessing}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg text-lg"
                  >
                      處理音檔
                  </button>
              </div>
            )}
        </div>
      </main>

      <ProcessingOptionsModal
        audioBlob={blobForOptions}
        onClose={() => setBlobForOptions(null)}
        onConfirm={handleConfirmProcessing}
      />

      <ProcessingModal 
        audioBlob={blobToProcess}
        options={processingOptions}
        onClose={handleCloseProcessingModal} 
      />

      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
}

export default App;
