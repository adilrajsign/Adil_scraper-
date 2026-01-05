import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, RefreshCw, AlertCircle, ShieldCheck, UserSearch, Play, Square, Zap, Gauge, Clock, AlertTriangle, Check, Filter, HardDrive, Trash2, Cpu, ChevronDown, ChevronUp, CheckSquare, Square as SquareIcon } from 'lucide-react';
import { SearchResult, ScrapeStatus, ScrapedEmail } from './types';
import { searchEmailsWithGemini } from './services/geminiService';
import { generateRandomUSAIdentity } from './services/nameGenerator';
import LeadTable from './components/LeadTable';
import SourcesPanel from './components/SourcesPanel';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ScrapeStatus>(ScrapeStatus.IDLE);
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCollected, setTotalCollected] = useState(0);
  
  // Auto-Scrape States
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [autoQueryDisplay, setAutoQueryDisplay] = useState('');
  const [isRecordingToDisk, setIsRecordingToDisk] = useState(false);
  const stopSignal = useRef(false);

  // Memory Management Refs
  const seenEmailsRef = useRef<Set<string>>(new Set());
  // IMPORTANT: We only fill allEmailsRef if NOT saving to disk to prevent RAM bloat
  const allEmailsRef = useRef<ScrapedEmail[]>([]); 
  const MAX_UI_ROWS = 100; // Only keep the last 100 rows in DOM to prevent browser crash

  // Configuration
  const [useSuperThreads, setUseSuperThreads] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const BATCH_SIZE = useSuperThreads ? 100 : 50; 

  // Detailed Provider Filters
  const [providerFilters, setProviderFilters] = useState<Record<string, boolean>>({
    'gmail.com': true,
    'yahoo.com': true,
    'aol.com': true,
    'hotmail.com': true,
    'icloud.com': true,
    'att.net': true,
    'comcast.net': true,
    'verizon.net': true,
    'cox.net': true,
    'sbcglobal.net': true,
    'bellsouth.net': true,
    'charter.net': true,
    'spectrum.net': true,
    'optimum.net': true,
    'earthlink.net': true,
    'frontiernet.net': true,
    'centurylink.net': true,
    'windstream.net': true,
    'suddenlink.net': true,
    'mediacomcc.net': true,
    'pacbell.net': true,
  });

  const majorProviders = ['gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'icloud.com'];
  const ispProviders = Object.keys(providerFilters).filter(p => !majorProviders.includes(p));

  const getActiveDomains = () => {
    return Object.entries(providerFilters)
      .filter(([_, active]) => active)
      .map(([domain]) => {
        // Handle aliases
        if (domain === 'yahoo.com') return ['yahoo.com', 'ymail.com'];
        if (domain === 'hotmail.com') return ['hotmail.com', 'live.com', 'msn.com', 'outlook.com'];
        if (domain === 'icloud.com') return ['icloud.com', 'me.com', 'mac.com'];
        return [domain];
      })
      .flat();
  };

  const toggleFilter = (domain: string) => {
    setProviderFilters(prev => ({ ...prev, [domain]: !prev[domain] }));
  };

  const toggleGroup = (group: string[], targetValue: boolean) => {
    const next = { ...providerFilters };
    group.forEach(p => next[p] = targetValue);
    setProviderFilters(next);
  };

  const clearData = () => {
    setData(null);
    setTotalCollected(0);
    seenEmailsRef.current.clear();
    allEmailsRef.current = [];
    setStatus(ScrapeStatus.IDLE);
    // Explicitly suggest browser memory cleanup to the user if they were in RAM mode
    if (!isRecordingToDisk && totalCollected > 50000) {
      console.log("Memory cleared. For hard reset, refresh the page.");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus(ScrapeStatus.SEARCHING);
    setError(null);
    setData(null);
    seenEmailsRef.current.clear(); 
    allEmailsRef.current = [];
    setTotalCollected(0);

    const activeDomains = getActiveDomains();

    try {
      const result = await searchEmailsWithGemini(query, activeDomains);
      result.emails.forEach(e => {
          seenEmailsRef.current.add(e.email.toLowerCase());
          allEmailsRef.current.push(e);
      });
      setData(result);
      setTotalCollected(result.emails.length);
      setStatus(ScrapeStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching data.");
      setStatus(ScrapeStatus.ERROR);
    }
  };

  const startAutoScrape = async () => {
    if (isAutoScraping) return;

    let fileHandle: any = null;
    let usingDisk = false;
    
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await (window as any).showDirectoryPicker();
            const fileName = `leads_${Date.now()}.csv`;
            fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            
            const writable = await fileHandle.createWritable();
            await writable.write("Email Address,Person/Context,Source\n");
            await writable.close();
            
            setIsRecordingToDisk(true);
            usingDisk = true;
            // CRITICAL: When using disk, we clear allEmailsRef to keep browser fast and prevent "not responding"
            allEmailsRef.current = []; 
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("File system error", err);
                alert("Error accessing file system. Running in Memory Mode.");
            }
        }
    }
    
    setIsAutoScraping(true);
    stopSignal.current = false;
    setStatus(ScrapeStatus.SEARCHING);
    
    if (!data) setData({ emails: [], sources: [], rawText: '' });
    const activeDomains = getActiveDomains();

    while (!stopSignal.current) {
      const queries = Array.from({ length: BATCH_SIZE }, () => generateRandomUSAIdentity());
      setAutoQueryDisplay(queries.join(' | '));
      
      try {
        const promises = queries.map(q => 
            searchEmailsWithGemini(q, activeDomains)
                .then(res => ({ status: 'fulfilled', value: res }))
                .catch(err => ({ status: 'rejected', reason: err }))
        );

        const results = await Promise.all(promises);
        const validResults = results
            .filter((r: any) => r.status === 'fulfilled')
            .map((r: any) => r.value as SearchResult);

        const uniqueNewEmails: ScrapedEmail[] = [];
        validResults.forEach(res => {
            res.emails.forEach(emailObj => {
                const normalized = emailObj.email.toLowerCase().trim();
                if (!seenEmailsRef.current.has(normalized)) {
                    seenEmailsRef.current.add(normalized);
                    uniqueNewEmails.push(emailObj);
                    
                    // ONLY store in RAM if we are NOT recording to disk
                    if (!usingDisk) {
                      allEmailsRef.current.push(emailObj);
                    }
                }
            });
        });

        // 3a. Atomic Write to Disk
        if (usingDisk && fileHandle && uniqueNewEmails.length > 0) {
              const csvChunk = uniqueNewEmails.map(item => 
                `"${item.email}","${item.context}","${item.source}"`
              ).join('\n') + '\n';
              
              try {
                  const file = await fileHandle.getFile();
                  const currentSize = file.size;
                  const writable = await fileHandle.createWritable({ keepExistingData: true });
                  await writable.seek(currentSize);
                  await writable.write(csvChunk);
                  await writable.close();
              } catch (writeErr) {
                  console.error("Disk Write Error:", writeErr);
                  setIsRecordingToDisk(false);
                  usingDisk = false;
              }
        }

        // 3b. UI Update (Rolling Buffer)
        if (uniqueNewEmails.length > 0) {
            setTotalCollected(prev => prev + uniqueNewEmails.length);
            setData((prev) => {
              let currentEmails = prev ? [...prev.emails] : [];
              currentEmails = [...currentEmails, ...uniqueNewEmails];
              if (currentEmails.length > MAX_UI_ROWS) {
                  currentEmails = currentEmails.slice(-MAX_UI_ROWS);
              }
              let currentSources = prev ? [...prev.sources] : [];
              if (validResults[0]?.sources) {
                  currentSources = [...validResults[0].sources, ...currentSources].slice(0, 20);
              }
              return { emails: currentEmails, sources: currentSources, rawText: prev ? prev.rawText : '' };
            });
        }
      } catch (err) {
        console.warn("Batch error", err);
      }

      if (!stopSignal.current) await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    if (!usingDisk && allEmailsRef.current.length > 0) {
        triggerAutoDownload(allEmailsRef.current);
    }
    
    setIsRecordingToDisk(false);
    setIsAutoScraping(false);
    setStatus(ScrapeStatus.COMPLETED);
    setAutoQueryDisplay('');
  };

  const triggerAutoDownload = (emails: ScrapedEmail[]) => {
      const headers = ['Email Address', 'Person/Context', 'Source'];
      const csvContent = [
        headers.join(','),
        ...emails.map(item => `"${item.email}","${item.context}","${item.source}"`)
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_autosave_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const stopAutoScrape = () => { stopSignal.current = true; };

  const exportCSV = async () => {
    const sourceData = allEmailsRef.current.length > 0 ? allEmailsRef.current : data?.emails;
    if (!sourceData || sourceData.length === 0) return;
    const headers = ['Email Address', 'Person/Context', 'Source'];
    const csvContent = [headers.join(','), ...sourceData.map(item => `"${item.email}","${item.context}","${item.source}"`)].join('\n');
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `leads_export_${Date.now()}.csv`,
          types: [{ description: 'CSV File', accept: {'text/csv': ['.csv']} }],
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();
      } else {
        triggerAutoDownload(sourceData as ScrapedEmail[]);
      }
    } catch (err) { console.log("Save cancelled"); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 font-sans selection:bg-primary-500/30">
      
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <UserSearch className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              ZabaSearch <span className="text-primary-500">PRO</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
             {isRecordingToDisk ? (
               <div className="flex items-center gap-2 px-2 py-1 bg-red-900/30 border border-red-800 rounded text-red-400 animate-pulse">
                 <HardDrive className="w-3 h-3" />
                 STREAMING TO DISK (RAM SAFE)
               </div>
             ) : (
                isAutoScraping && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-400">
                        <Cpu className="w-3 h-3 animate-pulse" />
                        RAM MODE (CACHING ACTIVE)
                    </div>
                )
             )}
             <div className="hidden sm:flex items-center gap-2 text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-800/50">
                <ShieldCheck className="w-3 h-3" />
                Anti-Freeze Protection
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <section className="mb-8">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl blur transition duration-1000 ${isAutoScraping ? 'opacity-70 animate-pulse' : 'opacity-30 group-hover:opacity-50'}`}></div>
            <div className="relative bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-2xl">
              
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
                                ? `Mining ${BATCH_SIZE} threads: ${autoQueryDisplay.substring(0, 40)}...` 
                                : "Name & Location (e.g. 'Adil Smith Florida')"
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-mono text-sm disabled:opacity-50"
                    />
                  </div>
                  
                  {!isAutoScraping ? (
                    <button
                      type="submit"
                      disabled={status === ScrapeStatus.SEARCHING || !query.trim()}
                      className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <UserSearch className="w-5 h-5" />
                        Manual Find
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAutoScrape}
                      className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg shadow-lg shadow-red-900/50 transition-all flex items-center justify-center gap-2 min-w-[180px]"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      Stop Miner
                    </button>
                  )}

                  {!isAutoScraping && (
                    <button
                        type="button"
                        onClick={startAutoScrape}
                        disabled={status === ScrapeStatus.SEARCHING}
                        className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg shadow-lg shadow-primary-900/50 transition-all flex items-center justify-center gap-2 min-w-[180px]"
                    >
                         <Zap className="w-5 h-5 fill-current" />
                         Start Auto-Mine
                    </button>
                  )}
                </div>
                
                {/* ADVANCED PROVIDER FILTERS */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-widest">
                      <Filter className="w-3.5 h-3.5" />
                      Individual Collection Options
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowAllFilters(!showAllFilters)}
                      className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {showAllFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showAllFilters ? 'Hide Extended ISPs' : `Show Extended ISPs (${ispProviders.length})`}
                    </button>
                  </div>

                  <div className="space-y-4 bg-gray-950/50 p-4 rounded-lg border border-gray-800/50">
                    {/* Major Providers */}
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2 mr-2">
                        <button 
                            type="button"
                            onClick={() => toggleGroup(majorProviders, true)}
                            className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                        >ALL</button>
                        <button 
                            type="button"
                            onClick={() => toggleGroup(majorProviders, false)}
                            className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                        >NONE</button>
                      </div>
                      {majorProviders.map((p) => (
                        <FilterItem key={p} label={p} checked={providerFilters[p]} onChange={() => toggleFilter(p)} disabled={isAutoScraping} />
                      ))}
                    </div>

                    {/* Extended ISPs */}
                    {showAllFilters && (
                      <div className="pt-3 border-t border-gray-800/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-gray-500 font-bold mr-2 uppercase">ISP Group:</span>
                            <button 
                                type="button"
                                onClick={() => toggleGroup(ispProviders, true)}
                                className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                            >ENABLE ALL ISPs</button>
                            <button 
                                type="button"
                                onClick={() => toggleGroup(ispProviders, false)}
                                className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                            >DISABLE ALL ISPs</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2">
                          {ispProviders.map((p) => (
                            <FilterItem key={p} label={p} checked={providerFilters[p]} onChange={() => toggleFilter(p)} disabled={isAutoScraping} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SUPER SPEED TOGGLE */}
                <div className="flex items-center gap-6 pt-2 border-t border-gray-800/30">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${useSuperThreads ? 'bg-red-600 border-red-600' : 'bg-gray-800 border-gray-700 group-hover:border-gray-500'}`}
                        >
                            {useSuperThreads && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <input type="checkbox" className="hidden" checked={useSuperThreads} onChange={e => setUseSuperThreads(e.target.checked)} disabled={isAutoScraping} />
                        <span className={`text-xs font-bold transition-colors ${useSuperThreads ? 'text-red-400 animate-pulse' : 'text-gray-500 group-hover:text-gray-400'}`}>
                            100X SUPER THREADING (HIGH CPU)
                        </span>
                    </label>
                </div>
              </form>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Error Encountered</h3>
              <p className="text-sm opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-primary-500">///</span> 
                  Mining Results
                </h2>
                {totalCollected > 0 && (
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full pl-1 pr-3 py-1 shadow-inner">
                      <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-900/40">COLLECTED</div>
                      <span className="text-sm font-mono text-green-400">{totalCollected.toLocaleString()}</span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {data && (data.emails.length > 0 || allEmailsRef.current.length > 0) && (
                <>
                    <button
                        onClick={clearData}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 rounded-lg transition-colors text-xs"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reset Memory
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg shadow-primary-900/50 transition-colors text-sm font-bold"
                    >
                        <Download className="w-4 h-4" />
                        Full Export
                    </button>
                </>
                )}
            </div>
          </div>

          <LeadTable emails={data?.emails || []} />
          
          {status === ScrapeStatus.SEARCHING && (
            <div className="mt-8 p-4 font-mono text-[10px] text-green-500 bg-black/50 rounded border border-gray-800/50 backdrop-blur-sm">
              <div className="flex justify-between border-b border-gray-800 pb-1 mb-2">
                <span>SYSTEM_LOG</span>
                <span className="animate-pulse">RUNNING...</span>
              </div>
              <div className="space-y-0.5 opacity-80">
                &gt; THREAD_POOL: {BATCH_SIZE} Active<br/>
                &gt; ACTIVE_FILTERS: {getActiveDomains().length} Domains<br/>
                {isRecordingToDisk ? (
                  <span className="text-red-400 font-bold">&gt; STORAGE: ATOMIC DISK WRITE (RAM SAFE MODE)<br/></span>
                ) : (
                  <span className="text-yellow-400 font-bold">&gt; STORAGE: RAM CACHE MODE (Auto-Download on Stop)<br/></span>
                )}
                &gt; UI_BUFFER: Last {MAX_UI_ROWS} rows visible<br/>
                &gt; BATCH_FEED: {autoQueryDisplay.substring(0, 100)}...<br/>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

// Subcomponent for Filter items to clean up App.tsx
const FilterItem: React.FC<{ label: string, checked: boolean, onChange: () => void, disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 cursor-pointer group select-none ${disabled ? 'opacity-50' : ''}`}>
    <div className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center
      ${checked ? 'bg-primary-600 border-primary-600' : 'bg-gray-950 border-gray-700 group-hover:border-gray-500'}`}
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} disabled={disabled} />
    <span className={`text-[11px] transition-colors ${checked ? 'text-gray-200' : 'text-gray-500'}`}>
      {label}
    </span>
  </label>
);

export default App;