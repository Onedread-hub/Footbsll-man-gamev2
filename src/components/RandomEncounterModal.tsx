import React from 'react';
import { RandomEncounter } from '../services/randomEncounterEngine';
import { sound } from '../services/audio';
import { Newspaper, X, AlertTriangle, Sparkles, ShieldAlert, Award, ArrowRight } from 'lucide-react';

interface RandomEncounterModalProps {
  encounter: RandomEncounter | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RandomEncounterModal: React.FC<RandomEncounterModalProps> = ({
  encounter,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !encounter) return null;

  const isPos = encounter.type === 'positive';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-serif">
      <div className="bg-[#fcfaf2] text-[#1c1917] border-4 border-[#292524] rounded-lg max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* NEWSPAPER TOP FOLIO */}
        <div className="bg-[#1c1917] text-[#e7e5e4] px-4 py-1.5 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span>VOL. 38 · NO. 14</span>
            <span>·</span>
            <span>EDITION: {encounter.dateString}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>PRICE: 60p (INC. VAT)</span>
            <button
              onClick={() => {
                sound.click();
                onClose();
              }}
              className="text-[#a8a29e] hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NEWSPAPER MASTHEAD */}
        <div className="px-6 pt-4 pb-2 border-b-2 border-black text-center bg-[#f5f2e9]">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-serif uppercase text-[#1c1917]">
            {encounter.newspaperName}
          </h1>
          <div className="text-[10px] text-[#78716c] font-mono tracking-wider mt-0.5 uppercase border-t border-b border-[#d6d3d1] py-0.5 my-1">
            THE NATION'S MOST FEARLESS SPORTING CHRONICLE · EXCLUSIVE LOCKER ROOM REPORTS
          </div>
        </div>

        {/* RED-TOP / BREAKING BANNER */}
        <div
          className={`px-4 py-1 text-center font-mono font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-inner ${
            isPos ? 'bg-[#15803d]' : 'bg-[#b91c1c]'
          }`}
        >
          {isPos ? <Sparkles className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span>{encounter.badgeLabel}</span>
        </div>

        {/* SCROLLABLE STORY SECTION */}
        <div className="p-5 overflow-y-auto space-y-4 bg-[#fcfaf2]">
          {/* Main Headline */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0c0a09] leading-tight tracking-tight">
              {encounter.headline}
            </h2>
            <p className="text-xs sm:text-sm text-[#44403c] italic font-serif mt-1.5 leading-snug">
              {encounter.subheadline}
            </p>
          </div>

          {/* Player Badge / Mugshot & Story Body */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
            {/* Player Stamp Left */}
            <div className="sm:col-span-4 bg-[#e7e5e4] p-3 rounded border-2 border-dashed border-[#a8a29e] text-center font-mono space-y-1">
              <div className="text-[9px] text-[#78716c] font-bold uppercase tracking-wider">
                SUBJECT OF INQUIRY
              </div>
              <div className="text-2xl font-black text-[#1c1917]">
                #{encounter.targetPlayer.number}
              </div>
              <div className="text-xs font-bold text-[#1c1917] leading-tight">
                {encounter.targetPlayer.name}
              </div>
              <div className="text-[11px] text-[#0369a1] font-bold">
                {encounter.targetPlayer.position} · {encounter.clubName}
              </div>
              <div className="text-[10px] text-[#57534e]">
                Skill Rating: <strong>{encounter.targetPlayer.rating}</strong>
              </div>
            </div>

            {/* Story Prose Right */}
            <div className="sm:col-span-8 space-y-2.5 text-xs text-[#292524] leading-relaxed font-serif">
              <p className="first-letter:text-3xl first-letter:font-black first-letter:float-left first-letter:mr-1.5 first-letter:leading-none">
                {encounter.storyText}
              </p>

              {/* Tabloid Quote Callout */}
              <div className="border-l-4 border-[#1c1917] pl-3 py-1 bg-[#f5f2e9] italic text-[#44403c] text-xs font-serif">
                {encounter.quote}
              </div>
            </div>
          </div>

          {/* MANAGERIAL IMPACT & STAT CONSEQUENCES */}
          <div className="p-3.5 rounded-lg border-2 border-black bg-[#f5f2e9] font-mono space-y-2">
            <div className="text-xs font-bold text-[#1c1917] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#d6d3d1] pb-1.5">
              {isPos ? <Award className="w-4 h-4 text-emerald-700" /> : <ShieldAlert className="w-4 h-4 text-red-700" />}
              <span>OFFICIAL CONSEQUENCES & STAT IMPACT:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {encounter.effects.suspensionMatches ? (
                <div className="p-2 rounded bg-red-100 border border-red-300 text-red-900 font-bold flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <span>
                    Banned for <strong>{encounter.effects.suspensionMatches} Matches</strong>
                  </span>
                </div>
              ) : null}

              {encounter.effects.statModified && encounter.effects.statChange ? (
                <div
                  className={`p-2 rounded border font-bold flex items-center gap-2 ${
                    encounter.effects.statChange > 0
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-red-100 border-red-300 text-red-900'
                  }`}
                >
                  <span className="text-base">{encounter.effects.statChange > 0 ? '📈' : '📉'}</span>
                  <span>
                    {encounter.effects.statChange > 0 ? '+' : ''}
                    {encounter.effects.statChange} {encounter.effects.statModified.toUpperCase()}
                  </span>
                </div>
              ) : null}

              {encounter.effects.tokenReward ? (
                <div
                  className={`p-2 rounded border font-bold flex items-center gap-2 ${
                    encounter.effects.tokenReward > 0
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-red-100 border-red-300 text-red-900'
                  }`}
                >
                  <span className="text-base">💰</span>
                  <span>
                    {encounter.effects.tokenReward > 0 ? '+' : ''}
                    {encounter.effects.tokenReward} Training Tokens
                  </span>
                </div>
              ) : null}

              {encounter.effects.conditionChange ? (
                <div
                  className={`p-2 rounded border font-bold flex items-center gap-2 ${
                    encounter.effects.conditionChange > 0
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}
                >
                  <span className="text-base">⚡</span>
                  <span>
                    {encounter.effects.conditionChange > 0 ? '+' : ''}
                    {encounter.effects.conditionChange}% Fitness & Stamina
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTON */}
        <div className="p-3 bg-[#e7e5e4] border-t-2 border-black flex justify-between items-center font-mono">
          <span className="text-[11px] text-[#57534e]">
            {isPos ? 'Squad morale is sky-high!' : 'Manage squad selection accordingly.'}
          </span>
          <button
            onClick={() => {
              sound.whistle();
              onClose();
            }}
            className="px-5 py-2 bg-[#1c1917] hover:bg-[#292524] text-white rounded font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow flex items-center gap-2"
          >
            <span>Dismiss Press Briefing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
