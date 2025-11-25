import React, { useState, useRef } from 'react';
import { Search, Download, RefreshCw, AlertCircle, ShieldCheck, UserSearch, Play, Square, Zap, Gauge, Clock, AlertTriangle, Check, Filter, HardDrive } from 'lucide-react';
import { SearchResult, ScrapeStatus } from './types';
import { searchEmailsWithGemini } from './services/geminiService';
import { generateRandomUSAIdentity } from './services/nameGenerator';
import LeadTable from './components/LeadTable';
import SourcesPanel from './components/SourcesPanel';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ScrapeStatus>(ScrapeStatus.IDLE);
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-Scrape States
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [autoQueryDisplay, setAutoQueryDisplay] = useState('');
  const [isRecordingToDisk, setIsRecordingToDisk] = useState(false);
  const stopSignal = useRef(false);

  // Configuration
  const [useSuperThreads, setUseSuperThreads] = useState(false);
  // Dynamic Batch Size: 50 (Standard) vs 100 (Super Speed)
  const BATCH_SIZE = useSuperThreads ? 100 : 50; 

  // Provider Filters
  const [providerFilters, setProviderFilters] = useState({
    gmail: true,
    yahoo: true,
    aol: true,
    hotmail: true,
    icloud: true,
    net: true
  });

  const getActiveDomains = () => {
    const domains: string[] = [];
    if (providerFilters.gmail) domains.push('gmail.com');
    if (providerFilters.yahoo) domains.push('yahoo.com', 'ymail.com');
    if (providerFilters.aol) domains.push('aol.com');
    if (providerFilters.hotmail) domains.push('hotmail.com', 'live.com', 'msn.com', 'outlook.com');
    if (providerFilters.icloud) domains.push('icloud.com', 'me.com', 'mac.com');
    if (providerFilters.net) domains.push('comcast.net', 'att.net', 'verizon.net', 'cox.net', 'sbcglobal.net');
    return domains;
  };

  const toggleFilter = (key: keyof typeof providerFilters) => {
    setProviderFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Manual Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus(ScrapeStatus.SEARCHING);
    setError(null);
    setData(null);

    const activeDomains = getActiveDomains();

    try {
      const result = await searchEmailsWithGemini(query, activeDomains);
      setData(result);
      setStatus(ScrapeStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching data.");
      setStatus(ScrapeStatus.ERROR);
    }
  };

  // Auto-Scrape Logic (High Speed Local Generation + File System Stream)
  const startAutoScrape = async () => {
    if (isAutoScraping) return;

    let fileStream: any = null;
    
    // 1. Enforce Folder Selection logic
    if ('showDirectoryPicker' in window) {
        // Explicitly tell user to select folder first
        const userConfirmed = window.confirm("Step 1: Select a folder on your computer.\nStep 2: The app will auto-save the CSV file there.\n\nClick OK to select the folder.");
        
        if (!userConfirmed) return; // User cancelled the initial prompt

        try {
            const dirHandle = await (window as any).showDirectoryPicker();
            const fileName = `zabasearch_leads_${Date.now()}.csv`;
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            fileStream = await fileHandle.createWritable();
            
            // Write CSV Header
            await fileStream.write("Email Address,Person/Context,Source\n");
            setIsRecordingToDisk(true);
        } catch (err) {
            // Check if user cancelled the browser picker
            if ((err as Error).name === 'AbortError') {
                console.log("Folder selection cancelled by user.");
                return; // Stop execution here. Do NOT start mining.
            }
            
            console.error("File system error", err);
            alert("Could not access the selected folder. Auto-mine cancelled.");
            return;
        }
    } else {
        // Fallback for unsupported browsers
        const proceed = window.confirm("Your browser does not support direct folder saving. Data will be collected in memory and must be downloaded manually.\n\nContinue?");
        if (!proceed) return;
    }
    
    // 2. Start Mining (Only reached if folder selection succeeded or unsupported browser accepted)
    setIsAutoScraping(true);
    stopSignal.current = false;
    setStatus(ScrapeStatus.SEARCHING);
    
    // Initialize data if empty
    if (!data) {
      setData({ emails: [], sources: [], rawText: '' });
    }

    const activeDomains = getActiveDomains();

    // Loop until stopped
    while (!stopSignal.current) {
      // 1. Generate Batch of Identities
      const queries = Array.from({ length: BATCH_SIZE }, () => generateRandomUSAIdentity());
      setAutoQueryDisplay(queries.join(' | '));
      
      try {
        // 2. Execute Requests in Parallel
        // Since this is local, it resolves almost instantly
        const promises = queries.map(q => 
            searchEmailsWithGemini(q, activeDomains)
                .then(res => ({ status: 'fulfilled', value: res }))
                .catch(err => ({ status: 'rejected', reason: err }))
        );

        const results = await Promise.all(promises);
        
        // 3. Batch Update State with Successful Results
        const validResults = results
            .filter((r: any) => r.status === 'fulfilled')
            .map((r: any) => r.value as SearchResult);

        // 3a. Write to Disk (Real-time)
        if (fileStream && validResults.length > 0) {
            const newEmails = validResults.flatMap(r => r.emails);
            if (newEmails.length > 0) {
              const csvChunk = newEmails.map(item => 
                `"${item.email}","${item.context}","${item.source}"`
              ).join('\n') + '\n';
              
              await fileStream.write(csvChunk);
            }
        }

        setData((prev) => {
          if (validResults.length === 0) return prev;

          // Clone existing state
          let currentEmails = prev ? [...prev.emails] : [];
          let currentSources = prev ? [...prev.sources] : [];
          
          validResults.forEach(res => {
            // Enhanced Deduplication & Enrichment Logic
            res.emails.forEach(newEmail => {
              const normalizedNewEmail = newEmail.email.toLowerCase().trim();
              
              const existingIndex = currentEmails.findIndex(
                (existing) => existing.email.toLowerCase().trim() === normalizedNewEmail
              );

              if (existingIndex !== -1) {
                // DUPLICATE FOUND: Check if we should enrich the existing record
                const existing = currentEmails[existingIndex];
                
                // Logic: Update if new context is "better" (longer/more specific) or if existing was generic
                const isExistingGeneric = existing.context === 'Unknown Person';
                const isNewGeneric = newEmail.context === 'Unknown Person';
                
                const shouldUpdate = !isNewGeneric && (
                  isExistingGeneric || 
                  newEmail.context.length > existing.context.length
                );

                if (shouldUpdate) {
                  currentEmails[existingIndex] = {
                    ...existing,
                    context: newEmail.context,
                    source: newEmail.source // Update source as it likely provided the better context
                  };
                }
              } else {
                // UNIQUE: Add new email
                currentEmails.push(newEmail);
              }
            });

            // Deduplicate Sources
            res.sources.forEach(src => {
              if (!currentSources.some(s => s.uri === src.uri)) {
                currentSources.push(src);
              }
            });
          });

          return {
            emails: currentEmails,
            sources: currentSources,
            rawText: prev ? prev.rawText : '' 
          };
        });

      } catch (err) {
        console.warn("Batch execution fatal error, pausing...", err);
      }

      // 4. Minimal Delay to allow React UI Render Cycle
      // No API rate limit to respect, just need to keep UI responsive.
      if (!stopSignal.current) {
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }
    }

    // Cleanup File Stream
    if (fileStream) {
      await fileStream.close();
      setIsRecordingToDisk(false);
    }

    setIsAutoScraping(false);
    setStatus(ScrapeStatus.COMPLETED);
    setAutoQueryDisplay('');
  };

  const stopAutoScrape = () => {
    stopSignal.current = true;
    setIsAutoScraping(false);
    setStatus(ScrapeStatus.IDLE);
  };

  const exportCSV = async () => {
    if (!data?.emails.length) return;
    
    const headers = ['Email Address', 'Person/Context', 'Source'];
    const csvContent = [
      headers.join(','),
      ...data.emails.map(item => 
        `"${item.email}","${item.context}","${item.source}"`
      )
    ].join('\n');

    try {
      // 1. Try Modern "Save As" Picker (Chrome/Edge/Opera)
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `zabasearch_leads_${Date.now()}.csv`,
          types: [{
            description: 'CSV File',
            accept: {'text/csv': ['.csv']},
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      } else {
        // 2. Fallback for Firefox/Safari/Mobile
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `zabasearch_leads_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      // User cancelled save dialog
      console.log("Save cancelled");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 font-sans selection:bg-primary-500/30">
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <UserSearch className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              ZabaSearch <span className="text-primary-500">OSINT</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
             {isRecordingToDisk && (
               <div className="flex items-center gap-2 px-2 py-1 bg-red-900/30 border border-red-800 rounded text-red-400 animate-pulse">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 REC to DISK
               </div>
             )}
             {isAutoScraping && (
                <div className="flex items-center gap-2 text-green-400 animate-pulse font-bold">
                  <Gauge className="w-4 h-4 text-green-500" />
                  TURBO MINER: {BATCH_SIZE}X THREADS
                </div>
             )}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-800 text-blue-400">
               <Search className="w-3 h-3 text-blue-500" />
               People Search Mode
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section */}
        <section className="mb-8">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl blur transition duration-1000 ${isAutoScraping ? 'opacity-70 animate-pulse' : 'opacity-30 group-hover:opacity-50'}`}></div>
            <div className="relative bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-2xl">
              
              {/* Manual Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={isAutoScraping}
                      placeholder={
                           isAutoScraping 
                                ? `Mining ${BATCH_SIZE} vectors: ${autoQueryDisplay.substring(0, 50)}...` 
                                : "Enter Person Name & Location (e.g. 'John Doe California')"
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  {/* Manual Button */}
                  {!isAutoScraping && (
                    <button
                      type="submit"
                      disabled={status === ScrapeStatus.SEARCHING || !query.trim()}
                      className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <UserSearch className="w-5 h-5" />
                        Find People
                    </button>
                  )}

                  {/* Auto Scrape Button */}
                  {isAutoScraping ? (
                    <button
                      type="button"
                      onClick={stopAutoScrape}
                      className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shadow-lg shadow-red-900/50 transition-all flex items-center justify-center gap-2 min-w-[180px]"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      Stop Miner
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={startAutoScrape}
                        disabled={status === ScrapeStatus.SEARCHING}
                        className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg shadow-lg shadow-primary-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
                      >
                         <Zap className="w-5 h-5 fill-current" />
                         Start Auto-Mine
                      </button>
                      <div className="text-[10px] text-center text-gray-500 font-mono">
                        *Select Folder First
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Advanced Controls Row */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between text-xs text-gray-400 gap-4 pt-2">
                  
                  {/* Provider Checkboxes */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-primary-400 font-semibold">
                      <Filter className="w-3.5 h-3.5" />
                      FILTERS:
                    </div>
                    
                    {[
                      { key: 'gmail', label: 'Gmail' },
                      { key: 'yahoo', label: 'Yahoo' },
                      { key: 'aol', label: 'AOL' },
                      { key: 'hotmail', label: 'Hotmail/Outlook' },
                      { key: 'icloud', label: 'iCloud' },
                      { key: 'net', label: '.net ISPs' },
                    ].map((provider) => (
                      <label key={provider.key} className="flex items-center gap-1.5 cursor-pointer group select-none">
                        <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center
                          ${providerFilters[provider.key as keyof typeof providerFilters] 
                            ? 'bg-primary-600 border-primary-600' 
                            : 'bg-gray-800 border-gray-600 group-hover:border-gray-500'}`}
                        >
                          {providerFilters[provider.key as keyof typeof providerFilters] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={providerFilters[provider.key as keyof typeof providerFilters]}
                          onChange={() => toggleFilter(provider.key as keyof typeof providerFilters)}
                          disabled={isAutoScraping}
                        />
                        <span className={`${providerFilters[provider.key as keyof typeof providerFilters] ? 'text-gray-200' : 'text-gray-500'} transition-colors`}>
                          {provider.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Settings */}
                  <div className="flex items-center gap-4 border-l border-gray-700 pl-4">
                    {/* 100 THREADS CHECKBOX */}
                    <label className="flex items-center gap-2 cursor-pointer select-none group w-fit">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${useSuperThreads ? 'bg-red-600 border-red-600' : 'bg-gray-800 border-gray-700 group-hover:border-gray-500'}`}
                        >
                            {useSuperThreads && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={useSuperThreads} 
                            onChange={e => setUseSuperThreads(e.target.checked)} 
                            disabled={isAutoScraping}
                        />
                        <span className={`font-bold transition-colors ${useSuperThreads ? 'text-red-400 animate-pulse' : 'text-gray-500 group-hover:text-gray-400'}`}>
                            100x SUPER SPEED
                        </span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Scan Failed</h3>
              <p className="text-sm opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results Area */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-primary-500">///</span> 
              Identified Targets
              {data?.emails && (
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                  {data.emails.length} Found
                </span>
              )}
            </h2>
            
            {data && data.emails.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                <HardDrive className="w-4 h-4" />
                Save to Computer
              </button>
            )}
          </div>

          <LeadTable emails={data?.emails || []} />
          
          {data?.sources && <SourcesPanel sources={data.sources} />}

          {/* Prompt Transparency / Status */}
          {status === ScrapeStatus.SEARCHING && (
            <div className="mt-8 p-4 font-mono text-xs text-green-500 bg-black rounded border border-gray-800 opacity-70">
              {isAutoScraping ? (
                 <>
                   &gt; THREAD_POOL: {BATCH_SIZE} active workers<br/>
                   &gt; FILTERS: {getActiveDomains().length} provider groups active<br/>
                   &gt; BATCH_TARGETS: {autoQueryDisplay}<br/>
                   {isRecordingToDisk && (
                      <span className="text-red-400">&gt; FILE_STREAM: WRITING TO DISK [Active]<br/></span>
                   )}
                   &gt; EXTRACTING: ZabaSearch / Whitepages / Radaris...<br/>
                   &gt; STATUS: High-Speed Mining...
                 </>
              ) : (
                <>
                  &gt; Accessing ZabaSearch Index...<br/>
                  &gt; Querying Public Records Database...<br/>
                  &gt; Filtering for contact information...<br/>
                  &gt; Cross-referencing data points...<br/>
                </>
              )}
            </div>
          )}
          
          {data && data.emails.length === 0 && status === ScrapeStatus.COMPLETED && !isAutoScraping && (
             <div className="mt-2 text-xs text-gray-500 text-center">
                No direct email matches found on ZabaSearch or public records for this query. 
                Try varying the location or name format.
             </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default App;