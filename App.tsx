import React, { useState, useCallback, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { ImageFile, TargetExtension, TARGET_EXTENSION_OPTIONS, MetadataResult, ProcessingStatus, GenerationSettings, WritingTone, Marketplace, PromptPlatform } from './types';
import { generateImageMetadata, generateImagePrompt } from './services/geminiService';
import { processGeminiResponse } from './utils/metadataProcessor';
import { processImagePromptResponse } from './utils/promptProcessor';
import { BATCH_SIZE } from './constants';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

interface StatCardProps { title: string; value: number | string; color: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
    <div className="flex items-center space-x-2 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
        <span className="font-bold text-white">{value}</span>
        <span className="text-text-secondary">{title}</span>
    </div>
);

interface DetailModalProps {
    file: ImageFile | null;
    onClose: () => void;
    onSave: (fileId: string, newResult: MetadataResult) => void;
    onRetry: (fileId: string) => void;
    onDelete: (fileId: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ file, onClose, onSave, onRetry, onDelete }) => {
    const [editedResult, setEditedResult] = useState<MetadataResult | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        setEditedResult(file?.result ?? null);
    }, [file]);

    if (!file) return null;

    const handleFieldChange = (field: keyof Omit<MetadataResult, 'categoryCode' | 'categoryName'>, value: string) => {
        if (editedResult) {
            let updatedResult: MetadataResult;
            if (field === 'keywords') {
                const newKeywords: string[] = value
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean);
                updatedResult = { ...editedResult, keywords: newKeywords };
            } else {
                 updatedResult = { ...editedResult, [field]: value };
            }
            setEditedResult(updatedResult);
        }
    };
    
    const handleSaveChanges = () => {
        if (file && editedResult && file.status === 'completed') {
            onSave(file.id, editedResult);
        }
    };
    
    const handleCloseAndSave = () => {
        handleSaveChanges();
        onClose();
    };

    const handleRegenerate = () => {
        if (file) {
            onRetry(file.id);
            onClose(); // Close modal while it retries in the background
        }
    };

    const handleDelete = () => {
        if (file) {
            if (confirm(`Are you sure you want to delete ${file.file.name}? This cannot be undone.`)) {
                onDelete(file.id);
                onClose();
            }
        }
    };

    const handleCopy = (text: string, field: 'title' | 'description' | 'keywords') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };
    
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const { error, status } = file;
    const isEditable = status === 'completed' && editedResult;

    const renderField = (
        Icon: React.FC<React.SVGProps<SVGSVGElement>>, 
        label: string, 
        value: string, 
        placeholder: string,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
        rows = 3
    ) => (
        <div>
            <label className="flex items-center text-sm font-bold text-text-secondary mb-1 gap-2">
                <Icon className="w-4 h-4" />
                {label}
            </label>
            <textarea 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder}
                rows={rows} 
                className="w-full bg-bg-primary border border-border rounded p-3 text-sm sm:text-base resize-y focus:ring-accent focus:border-accent" 
            />
        </div>
    );
    
    const TitleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-6.5h13v6.5a.75.75 0 001.5 0V2.75a.75.75 0 00-1.5 0v6.5h-13V2.75z" /></svg>;
    const DescIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
    const KeywordsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
    const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M7 3.5A1.5 1.5 0 018.5 2h6.879a1.5 1.5 0 011.06.44l3.122 3.121A1.5 1.5 0 0120 6.621V16.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5v-13A1.5 1.5 0 015.5 2H6a1.5 1.5 0 011 1.5z" /><path d="M2.5 5A1.5 1.5 0 001 6.5v10A1.5 1.5 0 002.5 18h10A1.5 1.5 0 0014 16.5v-3a.75.75 0 00-1.5 0v3a.5.5 0 01-.5.5h-10a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5h3a.75.75 0 000-1.5h-3z" /></svg>;
    const RegenerateIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10.75 1.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM3.999 4.31a.75.75 0 00-1.06-1.06l-1.75 1.75a.75.75 0 101.06 1.06l1.75-1.75zM17.81 3.25a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 101.06-1.06l-1.75-1.75zM3.25 10.75a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM17.5 10.75a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM4.31 16.001a.75.75 0 001.06-1.06l-1.75-1.75a.75.75 0 10-1.06 1.06l1.75 1.75zM16.75 14.94a.75.75 0 001.06 1.06l1.75-1.75a.75.75 0 10-1.06-1.06l-1.75 1.75zM10.75 15.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" /><path d="M8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" /></svg>;
    const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={handleCloseAndSave}>
            <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-1/3 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                    <div className="relative group">
                        <img src={`data:${file.file.type};base64,${file.base64}`} alt={file.file.name} className="max-h-60 md:max-h-80 w-auto object-contain rounded-md shadow-md" />
                        <button onClick={handleDelete} className="absolute top-2 left-2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error">
                           <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-center mt-4">
                        <p className="font-bold truncate" title={file.file.name}>{file.file.name}</p>
                        <p className="text-sm text-text-secondary">{formatBytes(file.file.size)}</p>
                    </div>
                </div>

                <div className="w-full md:w-2/3 p-6 flex flex-col">
                    <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                        {status === 'error' && error && (
                             <div className="bg-red-900/50 border-l-4 border-error p-4 rounded">
                                <p className="font-bold text-error mb-2">⚠️ Error Details</p>
                                <p className="text-red-300">{error}</p>
                            </div>
                        )}
                        {isEditable ? (
                             <>
                                {renderField(TitleIcon, "Title", editedResult.title, "Title will appear here...", e => handleFieldChange('title', e.target.value), 2)}
                                {renderField(DescIcon, "Description", editedResult.description, "Description will appear here...", e => handleFieldChange('description', e.target.value), 4)}
                                {renderField(KeywordsIcon, `Keywords (${editedResult.keywords.length})`, editedResult.keywords.join(', '), "Keywords will appear here...", e => handleFieldChange('keywords', e.target.value), 4)}
                            </>
                        ) : (
                            <div className="text-sm text-text-secondary p-4 bg-bg-primary rounded-lg text-center">
                                {status === 'waiting' && <p>Waiting for processing...</p>}
                                {status === 'processing' && <p className="text-warning animate-pulse">Generating metadata...</p>}
                                {!file.result && status !== 'error' && status !== 'processing' && status !== 'waiting' && <p>No metadata available.</p>}
                                {file.result && (
                                    <div className="space-y-4 text-left">
                                        <p><strong className="text-text-primary">Title:</strong> {file.result.title}</p>
                                        <p><strong className="text-text-primary">Description:</strong> {file.result.description}</p>
                                        <p><strong className="text-text-primary">Keywords:</strong> {file.result.keywords.join(', ')}</p>
                                    </div>
                                )}
                           </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2">
                            <button onClick={() => handleCopy(editedResult?.title ?? '', 'title')} disabled={!isEditable} className="flex items-center gap-1.5 text-xs bg-bg-tertiary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary font-semibold py-1.5 px-3 rounded-md transition duration-200">
                                <CopyIcon className="w-4 h-4" />
                                {copiedField === 'title' ? 'Copied!' : 'Copy'}
                            </button>
                             <button onClick={() => handleCopy(editedResult?.description ?? '', 'description')} disabled={!isEditable} className="flex items-center gap-1.5 text-xs bg-bg-tertiary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary font-semibold py-1.5 px-3 rounded-md transition duration-200">
                                <CopyIcon className="w-4 h-4" />
                                {copiedField === 'description' ? 'Copied!' : 'Copy'}
                            </button>
                             <button onClick={() => handleCopy(editedResult?.keywords.join(', ') ?? '', 'keywords')} disabled={!isEditable} className="flex items-center gap-1.5 text-xs bg-bg-tertiary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary font-semibold py-1.5 px-3 rounded-md transition duration-200">
                                <CopyIcon className="w-4 h-4" />
                                {copiedField === 'keywords' ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <button onClick={handleRegenerate} className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded-md bg-accent hover:bg-accent-hover transition-colors w-full sm:w-auto justify-center">
                           <RegenerateIcon className="w-5 h-5"/>
                           Regenerate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SidebarProps {
    settings: GenerationSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<GenerationSettings>>;
}

const Sidebar: React.FC<SidebarProps> = ({ settings, onSettingsChange }) => {
    const updateSetting = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
        onSettingsChange(prev => ({ ...prev, [key]: value }));
    };

    const handleResetAdvanced = () => {
      onSettingsChange(prev => ({
        ...prev,
        titleLength: 0,
        keywordCount: 0,
        descriptionLength: 0,
        includeDescription: true,
        includeCategory: true,
      }));
    }

    const tones: WritingTone[] = ['Professional', 'Casual', 'Creative', 'Technical'];
    const platforms: PromptPlatform[] = ['Midjourney', 'Stable Diffusion', 'DALL-E 3'];

    const SliderControl = ({ label, value, min, max, onChange, Icon }: { label: string, value: number, min: number, max: number, onChange: (e: ChangeEvent<HTMLInputElement>) => void, Icon: React.FC<React.SVGProps<SVGSVGElement>> }) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-sm text-text-secondary font-medium">
                    <Icon className="w-4 h-4" />
                    {label}
                </label>
                <span className="text-sm font-bold">{value === min ? 'Auto' : value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={onChange}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
            />
        </div>
    );
    
    // Icons
    const ControlsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
    const MetadataIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h13.5A2.25 2.25 0 0019 13.75v-7.5A2.25 2.25 0 0016.75 4H3.25zM16.5 6.25a.75.75 0 00-.75-.75H4a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h11.5a.75.75 0 00.75-.75v-.5z" /></svg>;
    const PromptIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.53 2.306a.75.75 0 011.06 1.06l-1.334 1.333a.75.75 0 01-1.11-.05l-1.12-1.343a.75.75 0 01.05-1.11l1.333-1.333a.75.75 0 011.12.443zM4.75 6.121a.75.75 0 011.06 0l1.333 1.334a.75.75 0 01-.05 1.11l-1.343 1.12a.75.75 0 01-1.11-.05L3.293 8.194a.75.75 0 010-1.06l1.457-1.457zM14.03 8.88a.75.75 0 010-1.06l1.333-1.333a.75.75 0 111.06 1.06l-1.333 1.333a.75.75 0 01-1.06 0z" clipRule="evenodd" /><path d="M7.75 11.25a.75.75 0 100 1.5.75.75 0 000-1.5z" /><path d="M9.04 7.21a.75.75 0 011.06 0l3.004 3.003a.75.75 0 11-1.06 1.06l-3.005-3.004a.75.75 0 010-1.06z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3.81 5.235a6.5 6.5 0 018.955 8.955 6.5 6.5 0 01-8.955-8.955z" clipRule="evenodd" /></svg>;
    const AdvancedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.013 2.513a.75.75 0 01.525.935l-1.002 4.008 2.222.01.05.202a.75.75 0 01-.842.842l-4.008 1.002-2.23-.012a.75.75 0 01-.524-.935l1.002-4.008-2.222-.01a.75.75 0 01.842-.842l4.008-1.002 2.23.012zM10 5.165l-2.071.518L7.14 9.69l2.07-.518 2.86-7.155-2.07.518zM8.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" /><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.25 4.012a7.001 7.001 0 015.152 10.316l-1.76-1.76A5.501 5.501 0 009.25 4.012zM4.012 9.25a7.001 7.001 0 0110.316-5.152l-1.76 1.76A5.501 5.501 0 004.012 9.25z" /></svg>;
    const TitleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-6.5h13v6.5a.75.75 0 001.5 0V2.75a.75.75 0 00-1.5 0v6.5h-13V2.75z" /></svg>;
    const KeywordsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
    const DescIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
    const ToneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6z" /><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a1 1 0 011.414 0zM5.293 3.293a1 1 0 011.414 0l1.06 1.06a.75.75 0 01-1.06 1.06L5.646 4.354a1 1 0 010-1.414zM16.95 11.5a.75.75 0 010 1.5h-1.5a.75.75 0 010-1.5h1.5zM4.5 11.5a.75.75 0 010 1.5h-1.5a.75.75 0 010-1.5h1.5zM14.354 14.354a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 011.06-1.06l1.06 1.06zM5.646 6.354a.75.75 0 011.06-1.06l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06zM15.707 3.293a1 1 0 010 1.414l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a1 1 0 011.414 0zM4.293 15.707a1 1 0 011.414 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    const PresetsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5 2.75C5 2.336 5.336 2 5.75 2h5.5a.75.75 0 010 1.5h-5.5A.25.25 0 005 3.75v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-5.5a.75.75 0 011.5 0v5.5A1.75 1.75 0 0113.75 18h-8.5A1.75 1.75 0 013.5 16.25V3.75C3.5 3.197 3.947 2.75 4.5 2.75H5z" clipRule="evenodd" /><path fillRule="evenodd" d="M8.5 4.5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5a.75.75 0 01-.75-.75zM8.5 7.5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5h-5A.75.75 0 018.5 7.5zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" /></svg>;

    return (
        <aside className="w-[350px] shrink-0 bg-bg-secondary h-full overflow-y-auto flex flex-col border-r border-border scrollbar-thin scrollbar-thumb-bg-tertiary scrollbar-track-bg-secondary">
            <div className="p-6 border-b border-border">
              <h1 className="text-3xl sm:text-4xl font-bold text-accent">🤖 Meta Pondit</h1>
              <p className="mt-2 text-sm text-text-secondary">AI-Powered Metadata & Prompt Generator</p>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-8">
                <h2 className="text-xl font-bold flex items-center gap-2"><ControlsIcon /> Controls</h2>

                {/* Mode Switcher */}
                <div className="bg-bg-primary p-1 rounded-lg grid grid-cols-2 gap-1">
                    <button onClick={() => updateSetting('mode', 'metadata')} className={`flex items-center justify-center gap-2 text-sm font-semibold p-2 rounded-md transition-all ${settings.mode === 'metadata' ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-border'}`}><MetadataIcon /> Metadata</button>
                    <button onClick={() => updateSetting('mode', 'prompt')} className={`flex items-center justify-center gap-2 text-sm font-semibold p-2 rounded-md transition-all ${settings.mode === 'prompt' ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-border'}`}><PromptIcon /> Prompt</button>
                </div>
                
                { settings.mode === 'metadata' && ( <>
                    {/* Marketplace */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Marketplace</label>
                        <select value={settings.marketplace} onChange={(e) => updateSetting('marketplace', e.target.value as Marketplace)} className="w-full bg-bg-tertiary border border-border rounded-md p-2.5 text-sm focus:ring-accent focus:border-accent">
                            <option>Adobe Stock</option>
                        </select>
                    </div>

                    {/* Advanced */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2"><AdvancedIcon /> Advanced</h3>
                            <button onClick={handleResetAdvanced} className="text-xs text-text-secondary hover:text-white font-semibold">Reset</button>
                        </div>
                        <SliderControl label="Title Length" value={settings.titleLength} min={0} max={200} Icon={TitleIcon} onChange={e => updateSetting('titleLength', parseInt(e.target.value, 10))} />
                        <SliderControl label="Keyword Count" value={settings.keywordCount} min={0} max={49} Icon={KeywordsIcon} onChange={e => updateSetting('keywordCount', parseInt(e.target.value, 10))} />
                        <SliderControl label="Description" value={settings.descriptionLength} min={0} max={500} Icon={DescIcon} onChange={e => updateSetting('descriptionLength', parseInt(e.target.value, 10))} />
                        
                        <div className="space-y-2 pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={settings.includeDescription} onChange={e => updateSetting('includeDescription', e.target.checked)} className="w-4 h-4 rounded bg-bg-tertiary border-border text-accent focus:ring-accent" />
                                Include Description
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={settings.includeCategory} onChange={e => updateSetting('includeCategory', e.target.checked)} className="w-4 h-4 rounded bg-bg-tertiary border-border text-accent focus:ring-accent" />
                                Include Category
                            </label>
                        </div>
                    </div>

                    {/* Writing Tone */}
                    <div className="space-y-3">
                        <h3 className="text-base font-bold flex items-center gap-2"><ToneIcon /> Writing Tone</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {tones.map(tone => (
                                <button key={tone} onClick={() => updateSetting('writingTone', tone)} className={`text-sm font-semibold p-2.5 rounded-md transition-all ${settings.writingTone === tone ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-border'}`}>{tone}</button>
                            ))}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-3 border-t border-border pt-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-base font-bold flex items-center gap-2"><PresetsIcon /> Presets</h3>
                            <button className="text-sm font-bold text-accent hover:text-accent-hover">+ Save</button>
                        </div>
                        <div className="text-center text-xs text-text-secondary bg-bg-primary py-4 rounded-lg">
                            No presets saved
                        </div>
                    </div>
                </>)}

                { settings.mode === 'prompt' && (
                    <div className="flex-1 flex flex-col gap-8">
                        <div className="space-y-3">
                            <h3 className="text-base font-bold flex items-center gap-2"><PromptIcon /> AI Platform</h3>
                            <div className="flex flex-col gap-2">
                                {platforms.map(platform => (
                                    <button key={platform} onClick={() => updateSetting('promptPlatform', platform)} className={`text-sm font-semibold p-2.5 rounded-md transition-all text-left ${settings.promptPlatform === platform ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-border'}`}>{platform}</button>
                                ))}
                            </div>
                        </div>
                        <div className="text-center text-xs text-text-secondary bg-bg-primary py-4 px-2 rounded-lg">
                            Upload an image and click 'Generate' to create a text prompt for the selected platform.
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

const Dropzone: React.FC<{ onBrowseClick: () => void }> = ({ onBrowseClick }) => {
    const CloudUploadIcon = () => (
        <svg className="w-16 h-16 text-purple-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.49 10.04C18.8 6.58 15.72 4 12 4C9.04 4 6.53 5.73 5.35 8.35C2.36 8.69 0 11.23 0 14.25C0 17.57 2.69 20.25 6 20.25H19C21.76 20.25 24 18.01 24 15.25C24 12.67 22.04 10.53 19.49 10.04ZM13.5 13.5V17.25H10.5V13.5H8.25L12 9.75L15.75 13.5H13.5Z" />
        </svg>
    );
    
    const FileTypeBadge: React.FC<{type: string}> = ({ type }) => (
        <span className="bg-bg-tertiary text-accent text-xs font-bold px-2 py-1 rounded-full">{type}</span>
    );

    return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-accent transition-colors"
          onClick={onBrowseClick}
        >
            <div className="text-center">
                <CloudUploadIcon />
                <p className="mt-4 text-lg font-semibold text-text-primary">Drag & Drop your images here</p>
                <p className="mt-1 text-sm text-text-secondary">or click to browse</p>
                <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                    <FileTypeBadge type="JPG" />
                    <FileTypeBadge type="PNG" />
                    <FileTypeBadge type="GIF" />
                    <FileTypeBadge type="SVG" />
                    <FileTypeBadge type="TIFF" />
                </div>
                <p className="mt-4 text-xs text-text-secondary">Maximum: 10MB per image</p>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [files, setFiles] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [targetExtension, setTargetExtension] = useState<TargetExtension>("Original (no change)");
    const [selectedFile, setSelectedFile] = useState<ImageFile | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isCancelledRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef<number>(0);
    const [settings, setSettings] = useState<GenerationSettings>({
        mode: 'metadata',
        marketplace: 'Adobe Stock',
        titleLength: 0,
        keywordCount: 0,
        descriptionLength: 0,
        includeDescription: true,
        includeCategory: true,
        writingTone: 'Professional',
        promptPlatform: 'Midjourney',
    });

    const stats = useMemo(() => ({
        loaded: files.length,
        processing: files.filter(f => f.status === 'processing').length,
        completed: files.filter(f => f.status === 'completed').length,
        errored: files.filter(f => f.status === 'error').length,
    }), [files]);

    const processAndAddFiles = useCallback(async (selectedFiles: FileList) => {
        if (!selectedFiles) return;

        const newImageFiles: ImageFile[] = [];
        const existingFilenames = new Set(files.map(f => f.file.name));
        const filesToProcess = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'));

        for (const file of filesToProcess) {
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
        
        if (newImageFiles.length > 0) {
            setFiles(prev => [...prev, ...newImageFiles]);
        }
    }, [files]);
    
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            processAndAddFiles(event.target.files);
            event.target.value = '';
        }
    };
    
    const handleCancel = () => {
        isCancelledRef.current = true;
    };
    
    const runGenerationQueue = useCallback(async (filesToProcess: ImageFile[]) => {
        if (filesToProcess.length === 0) return;

        isCancelledRef.current = false;
        setIsProcessing(true);
        setProgress(0);
        
        let processedCount = 0;
        const totalToProcess = filesToProcess.length;

        const updateFileState = (id: string, updates: Partial<ImageFile>) => {
            setFiles(currentFiles =>
                currentFiles.map(f => (f.id === id ? { ...f, ...updates } : f))
            );
        };

        for (const fileToProcess of filesToProcess) {
            if (isCancelledRef.current) break;
            
            updateFileState(fileToProcess.id, { status: 'processing', error: undefined });

            try {
                if (settings.mode === 'metadata') {
                    const rawText = await generateImageMetadata(fileToProcess.base64, fileToProcess.file.type, settings);
                    const result = processGeminiResponse(rawText, fileToProcess.file.name);
                    updateFileState(fileToProcess.id, { status: 'completed', result });
                } else { // Prompt mode
                    const rawText = await generateImagePrompt(fileToProcess.base64, fileToProcess.file.type, settings.promptPlatform);
                    const result = processImagePromptResponse(rawText);
                    updateFileState(fileToProcess.id, { status: 'completed', promptResult: result });
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
                updateFileState(fileToProcess.id, { status: 'error', error: errorMessage });
            }
            processedCount++;
            setProgress(Math.round((processedCount / totalToProcess) * 100));
        }

        setIsProcessing(false);
        isCancelledRef.current = false;

    }, [settings]);

    const handleGenerate = () => {
        const filesToProcess = files.filter(f => f.status === 'waiting');
        if (filesToProcess.length === 0) {
            alert("No images are waiting for generation.");
            return;
        }
        runGenerationQueue(filesToProcess);
    };

    const handleRetryAllFailed = () => {
        const filesToRetry = files.filter(f => f.status === 'error');
         if (filesToRetry.length === 0) {
            alert("No failed images to retry.");
            return;
        }
        runGenerationQueue(filesToRetry);
    };
    
    const handleRetrySingle = async (fileId: string) => {
        const fileToRetry = files.find(f => f.id === fileId);
        if (!fileToRetry || isProcessing) return;
        runGenerationQueue([fileToRetry]);
    };

    const handleClear = () => {
        if (isProcessing) return;
        setFiles([]);
        setProgress(0);
    };

    const handleSaveMetadata = (fileId: string, newResult: MetadataResult) => {
        setFiles(currentFiles =>
            currentFiles.map(f => (f.id === fileId ? { ...f, result: newResult } : f))
        );
    };
    
    const handleDeleteSingle = (fileId: string) => {
        setFiles(currentFiles => currentFiles.filter(f => f.id !== fileId));
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
            const keywords = `"${r.keywords.join(', ').replace(/"/g, '""')}"`;
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

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processAndAddFiles(e.dataTransfer.files);
        }
    }, [processAndAddFiles]);
    
    const isGenerateDisabled = isProcessing || !files.some(f => f.status === 'waiting');
    const isExportDisabled = isProcessing || stats.completed === 0;
    const isRetryAllDisabled = isProcessing || stats.errored === 0;
    const isClearDisabled = isProcessing || files.length === 0;
    
    const UploadIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-accent"><path d="M9.25 13.25a.75.75 0 001.5 0V4.77l1.97 1.97a.75.75 0 001.06-1.06l-3.5-3.5a.75.75 0 00-1.06 0l-3.5 3.5a.75.75 0 101.06 1.06l1.97-1.97v8.48z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
    );
    const ExportIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.41a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 2.954V2.75z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>;
    const EmptyQueueIcon = (props: React.SVGProps<SVGSVGElement>) => <svg className="w-20 h-20 text-bg-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;

    return (
        <div className="flex h-screen bg-bg-primary font-sans text-text-primary">
            <Sidebar settings={settings} onSettingsChange={setSettings} />
            <main 
                className="flex-1 flex flex-col overflow-hidden"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto relative">
                    {isDragging && (
                        <div className="absolute inset-0 bg-accent/30 border-4 border-dashed border-accent rounded-lg flex items-center justify-center z-20 pointer-events-none m-8">
                            <p className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">Drop images anywhere to upload</p>
                        </div>
                    )}

                    <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    
                    {/* Upload Area */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><UploadIcon /> Upload Files</h3>
                        <div className="min-h-64"><Dropzone onBrowseClick={() => fileInputRef.current?.click()} /></div>
                    </div>

                    {/* Controls Bar */}
                    <div className="bg-bg-secondary p-4 rounded-lg shadow-lg space-y-4">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                {isProcessing ? (
                                    <button onClick={handleCancel} className="bg-warning hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 flex items-center gap-2 text-sm">🚫 Cancel</button>
                                ) : (
                                    <>
                                        <button onClick={() => fileInputRef.current?.click()} className="bg-accent hover:bg-accent-hover text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 flex items-center gap-2 text-sm">➕ Add Images</button>
                                        <button onClick={handleGenerate} disabled={isGenerateDisabled} className="bg-success hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 flex items-center gap-2 text-sm">✨ Generate</button>
                                    </>
                                )}
                                {settings.mode === 'metadata' && <button onClick={handleExport} disabled={isExportDisabled} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 flex items-center gap-2 text-sm"><ExportIcon className="w-4 h-4" /> Export CSV</button>}
                                <button onClick={handleClear} disabled={isClearDisabled} className="bg-error hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 flex items-center gap-2 text-sm">🗑️ Clear All</button>
                            </div>
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 justify-center md:justify-end">
                                <StatCard title="Loaded" value={stats.loaded} color="#7C3AED" />
                                <StatCard title="Processing" value={stats.processing} color="#F59E0B" />
                                <StatCard title="Completed" value={stats.completed} color="#10B981" />
                                {stats.errored > 0 && <StatCard title="Errored" value={stats.errored} color="#EF4444" />}
                                {stats.errored > 0 && (<button onClick={handleRetryAllFailed} disabled={isRetryAllDisabled} className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold flex items-center gap-1">🔁 Retry Failed</button>)}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-full flex items-center gap-2">
                                <div className="w-full bg-bg-tertiary rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
                                <span className="font-bold text-accent text-sm w-10 text-right">{progress}%</span>
                            </div>
                            {settings.mode === 'metadata' && (
                                <div className="flex-shrink-0 flex items-center gap-1.5 bg-bg-tertiary py-1 px-2 rounded-md">
                                    <label htmlFor="target-ext" className="text-xs font-bold text-text-secondary whitespace-nowrap">Export Ext:</label>
                                    <select id="target-ext" value={targetExtension} onChange={e => setTargetExtension(e.target.value as TargetExtension)} className="bg-bg-primary border border-border rounded p-1 text-xs">{TARGET_EXTENSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Image Queue */}
                    <div className="bg-bg-secondary rounded-lg shadow-lg flex-1 flex flex-col min-h-[400px]">
                        <div className="p-4 border-b border-border">
                            <h3 className="text-lg font-bold">📊 Image Queue</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {files.length === 0 ? (
                               <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary p-10">
                                   <EmptyQueueIcon />
                                   <p className="mt-4 font-semibold text-lg">Your image queue is empty</p>
                               </div>
                            ) : settings.mode === 'metadata' ? (
                                <MetadataTable files={files} onRowClick={setSelectedFile} onRetryClick={handleRetrySingle} isProcessing={isProcessing} />
                            ) : (
                                <div className="p-6"><PromptGrid files={files} onRetryClick={handleRetrySingle} isProcessing={isProcessing} /></div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            {settings.mode === 'metadata' && <DetailModal file={selectedFile} onClose={() => setSelectedFile(null)} onSave={handleSaveMetadata} onRetry={handleRetrySingle} onDelete={handleDeleteSingle} />}
        </div>
    );
};

const MetadataTable: React.FC<{files: ImageFile[], onRowClick: (file: ImageFile) => void, onRetryClick: (fileId: string) => void, isProcessing: boolean}> = ({ files, onRowClick, onRetryClick, isProcessing }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left table-auto">
            <thead className="bg-bg-tertiary text-xs text-text-secondary uppercase sticky top-0 z-10">
                <tr>
                    <th scope="col" className="px-4 md:px-6 py-3">Filename</th>
                    <th scope="col" className="hidden sm:table-cell px-4 md:px-6 py-3">Title</th>
                    <th scope="col" className="hidden md:table-cell px-4 md:px-6 py-3">Description</th>
                    <th scope="col" className="hidden lg:table-cell px-4 md:px-6 py-3">Keywords</th>
                    <th scope="col" className="hidden sm:table-cell px-4 md:px-6 py-3 text-center">Category</th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                {files.map((file, index) => {
                    const bgClass = index % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-tertiary/50';
                    return (
                        <tr key={file.id} className={`${bgClass} border-b border-border hover:bg-accent/20 cursor-pointer`} onClick={() => onRowClick(file)}>
                            <td className="px-4 md:px-6 py-4 font-medium truncate max-w-36 sm:max-w-xs" title={file.file.name}>{file.file.name}</td>
                            <td className="hidden sm:table-cell px-4 md:px-6 py-4 truncate sm:max-w-xs md:max-w-sm" title={file.result?.title ?? ''}>{file.result?.title ?? '...'}</td>
                            <td className="hidden md:table-cell px-4 md:px-6 py-4 truncate md:max-w-sm" title={file.result?.description ?? ''}>{file.result?.description ?? '...'}</td>
                            <td className="hidden lg:table-cell px-4 md:px-6 py-4 truncate lg:max-w-md" title={file.result?.keywords?.join(', ') ?? ''}>{file.result?.keywords?.join(', ') ?? '...'}</td>
                            <td className="hidden sm:table-cell px-4 md:px-6 py-4 text-center" title={file.result ? `${file.result.categoryCode} - ${file.result.categoryName}` : ''}>{file.result?.categoryCode ?? '...'}</td>
                            <td className="px-4 md:px-6 py-4 text-center font-bold">
                                {file.status === 'error' ? (<button onClick={(e) => { e.stopPropagation(); onRetryClick(file.id); }} className="bg-warning text-white font-bold py-1 px-3 rounded text-xs hover:bg-yellow-600 disabled:bg-gray-500" disabled={isProcessing}>RETRY</button>) : file.status === 'processing' ? (<span className="text-warning animate-pulse">PROCESSING</span>) : file.status === 'completed' ? (<span className="text-success">COMPLETED</span>) : (<span className="text-gray-400">WAITING</span>)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const PromptGrid: React.FC<{files: ImageFile[], onRetryClick: (fileId: string) => void, isProcessing: boolean}> = ({ files, onRetryClick, isProcessing }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {files.map(file => (
            <ImagePromptCard key={file.id} file={file} onRetry={onRetryClick} isProcessing={isProcessing} />
        ))}
    </div>
);

const ImagePromptCard: React.FC<{ file: ImageFile; onRetry: (fileId: string) => void; isProcessing: boolean; }> = ({ file, onRetry, isProcessing }) => {
    const [isCopied, setIsCopied] = useState(false);
    const promptText = file.promptResult?.prompt ?? '';
    const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M7 3.5A1.5 1.5 0 018.5 2h6.879a1.5 1.5 0 011.06.44l3.122 3.121A1.5 1.5 0 0120 6.621V16.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5v-13A1.5 1.5 0 015.5 2H6a1.5 1.5 0 011 1.5z" /><path d="M2.5 5A1.5 1.5 0 001 6.5v10A1.5 1.5 0 002.5 18h10A1.5 1.5 0 0014 16.5v-3a.75.75 0 00-1.5 0v3a.5.5 0 01-.5.5h-10a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5h3a.75.75 0 000-1.5h-3z" /></svg>;

    const handleCopy = () => {
        if (!promptText) return;
        navigator.clipboard.writeText(promptText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const StatusBadge = () => {
        switch (file.status) {
            case 'completed': return <span className="text-xs font-bold bg-success/80 text-white py-1 px-2 rounded-full">Completed</span>;
            case 'processing': return <span className="text-xs font-bold bg-warning/80 text-white py-1 px-2 rounded-full animate-pulse">Processing</span>;
            case 'error': return <span className="text-xs font-bold bg-error/80 text-white py-1 px-2 rounded-full">Error</span>;
            default: return <span className="text-xs font-bold bg-gray-500/80 text-white py-1 px-2 rounded-full">Waiting</span>;
        }
    };
    
    return (
        <div className="bg-bg-secondary rounded-lg shadow-md overflow-hidden flex flex-col border border-border">
            <div className="relative">
                <img src={`data:${file.file.type};base64,${file.base64}`} alt={file.file.name} className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2"><StatusBadge /></div>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <p className="font-bold text-sm truncate mb-2" title={file.file.name}>{file.file.name}</p>
                <div className="flex-grow">
                     <textarea
                        readOnly
                        value={file.status === 'error' ? file.error : promptText}
                        className={`w-full h-24 bg-bg-primary border rounded p-2 text-xs resize-none scrollbar-thin scrollbar-thumb-bg-tertiary scrollbar-track-bg-secondary ${file.status === 'error' ? 'border-error text-red-300' : 'border-border'}`}
                        placeholder={file.status === 'processing' ? 'Generating prompt...' : file.status === 'waiting' ? 'Waiting to generate...' : 'Generated prompt will appear here...'}
                    />
                </div>
                <div className="mt-2 flex gap-2">
                    <button onClick={handleCopy} disabled={!promptText || isCopied} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-bg-tertiary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary font-semibold py-1.5 px-3 rounded-md transition duration-200">
                        <CopyIcon className="w-4 h-4" />
                        {isCopied ? 'Copied!' : 'Copy Prompt'}
                    </button>
                    {file.status === 'error' && (
                        <button onClick={() => onRetry(file.id)} disabled={isProcessing} className="text-xs bg-warning text-white font-bold py-1 px-3 rounded hover:bg-yellow-600 disabled:bg-gray-500">RETRY</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;