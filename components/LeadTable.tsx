
import React from 'react';
import { ScrapedEmail } from '../types';
import { ExternalLink, Mail, User, Globe, Copy, Check, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface LeadTableProps {
  emails: ScrapedEmail[];
}

const LeadTable: React.FC<LeadTableProps> = ({ emails }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 border border-dashed border-gray-700 rounded-lg bg-gray-900/50">
        <Mail className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No emails collected yet.</p>
        <p className="text-sm">Run a search to start scraping public email addresses.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-700 rounded-lg shadow-xl bg-gray-900">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-300 text-xs uppercase tracking-wider font-semibold">
            <th className="p-4 border-b border-gray-700 w-1/3">Email Address</th>
            <th className="p-4 border-b border-gray-700">Context / Owner</th>
            <th className="p-4 border-b border-gray-700">Source</th>
            <th className="p-4 border-b border-gray-700 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-gray-800">
          {emails.map((item) => (
            <tr key={item.id} className="hover:bg-gray-800/50 transition-colors duration-150 group">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="p-2 rounded bg-primary-600/10 text-primary-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    {item.isValidated && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border border-gray-900 shadow-sm" title="Format Verified">
                        <ShieldCheck className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-white select-all">{item.email}</span>
                    {item.isValidated && (
                      <span className="text-[10px] text-green-500/70 font-bold uppercase tracking-tighter">Format Verified</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="w-4 h-4 text-gray-500" />
                  {item.context}
                </div>
              </td>
              <td className="p-4">
                 <div className="flex items-center gap-2 text-gray-300">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="truncate max-w-[200px]">{item.source}</span>
                </div>
              </td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => copyToClipboard(item.email, item.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
                    title="Copy Email"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {item.source && item.source.includes('.') && (
                    <a 
                      href={item.source.startsWith('http') ? item.source : `https://${item.source}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
                      title="Visit Source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
