import React, { useState, useRef, useCallback } from 'react';
import { SplitFile } from '../types';
import Spinner from './Spinner';

// FIX: Define the type for the global FFMPEG object provided by the script tag.
declare global {
    interface Window {
        FFMPEG: {
            createFFmpeg: (options: any) => any;
            fetchFile: (data: File | Blob) => Promise<Uint8Array>;
        };
    }
}

// Icon component for UI consistency with FileUploader
const UploadIcon = () => (
    <svg className="w-10 h-10 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
    </svg>
);

/**
 * A component for splitting large audio files into smaller chunks using FFmpeg.wasm.
 */
export const AudioSplitter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [splitDuration, setSplitDuration] = useState<number>(25); // Default 25 minutes
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'done'>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [progressRatio, setProgressRatio] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [splitFiles, setSplitFiles] = useState<SplitFile[]>([]);
    const ffmpegRef = useRef<any>(null);

    const loadFFmpeg = async () => {
        if (ffmpegRef.current) return ffmpegRef.current;
        
        setStatus('loading');
        setProgressMessage('正在準備處理引擎...');

        // Wait for the FFMPEG global to be available due to script loading order
        await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const checkFFmpeg = () => {
                if (window.FFMPEG) {
                    resolve();
                } else if (attempts < 50) { // Try for 5 seconds
                    attempts++;
                    setTimeout(checkFFmpeg, 100);
                } else {
                    reject(new Error("FFMPEG script failed to load in time."));
                }
            };
            checkFFmpeg();
        });

        const { createFFmpeg } = window.FFMPEG;

        setProgressMessage('正在載入核心程式...');
        try {
            const ffmpeg = createFFmpeg({
                log: true,
                progress: ({ ratio }) => {
                    if (ratio >= 0 && ratio <= 1 && status === 'processing') {
                         setProgressRatio(Math.round(ratio * 100));
                    }
                },
            });
            await ffmpeg.load();
            ffmpegRef.current = ffmpeg;
            return ffmpeg;
        } catch (e) {
            console.error("FFmpeg load error:", e);
            setError("無法載入音訊處理引擎。請重新整理頁面再試一次。");
            setStatus('idle');
            throw e;
        }
    };

    const handleFileSelect = (selectedFile: File | null) => {
        setFile(selectedFile);
        setSplitFiles([]);
        setError(null);
        setStatus('idle');
    };

    const handleSplit = async () => {
        if (!file) {
            setError('請先選擇一個音訊檔案。');
            return;
        }
        if (splitDuration <= 0) {
            setError('分割時長必須大於 0。');
            return;
        }

        setError(null);
        setSplitFiles([]);
        
        try {
            const ffmpeg = await loadFFmpeg();
            const { fetchFile } = window.FFMPEG;
            
            setStatus('processing');
            setProgressMessage('正在準備檔案...');
            setProgressRatio(0);
            
            const originalExtension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
            const inputFileName = `input.${originalExtension}`;
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            const outputPattern = `${baseName}_%03d.${originalExtension}`;
            
            ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));

            setProgressMessage('正在分割音訊，請稍候...');
            await ffmpeg.run(
                '-i', inputFileName,
                '-f', 'segment',
                '-segment_time', (splitDuration * 60).toString(),
                '-c', 'copy',
                outputPattern
            );
            setProgressMessage('分割完成，正在讀取檔案...');

            const resultFiles = ffmpeg.FS('readdir', '/').filter(
                (f: string) => f.startsWith(baseName)
            );
            
            if (resultFiles.length === 0) {
                 setError("分割失敗，未產生任何檔案。可能是音檔長度不足或格式不支援快速分割。");
            } else {
                const blobs: SplitFile[] = [];
                for (const fileName of resultFiles) {
                    const data = ffmpeg.FS('readFile', fileName);
                    const blob = new Blob([data.buffer], { type: file.type });
                    blobs.push({ name: fileName, blob });
                }
                // Sort files numerically
                blobs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                setSplitFiles(blobs);
            }
            // Cleanup virtual filesystem
            ffmpeg.FS('unlink', inputFileName);
            resultFiles.forEach((f: string) => ffmpeg.FS('unlink', f));
            setStatus('done');
        } catch (err) {
            console.error(err);
            setError('處理過程中發生錯誤。音檔可能已損壞或格式不相容。');
            setStatus('idle');
        }
    };
    
    const handleDownload = (splitFile: SplitFile) => {
        const url = URL.createObjectURL(splitFile.blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = splitFile.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleReset = () => {
        setFile(null);
        setSplitFiles([]);
        setError(null);
        setStatus('idle');
    };
    
    const isBusy = status === 'loading' || status === 'processing';
    
    // Using a simplified file uploader UI here for self-containment
    const [isDragOver, setIsDragOver] = useState(false);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };
    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            if (e.dataTransfer.files[0].type.startsWith('audio/')) {
                handleFileSelect(e.dataTransfer.files[0]);
            } else {
                alert('請上傳音訊檔案。');
            }
        }
    }, []);
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };

    return (
        <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white">分割音訊檔案</h3>
                <p className="text-gray-400 mt-1">將長音檔分割為較小的片段</p>
            </div>
            
            {!file ? (
                <label
                    htmlFor="splitter-dropzone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-700 transition-colors
                    ${isDragOver ? 'bg-gray-700 border-indigo-500' : ''}
                    ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                        <p className="text-xs text-gray-500">建議使用 MP3, WAV, OGG 等格式</p>
                    </div>
                    <input id="splitter-dropzone" type="file" className="hidden" onChange={handleFileChange} accept="audio/*" disabled={isBusy}/>
                </label>
            ) : (
                <div className="w-full p-3 bg-gray-700 rounded-lg flex justify-between items-center">
                    <p className="text-sm text-gray-200 truncate pr-2">{file.name}</p>
                    <button onClick={handleReset} disabled={isBusy} className="text-gray-400 hover:text-white transition-colors text-xs font-bold">清除</button>
                </div>
            )}
            
            {file && (
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="split-duration" className="text-sm font-medium text-gray-300">每段時長 (分鐘):</label>
                      <input
                        type="number"
                        id="split-duration"
                        value={splitDuration}
                        onChange={(e) => setSplitDuration(Number(e.target.value))}
                        min="1"
                        disabled={isBusy}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-1/2 p-2"
                      />
                    </div>
                    <button
                      onClick={handleSplit}
                      disabled={isBusy || !file}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {isBusy ? <Spinner size="5" /> : '開始分割'}
                    </button>
                </div>
            )}
            
            {isBusy && (
                <div className="w-full text-center space-y-2 text-sm">
                    <p className="text-indigo-300 animate-pulse">{progressMessage}</p>
                    {status === 'processing' && progressRatio > 0 && (
                         <div className="w-full bg-gray-600 rounded-full h-2.5">
                            <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progressRatio}%` }}></div>
                        </div>
                    )}
                </div>
            )}

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg w-full text-center text-sm">{error}</div>}

            {splitFiles.length > 0 && (
                <div className="w-full space-y-3 pt-4">
                    <h4 className="text-lg font-semibold text-white">分割結果:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 bg-gray-900/50 rounded-lg p-3">
                        {splitFiles.map((sFile, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                                <span className="text-sm text-gray-200 truncate pr-2">{sFile.name}</span>
                                <button onClick={() => handleDownload(sFile)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-xs font-medium transition-colors">下載</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};