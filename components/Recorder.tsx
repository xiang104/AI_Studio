import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { SplitFile } from '../types';
import VolumeVisualizer from './VolumeVisualizer';

interface RecorderProps {
  onProcessRequest: (blob: Blob) => void;
  onStatusChange?: (isRecording: boolean) => void;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

interface RecordedSegmentProps {
    file: SplitFile;
    onProcess: () => void;
    onDelete: () => void;
    onDownload: (file: SplitFile) => void;
    isRecording: boolean;
    autoDownload: boolean;
    downloadCountdown: number;
    downloadCount: number;
}

const RecordedSegment: React.FC<RecordedSegmentProps> = ({ file, onProcess, onDelete, onDownload, isRecording, autoDownload, downloadCountdown, downloadCount }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const executeDownloadAndStopTimer = useCallback(() => {
        onDownload(file);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setTimeLeft(null);
    }, [file, onDownload]);

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        
        if (!autoDownload) {
            setTimeLeft(null);
            return;
        }
        
        if (downloadCountdown <= 0) {
            executeDownloadAndStopTimer();
            return;
        }

        setTimeLeft(downloadCountdown);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev !== null && prev > 1) {
                    return prev - 1;
                }
                executeDownloadAndStopTimer();
                return null;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [autoDownload, downloadCountdown, executeDownloadAndStopTimer]);

    const handleManualDownload = () => {
        executeDownloadAndStopTimer();
    };

    const getDownloadButtonText = () => {
        if (timeLeft !== null) {
            return `下載 (${timeLeft}s)`;
        }
        if (downloadCount > 0) {
            return `下載 (${downloadCount})`;
        }
        return '下載';
    };
    
    return (
        <div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
            <span className="text-sm text-gray-200 truncate pr-2">{file.name}</span>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <button onClick={onProcess} disabled={isRecording} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">處理</button>
                <button 
                    onClick={handleManualDownload} 
                    disabled={isRecording} 
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-24 text-center">
                    {getDownloadButtonText()}
                </button>
                <button onClick={onDelete} disabled={isRecording} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-xs font-medium transition-colors disabled:opacity-50">刪除</button>
            </div>
        </div>
    )
};


export const Recorder: React.FC<RecorderProps> = ({ onProcessRequest, onStatusChange }) => {
  const { status, recordedChunks, error, volume, startRecording, stopRecording, resetRecording, deleteSegment, splitSegment } = useRecorder();
  const [duration, setDuration] = useState(0);
  const [audioFormat, setAudioFormat] = useState('audio/webm;codecs=opus');
  const [autoSplit, setAutoSplit] = useState(true);
  const [splitDuration, setSplitDuration] = useState(20);
  const [autoDownload, setAutoDownload] = useState(true);
  const [downloadCountdown, setDownloadCountdown] = useState(30);
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const timerRef = useRef<number | null>(null);
  
  const isRecording = status === 'recording';
  
  const handleDownload = useCallback((file: SplitFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setDownloadCounts(prev => ({
        ...prev,
        [file.name]: (prev[file.name] || 0) + 1,
    }));
  }, []);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isRecording);
    }
  }, [isRecording, onStatusChange]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setDuration(0);
      startRecording(audioFormat, autoSplit ? splitDuration : 0);
    }
  };
  
  const handleReset = () => {
      resetRecording();
      setDuration(0);
      setDownloadCounts({});
  };
  
  useEffect(() => {
      if (status === 'stopped' && recordedChunks.length === 0) {
          handleReset();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, recordedChunks]);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-800 rounded-2xl shadow-lg flex flex-col items-center space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white">錄製新音檔</h3>
        <p className="text-gray-400 mt-1">
            {isRecording ? '錄音進行中...' : (recordedChunks.length > 0 ? '錄音已結束' : '點擊下方按鈕開始錄音')}
        </p>
      </div>

      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg w-full text-center text-sm">{error}</div>}
      
        <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-full">
                <div className="w-20" aria-hidden="true" />
                <div className="relative flex-shrink-0 flex items-center justify-center w-48 h-48">
                    <div className={`absolute inset-0 rounded-full ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-indigo-500/10'}`}></div>
                    <button
                    onClick={handleToggleRecording}
                    className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-800
                        ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                    >
                    <div className="text-center text-white">
                        <span className="block text-4xl font-bold">{formatTime(duration)}</span>
                        <span className="block text-sm uppercase tracking-wider">{isRecording ? '停止錄音' : '開始錄音'}</span>
                    </div>
                    </button>
                </div>
                <div className="w-20 flex items-center justify-start pl-2">
                    {isRecording && <VolumeVisualizer volume={volume} />}
                </div>
            </div>
            {isRecording && (
                <button
                    onClick={splitSegment}
                    className="px-5 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-full text-sm font-medium transition-colors flex items-center shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    aria-label="新增分段"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0l9-4.5 9 4.5M3 17V4a2 2 0 012-2h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    新增分段
                </button>
            )}
        </div>

        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <label htmlFor="audio-format" className="text-sm font-medium text-gray-300">音檔格式:</label>
                <select
                    id="audio-format"
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    disabled={isRecording}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-1/2 p-2 disabled:opacity-50"
                >
                    <option value="audio/webm;codecs=opus">WebM (Opus)</option>
                    <option value="audio/ogg;codecs=opus">OGG (Opus)</option>
                    <option value="audio/mp4">MP4</option>
                </select>
            </div>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                    <input
                        type="checkbox"
                        checked={autoSplit}
                        onChange={(e) => setAutoSplit(e.target.checked)}
                        disabled={isRecording}
                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 mr-2"
                    />
                    自動分段錄音
                </label>
                {autoSplit && (
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            value={splitDuration}
                            onChange={(e) => setSplitDuration(Math.max(1, Number(e.target.value)))}
                            min="1"
                            disabled={isRecording || !autoSplit}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg w-20 p-1.5 text-center disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-400">分鐘</span>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                    <input
                        type="checkbox"
                        checked={autoDownload}
                        onChange={(e) => setAutoDownload(e.target.checked)}
                        disabled={isRecording}
                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 mr-2"
                    />
                    自動下載錄音檔
                </label>
                {autoDownload && (
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            value={downloadCountdown}
                            onChange={(e) => setDownloadCountdown(Math.max(0, Number(e.target.value)))}
                            min="0"
                            disabled={isRecording || !autoDownload}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg w-20 p-1.5 text-center disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-400">秒後</span>
                    </div>
                )}
            </div>
        </div>

        {recordedChunks.length > 0 && (
            <div className="w-full space-y-4 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-white text-center">錄音片段</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 bg-gray-900/50 rounded-lg p-3">
                    {recordedChunks.map((file) => (
                        <RecordedSegment
                            key={file.name}
                            file={file}
                            onProcess={() => onProcessRequest(file.blob)}
                            onDelete={() => deleteSegment(recordedChunks.indexOf(file))}
                            onDownload={handleDownload}
                            isRecording={isRecording}
                            autoDownload={autoDownload}
                            downloadCountdown={downloadCountdown}
                            downloadCount={downloadCounts[file.name] || 0}
                        />
                    ))}
                </div>
                {!isRecording && (
                    <div className="flex items-center justify-center space-x-4 pt-2">
                        <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-medium transition-colors">重新錄製</button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};