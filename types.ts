
// FIX: Define and export types used throughout the application.
export type RecordingStatus = 'idle' | 'recording' | 'stopped';

export type InputMode = 'record' | 'upload';

export interface TranscriptEntry {
  timestamp: string;
  text: string;
}

export interface SummaryResult {
  transcript: TranscriptEntry[];
  summary: string;
}

export interface ProcessingOptions {
  generateSummary: boolean;
  generateTranscript: boolean;
}

// FIX: Add SplitFile type for the audio splitter component.
export interface SplitFile {
  name: string;
  blob: Blob;
}
