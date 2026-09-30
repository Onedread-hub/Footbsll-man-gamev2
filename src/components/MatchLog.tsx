import React, { useEffect, useRef } from 'react';

interface MatchLogProps {
  logs: string[];
}

export const MatchLog: React.FC<MatchLogProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatLineClass = (line: string) => {
    if (line.includes('⚽ GOAL')) return 'text-[#ffd54f] font-bold bg-[#ffd54f]/10 px-1 py-0.5 rounded';
    if (line.includes('🧤 SPECTACULAR SAVE') || line.includes('SAVED')) return 'text-[#42a5f5] font-semibold';
    if (line.includes('FOUL') || line.includes('CLANG') || line.includes('wide')) return 'text-orange-300';
    if (line.includes('FULL TIME') || line.includes('HALF TIME') || line.includes('Kick-off')) return 'text-white font-bold border-l-2 border-[#ffd54f] pl-1';
    if (line.includes('WINS the ball') || line.includes('CRUNCH') || line.includes('bursts past')) return 'text-emerald-300';
    return 'text-[#d4e8d4] opacity-90';
  };

  return (
    <div className="border border-[#2e7d32] bg-[#0d1a0d] rounded p-3 font-mono text-xs sm:text-sm">
      <div className="flex justify-between items-center pb-1.5 mb-2 border-b border-[#1b5e20] text-[#ffd54f] font-semibold">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          MATCH COMMENTARY TELETYPE
        </span>
        <span className="text-[10px] text-[#6b8a6b] uppercase tracking-wider">LIVE FEED // PREMIER ASCII</span>
      </div>

      <div
        ref={containerRef}
        className="h-44 sm:h-48 overflow-y-auto space-y-1 pr-1 font-mono leading-relaxed"
      >
        {logs.map((log, index) => (
          <div key={index} className={`transition-all duration-150 ${formatLineClass(log)}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
