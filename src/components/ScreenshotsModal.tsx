import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, ExternalLink } from 'lucide-react';

interface ScreenshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScreenshotItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageSrc: string;
  tags: string[];
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'gameplay',
    title: '360° Real-Time Arcade Pitch & Power Gauge',
    category: 'MATCH GAMEPLAY',
    description:
      'Sensible World of Soccer inspired 2D action on an authentic 1800x1080 pitch. Featuring 360° analog stick control, PlayStation button mapping, dynamic on-player power bars (Pass, Shoot, Precision, Loft), defensive pressure & slide tackle mechanics, and tactical mini-radar.',
    imageSrc: '/src/assets/images/gameplay_match_action_1790257838835.jpg',
    tags: ['Real-Time 60FPS', 'PlayStation Controls', 'Power Gauge', 'Pressure & Slide Tackle', 'Organic Turf Bounces'],
  },
  {
    id: 'tactics',
    title: 'Tactics Board & 7x5 SWOS Zonal Matrix',
    category: 'TACTICS & SQUAD',
    description:
      'Chalkboard tactical interface with authentic SWOS 7x5 position coordinate grid (35 pitch spots). Features custom role pegs, interactive 4-4-2, 4-3-3, 3-5-2 formations, player ratings, and defensive line depth holding CBs behind fullbacks.',
    imageSrc: '/src/assets/images/tactics_board_screen_1790257865553.jpg',
    tags: ['SWOS 7x5 Matrix', 'Formations', 'Squad Ratings', 'Defensive Depth Engine', 'Custom Tactics'],
  },
  {
    id: 'table',
    title: 'Premier ASCII League Table & Standings',
    category: 'LEAGUE CAMPAIGN',
    description:
      'Retro green phosphor CRT monitor broadcast aesthetic tracking 8 English clubs through a 14-round championship campaign. Computes live points, goal difference, win/draw/loss records, and fixture schedules.',
    imageSrc: '/src/assets/images/league_standings_screen_1790257877670.jpg',
    tags: ['14-Round Season', '8 Historic Clubs', 'Live Goal Difference', 'Retro Phosphor CRT', 'Full Simulation Engine'],
  },
  {
    id: 'postmatch',
    title: 'Post-Match Statistics & Broadcast Box Score',
    category: 'MATCH ANALYSIS',
    description:
      'Full post-match analysis with comparative statistics bars (Possession, Shots on Target, Tackles Won, Fouls), goal scorer timestamps, round fixtures simulator, and teletype commentary log.',
    imageSrc: '/src/assets/images/post_match_analysis_1790257891605.jpg',
    tags: ['Possession %', 'Shots on Target', 'Goal Timestamps', 'Match Log Commentary', 'Exhibition & League Modes'],
  },
];

export const ScreenshotsModal: React.FC<ScreenshotsModalProps> = ({ isOpen, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!isOpen) return null;

  const current = SCREENSHOTS[selectedIndex];

  const prev = () => setSelectedIndex((i) => (i === 0 ? SCREENSHOTS.length - 1 : i - 1));
  const next = () => setSelectedIndex((i) => (i === SCREENSHOTS.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-mono select-none">
      <div className="relative w-full max-w-5xl bg-[#0a120a] border-2 border-[#2e7d32] rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs sm:text-sm">
        {/* Header */}
        <div className="bg-[#12261a] border-b border-[#2e7d32] px-4 py-3 flex justify-between items-center text-[#ffd54f]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#ffd54f]" />
            <span className="font-bold tracking-wider text-sm sm:text-base">
              GAME SCREENSHOTS & FEATURE SHOWCASE
            </span>
            <span className="text-[11px] text-[#81c784] hidden sm:inline">
              ({selectedIndex + 1} of {SCREENSHOTS.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1b5e20] text-[#d4e8d4] cursor-pointer transition"
            title="Close showcase"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail Navigation Strip */}
        <div className="bg-[#050a05] border-b border-[#1b5e20] px-3 py-2 flex items-center gap-2 overflow-x-auto">
          {SCREENSHOTS.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition font-bold text-xs whitespace-nowrap ${
                selectedIndex === idx
                  ? 'bg-[#1b5e20] text-[#ffd54f] border border-[#ffd54f] shadow'
                  : 'bg-[#101f13] text-[#81c784] hover:bg-[#152e1a] border border-transparent'
              }`}
            >
              <span>{idx + 1}.</span>
              <span>{item.category}</span>
            </button>
          ))}
        </div>

        {/* Main Display Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative w-full aspect-video bg-black rounded border border-[#2e7d32] overflow-hidden shadow-xl group">
            <img
              src={current.imageSrc}
              alt={current.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />

            {/* Left / Right Carousel Arrows */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-[#1b5e20] border border-[#ffd54f] text-[#ffd54f] flex items-center justify-center cursor-pointer transition opacity-80 hover:opacity-100 shadow-lg"
              title="Previous Screenshot"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-[#1b5e20] border border-[#ffd54f] text-[#ffd54f] flex items-center justify-center cursor-pointer transition opacity-80 hover:opacity-100 shadow-lg"
              title="Next Screenshot"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Bottom Caption Pill */}
            <div className="absolute bottom-2 left-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-[#2e7d32] text-xs flex justify-between items-center text-white">
              <span className="font-bold text-[#ffd54f]">{current.title}</span>
              <span className="text-[11px] text-[#81c784]">16:9 HD Broadcast View</span>
            </div>
          </div>

          {/* Details & Tags */}
          <div className="bg-[#12261a] border border-[#2e7d32] p-3.5 rounded space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[10px] text-[#81c784] font-bold tracking-widest uppercase">
                  {current.category}
                </span>
                <h3 className="text-base font-bold text-[#ffd54f]">{current.title}</h3>
              </div>
              <a
                href={current.imageSrc}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#81c784] hover:text-[#ffd54f] flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded border border-[#2e7d32] transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Size
              </a>
            </div>

            <p className="text-xs text-[#d4e8d4] leading-relaxed">{current.description}</p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {current.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-[#0a180a] border border-[#2e7d32] text-[10px] text-[#81c784] font-semibold"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#050a05] border-t border-[#1b5e20] px-4 py-2.5 flex justify-between items-center text-xs">
          <div className="text-[#6b8a6b] text-[11px]">
            Press Left / Right arrows or click tabs to explore screenshots
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b5e20] hover:bg-[#2e7d32] text-[#ffd54f] font-bold rounded cursor-pointer border border-[#ffd54f] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
