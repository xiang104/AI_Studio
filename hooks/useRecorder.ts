import { useState, useRef, useCallback } from 'react';
import { RecordingStatus, SplitFile } from '../types';

export const useRecorder = () => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [recordedChunks, setRecordedChunks] = useState<SplitFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentTimerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('');
  const segmentDurationRef = useRef<number>(0);

  // For volume visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const cleanupAudioContext = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error("Error closing AudioContext", e));
    }
    audioContextRef.current = null;
    setVolume(0);
  }, []);

  const startNewSegment = useCallback((stream: MediaStream, mimeType: string) => {
    // Use a local array for each recorder instance's chunks to avoid race conditions.
    const recorderChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recorderChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
      // This handler now operates on its own closed-over `recorderChunks`.
      const blob = new Blob(recorderChunks, { type: mimeType });
      if (blob.size > 0) {
        const fileExtension = mimeType.split('/')[1].split(';')[0];
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const baseName = `${year}${month}${day}${hours}${minutes}`;
        
        setRecordedChunks(prev => {
            let finalName = `${baseName}.${fileExtension}`;
            let counter = 1;
            // Handle potential file name collisions for manual splits within the same minute
            while (prev.some(chunk => chunk.name === finalName)) {
                counter++;
                finalName = `${baseName}_${counter}.${fileExtension}`;
            }

            const newChunk: SplitFile = {
              name: finalName,
              blob: blob,
            };
            return [...prev, newChunk];
        });
      }
    };
    
    mediaRecorder.start();
  }, []);

  const createNewSegment = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
        startNewSegment(streamRef.current, mimeTypeRef.current);
    }
  }, [startNewSegment]);

  const startRecording = useCallback(async (mimeType: string, segmentDurationMinutes: number) => {
    setError(null);
    if (status === 'recording') return;

    mimeTypeRef.current = mimeType;
    segmentDurationRef.current = segmentDurationMinutes;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Volume visualizer setup
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0.0;
        for (const amplitude of dataArray) {
            const normalized = (amplitude / 128.0) - 1.0;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        setVolume(rms);

        animationFrameIdRef.current = requestAnimationFrame(draw);
      };
      draw();
      
      startNewSegment(stream, mimeType);
      setStatus('recording');

      if (segmentDurationMinutes > 0) {
          segmentTimerRef.current = window.setInterval(createNewSegment, segmentDurationMinutes * 60 * 1000);
      }
    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setError("麥克風權限被拒絕。請在瀏覽器設定中允許使用麥克風。");
          } else {
              setError(`無法開始錄音: ${err.message}`);
          }
      } else {
          setError("發生未知錯誤，無法開始錄音。");
      }
    }
  }, [status, startNewSegment, createNewSegment]);

  const stopRecording = useCallback(() => {
    if (status !== 'recording' || !mediaRecorderRef.current) return;

    cleanupAudioContext();

    if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current);
        segmentTimerRef.current = null;
    }

    if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    setStatus('stopped');
  }, [status, cleanupAudioContext]);

  const splitSegment = useCallback(() => {
      if (status !== 'recording') return;
      
      createNewSegment();

      // Reset the auto-split timer to start counting from this point.
      if (segmentTimerRef.current) {
          clearInterval(segmentTimerRef.current);
      }
      if (segmentDurationRef.current > 0) {
          segmentTimerRef.current = window.setInterval(createNewSegment, segmentDurationRef.current * 60 * 1000);
      }
  }, [status, createNewSegment]);

  const deleteSegment = useCallback((indexToDelete: number) => {
      setRecordedChunks(prev => prev.filter((_, index) => index !== indexToDelete));
  }, []);

  const resetRecording = useCallback(() => {
    if (status === 'recording') {
        stopRecording();
    } else {
        cleanupAudioContext();
    }
    setStatus('idle');
    setRecordedChunks([]);
    mediaRecorderRef.current = null;
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current);
        segmentTimerRef.current = null;
    }
    setError(null);
  }, [status, stopRecording, cleanupAudioContext]);

  return { status, recordedChunks, error, volume, startRecording, stopRecording, resetRecording, deleteSegment, splitSegment };
};