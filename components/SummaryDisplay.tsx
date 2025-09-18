
import React from 'react';
import { SummaryResult, TranscriptEntry } from '../types';

interface SummaryDisplayProps {
  result: SummaryResult;
}

const CopyIcon = ({ textToCopy }: { textToCopy: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700">
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

const DownloadIcon = () => (
    <svg className="w-4 h-4 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 19">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15h.01M4 12H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3m-5.5 0V1.5m0 0L6 4m3.5-2.5L13 4"/>
    </svg>
);

const formatTranscriptForCopy = (transcript: TranscriptEntry[]): string => {
  return transcript.map(entry => `[${entry.timestamp}] ${entry.text}`).join('\n');
};

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ result }) => {
  const { summary, transcript } = result;

  const hasSummary = summary && summary.trim() !== "" && summary.trim() !== "未選擇處理選項。";
  const hasTranscript = transcript && transcript.length > 0;

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const getFormattedTranscript = (format: 'md' | 'html'): string => {
    if (!hasTranscript) return '';
    if (format === 'md') {
      return transcript.map(entry => `**[${entry.timestamp}]** ${entry.text}`).join('\n\n');
    }
    // format === 'html'
    return transcript.map(entry => `<p><strong>[${entry.timestamp}]</strong> ${entry.text.replace(/\n/g, '<br>')}</p>`).join('');
  };

  const generateHtmlContent = () => {
    const summaryHtml = hasSummary ? summary
      .replace(/^(#+)\s*(.*)/gm, (_, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/-\s(.*?)(?=\n-|\n\n|$)/g, '<li>$1</li>')
      .replace(/\n/g, '<br />') : '';

    return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>會議報告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: auto; color: #333; }
        h1, h2, h3, h4 { color: #111; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        strong { font-weight: 600; }
        div { margin-bottom: 2rem; }
        p { margin: 0; }
        li { margin-bottom: 0.5rem; }
        #summary, #transcript { background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; }
    </style>
</head>
<body>
    <h1>會議報告</h1>
    ${hasSummary ? `<div id="summary"><h2>會議摘要</h2><div>${summaryHtml}</div></div>` : ''}
    ${hasTranscript ? `<div id="transcript"><h2>逐字稿</h2>${getFormattedTranscript('html')}</div>` : ''}
</body>
</html>`;
  };

  const handleDownloadMD = () => {
    const summaryContent = hasSummary ? `## 會議摘要\n\n${summary}\n\n` : '';
    const transcriptContent = hasTranscript ? `## 逐字稿\n\n${getFormattedTranscript('md')}` : '';
    const content = `# 會議報告\n\n${summaryContent}${transcriptContent}`;
    downloadFile('會議報告.md', content, 'text/markdown;charset=utf-8');
  };
  
  const handleDownloadHTML = () => {
    const content = generateHtmlContent();
    downloadFile('會議報告.html', content, 'text/html;charset=utf-8');
  };
  
  const handleDownloadPDF = () => {
    const content = generateHtmlContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        // Delay print command to ensure styles are loaded
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
       {(hasSummary || hasTranscript) && (
         <div className="bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">下載報告</h2>
            <div className="flex flex-wrap gap-4">
              <button onClick={handleDownloadMD} className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-medium transition-colors">
                <DownloadIcon />
                Markdown (.md)
              </button>
              <button onClick={handleDownloadHTML} className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-medium transition-colors">
                <DownloadIcon />
                HTML (.html)
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-medium transition-colors">
                <DownloadIcon />
                另存為 PDF
              </button>
            </div>
          </div>
       )}

      {hasSummary && (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 relative">
          <CopyIcon textToCopy={summary} />
          <h2 className="text-2xl font-bold text-indigo-400 mb-4">會議摘要</h2>
          <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }}>
          </div>
        </div>
      )}
      
      {hasTranscript && (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 relative">
          <CopyIcon textToCopy={formatTranscriptForCopy(transcript)} />
          <h2 className="text-2xl font-bold text-indigo-400 mb-4">逐字稿</h2>
          <div className="max-h-96 overflow-y-auto bg-gray-900/50 rounded-lg p-4 text-gray-300 text-sm leading-relaxed space-y-3">
              {transcript.map((entry, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <span className="font-mono text-xs text-indigo-400 w-20 flex-shrink-0 pt-1">[{entry.timestamp}]</span>
                  <p className="flex-grow">{entry.text}</p>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {!hasSummary && !hasTranscript && (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 text-center text-gray-400">
          <p>{summary || '未產生任何結果。'}</p>
        </div>
      )}
    </div>
  );
};
