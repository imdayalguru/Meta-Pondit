import React, { useState, useCallback, useMemo, ChangeEvent } from 'react';
import { ImageFile, MetadataResult, TargetExtension, TARGET_EXTENSION_OPTIONS } from './types';
import { ADOBE_CATEGORY_MAP, TITLE_TRUNC, KEYWORDS_TRUNC } from './constants';
import { generateImageMetadata } from './services/geminiService';
import { processGeminiResponse } from './utils/metadataProcessor';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const Header: React.FC = () => (
  <header className="text-center p-6 bg-bg-secondary rounded-lg shadow-lg">
    <h1 className="text-4xl md:text-5xl font-bold text-accent">🤖 Metapondit AI</h1>
    <p className="mt-2 text-text-secondary">Adobe Stock Metadata Generator • AI-Powered • Real-time Table Updates</p>
  </header>
);

interface StatCardProps { title: string; value: number | string; color: string; icon: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, color, icon }) => (
  <div className="bg-bg-tertiary p-4 rounded-lg shadow-md flex items-center space-x-4 border-l-4" style={{ borderColor: color }}>
    <div className="text-3xl" style={{ color }}>{icon}</div>
    <div>
      <p className="text-text-secondary text-sm">{title}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  </div>
);

interface DetailModalProps {
    file: ImageFile | null;
    onClose: () => void;
}
const DetailModal: React.FC<DetailModalProps> = ({ file, onClose }) => {
    if (!file) return null;
    const { result, error, status } = file;

    const getStatusColor = () => {
        if (status === 'completed') return 'text-success';
        if (status === 'error') return 'text-error';
        return 'text-warning';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 sticky top-0 bg-bg-secondary border-b border-border">
                    <h2 className="text-xl font-bold text-accent truncate">{file.file.name}</h2>
                    <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="font-bold text-text-secondary">Status</p>
                        <p className={`capitalize ${getStatusColor()}`}>{status}</p>
                    </div>
                    {status === 'error' && error && (
                         <div>
                            <p className="font-bold text-error">Error Message</p>
                            <p className="text-red-300 bg-red-900/50 p-3 rounded">{error}</p>
                        </div>
                    )}
                    {result && (
                        <>
                            <div>
                                <p className="font-bold text-text-secondary">Title</p>
                                <p>{result.title}</p>
                            </div>
                            <div>
                                <p className="font-bold text-text-secondary">Keywords</p>
                                <p className="text-sm leading-relaxed">{result.keywords}</p>
                            </div>
                            <div>
                                <p className="font-bold text-text-secondary">Category</p>
                                <p>{result.categoryCode} - {result.categoryName}</p>
                            </div>
                             <div>
                                <p className="font-bold text-text-secondary">Description</p>
                                <p className="text-sm">{result.description}</p>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 bg-bg-tertiary text-right rounded-b-lg">
                    <button onClick={onClose} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded">Close</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [files, setFiles] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('Ready • Waiting for images');
    const [currentFileMessage, setCurrentFileMessage] = useState<string>('Ready to process');
    const [progress, setProgress] = useState<number>(0);
    const [targetExtension, setTargetExtension] = useState<TargetExtension>("Original (no change)");
    const [selectedFile, setSelectedFile] = useState<ImageFile | null>(null);

    const stats = useMemo(() => ({
        loaded: files.length,
        processing: files.filter(f => f.status === 'processing').length,
        completed: files.filter(f => f.status === 'completed').length,
    }), [files]);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;

        const newImageFiles: ImageFile[] = [];
        const existingFilenames = new Set(files.map(f => f.file.name));

        // FIX: Directly iterate over `selectedFiles` (a `FileList`) which is iterable and correctly types `file` as `File`,
        // resolving an issue where `Array.from` was leading to `file` being typed as `unknown`.
        for (const file of selectedFiles) {
             if (existingFilenames.has(file.name)) continue;
            try {
                const base64 = await fileToBase64(file);
                newImageFiles.push({
                    id: `${file.name}-${Date.now()}`,
                    file,
                    base64,
                    status: 'waiting',
                });
            } catch (error) {
                console.error("Error reading file:", file.name, error);
            }
        }
        
        setFiles(prev => [...prev, ...newImageFiles]);
        setStatusMessage(`✅ Added ${newImageFiles.length} new image(s)`);
    };

    const handleGenerate = useCallback(async () => {
        if (!files.some(f => f.status === 'waiting')) {
            alert("All files have been processed or are processing. Clear or add new files.");
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        let completedCount = 0;
        const filesToProcess = files.filter(f => f.status === 'waiting');
        const totalToProcess = filesToProcess.length;

        for (let i = 0; i < files.length; i++) {
            if (files[i].status !== 'waiting') continue;

            const fileIndex = files.findIndex(f => f.id === files[i].id);

            const updateFileState = (id: string, updates: Partial<ImageFile>) => {
                 setFiles(currentFiles =>
                    currentFiles.map(f => (f.id === id ? { ...f, ...updates } : f))
                );
            }
            
            updateFileState(files[i].id, { status: 'processing' });
            setCurrentFileMessage(`🔄 Processing: ${files[i].file.name}`);
            setStatusMessage(`Processing ${completedCount + 1}/${totalToProcess}: ${files[i].file.name}`);

            try {
                const rawText = await generateImageMetadata(files[i].base64, files[i].file.type);
                const result = processGeminiResponse(rawText, files[i].file.name);
                updateFileState(files[i].id, { status: 'completed', result });
                completedCount++;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
                updateFileState(files[i].id, { status: 'error', error: errorMessage });
            }
            setProgress(Math.round(((completedCount) / totalToProcess) * 100));
        }

        setIsProcessing(false);
        setCurrentFileMessage(`✅ Complete! ${completedCount}/${totalToProcess} processed`);
        setStatusMessage(`✅ Done! ${completedCount} images processed successfully`);
    }, [files]);
    
    const handleClear = () => {
        if (isProcessing) return;
        setFiles([]);
        setProgress(0);
        setStatusMessage('Cleared all data • Ready');
        setCurrentFileMessage('Ready to process');
    };

    const handleExport = () => {
        const completedFiles = files.filter(f => f.status === 'completed' && f.result);
        if (completedFiles.length === 0) {
            alert("No completed metadata to export.");
            return;
        }

        const applyTargetExtension = (originalName: string, targetExt: TargetExtension): string => {
            if (targetExt === "Original (no change)") return originalName;
            const p = originalName.lastIndexOf('.');
            const baseName = p > -1 ? originalName.substring(0, p) : originalName;
            return `${baseName}${targetExt}`;
        }
        
        const headers = ['Filename', 'Title', 'Keywords', 'Category'];
        const rows = completedFiles.map(f => {
            const r = f.result!;
            const filename = `"${applyTargetExtension(f.file.name, targetExtension).replace(/"/g, '""')}"`;
            const title = `"${r.title.replace(/"/g, '""')}"`;
            const keywords = `"${r.keywords.replace(/"/g, '""')}"`;
            return [filename, title, keywords, r.categoryCode].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const baseName = targetExtension === "Original (no change)" ? "original_format" : targetExtension.substring(1);
        link.setAttribute("download", `${baseName}_metadata.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isGenerateDisabled = isProcessing || files.length === 0 || !files.some(f => f.status === 'waiting');
    const isExportDisabled = isProcessing || stats.completed === 0;

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="min-h-screen bg-bg-primary font-sans p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <Header />

                <div className="bg-bg-tertiary p-4 rounded-lg shadow-lg space-y-4">
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="bg-accent hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2">
                           📄 Select Images
                        </button>
                        <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                        <button onClick={handleClear} disabled={isProcessing} className="bg-error hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2">
                            🗑️ Clear
                        </button>
                        <button onClick={handleGenerate} disabled={isGenerateDisabled} className="bg-success hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2">
                            ✨ Generate Metadata
                        </button>
                        <button onClick={handleExport} disabled={isExportDisabled} className="bg-accent hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2">
                            💾 Export CSV
                        </button>
                         <div className="flex items-center gap-2 bg-bg-secondary p-3 rounded-lg">
                            <label htmlFor="target-ext" className="text-sm font-bold text-text-secondary">Target Extension:</label>
                             <select id="target-ext" value={targetExtension} onChange={e => setTargetExtension(e.target.value as TargetExtension)} className="bg-bg-primary border border-border rounded p-2 text-sm">
                                {TARGET_EXTENSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="📸 Loaded" value={stats.loaded} color="#7C3AED" icon="📄" />
                    <StatCard title="🔄 Processing" value={isProcessing ? 1 : 0} color="#F59E0B" icon="⏳" />
                    <StatCard title="✅ Completed" value={stats.completed} color="#10B981" icon="✔️" />
                </div>
                 
                <div className="bg-bg-tertiary p-4 rounded-lg shadow-lg">
                     <div className="flex items-center gap-4 mb-2">
                        <div className="w-full bg-bg-secondary rounded-full h-4">
                           <div className="bg-accent h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="font-bold text-accent w-12 text-right">{progress}%</span>
                     </div>
                     <p className="text-center text-text-secondary text-sm">{currentFileMessage}</p>
                </div>
                
                <div className="bg-bg-secondary rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="text-lg font-bold">📊 Live Metadata Table</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-bg-tertiary text-xs text-text-secondary uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Filename</th>
                                    <th scope="col" className="px-6 py-3">Title</th>
                                    <th scope="col" className="px-6 py-3">Keywords</th>
                                    <th scope="col" className="px-6 py-3 text-center">Category</th>
                                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file, index) => {
                                    const statusColors: Record<string, string> = {
                                        waiting: 'text-gray-400',
                                        processing: 'text-warning animate-pulse',
                                        completed: 'text-success',
                                        error: 'text-error',
                                    };
                                    const bgClass = index % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-tertiary/50';
                                    const truncatedTitle = file.result?.title ? (file.result.title.length > TITLE_TRUNC ? file.result.title.substring(0, TITLE_TRUNC) + '...' : file.result.title) : '...';
                                    const truncatedKeywords = file.result?.keywords ? (file.result.keywords.length > KEYWORDS_TRUNC ? file.result.keywords.substring(0, KEYWORDS_TRUNC) + '...' : file.result.keywords) : '...';
                                    
                                    return (
                                        <tr key={file.id} className={`${bgClass} border-b border-border hover:bg-accent/20 cursor-pointer`} onClick={() => setSelectedFile(file)}>
                                            <td className="px-6 py-4 font-medium truncate" title={file.file.name}>{file.file.name}</td>
                                            <td className="px-6 py-4">{file.status === 'completed' ? truncatedTitle : '...'}</td>
                                            <td className="px-6 py-4">{file.status === 'completed' ? truncatedKeywords : '...'}</td>
                                            <td className="px-6 py-4 text-center" title={file.result ? `${file.result.categoryCode} - ${file.result.categoryName}` : ''}>
                                                {file.result?.categoryCode ?? '...'}
                                            </td>
                                            <td className={`px-6 py-4 text-center font-bold ${statusColors[file.status]}`}>
                                                {file.status.toUpperCase()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {files.length === 0 && (
                                     <tr>
                                        <td colSpan={5} className="text-center py-10 text-text-secondary">
                                            Select images to begin
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="text-center text-xs text-text-secondary py-4">
                    Metapondit AI | Re-engineered for the web
                </footer>
            </div>
            <DetailModal file={selectedFile} onClose={() => setSelectedFile(null)} />
        </div>
    );
};

export default App;
