import React from 'react';
import { GroundingSource } from '../types';
import { Link2 } from 'lucide-react';

interface SourcesPanelProps {
  sources: GroundingSource[];
}

const SourcesPanel: React.FC<SourcesPanelProps> = ({ sources }) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        Verified Sources
      </h3>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-all truncate max-w-[200px]"
            title={source.title}
          >
            {source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SourcesPanel;