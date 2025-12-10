import React from 'react';
import { LevelData, GameState } from '../types';

interface UIOverlayProps {
  level: LevelData;
  strokes: number;
  totalScore: number;
  gameState: GameState;
  onNextLevel: () => void;
  onRestart: () => void;
  levelScore?: number;
  currentPower: number;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  level, strokes, totalScore, gameState, onNextLevel, onRestart, currentPower
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-slate-900/80 text-white p-3 rounded-xl backdrop-blur-sm shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold text-yellow-400">{level.name}</h2>
          <div className="text-sm text-slate-300">Hole {level.id} • Par {level.par}</div>
        </div>

        <div className="bg-slate-900/80 text-white p-3 rounded-xl backdrop-blur-sm shadow-lg border border-slate-700 text-right">
           <div className="text-2xl font-mono font-bold">{strokes} <span className="text-sm font-sans font-normal text-slate-400">Strokes</span></div>
           <div className="text-sm text-slate-300">Total: {totalScore}</div>
        </div>
      </div>

      {/* Power Meter - Right Side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
         {currentPower > 0 && (
            <div className="text-white font-bold font-mono text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {Math.round(currentPower)}%
            </div>
         )}
         <div className="h-64 w-6 bg-slate-900/90 rounded-full border border-slate-600 relative overflow-hidden shadow-2xl">
            <div 
              className="absolute bottom-0 left-0 w-full rounded-full overflow-hidden transition-all duration-75 ease-out"
              style={{ height: `${currentPower}%` }}
            >
                <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-green-500 via-yellow-400 to-red-600"></div>
            </div>
         </div>
      </div>

      {/* Center Messages */}
      {gameState === GameState.HOLE_OUT && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-auto backdrop-blur-[2px]">
          <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl text-center transform transition-all animate-bounce max-w-sm w-full mx-4 border-4 border-yellow-400">
            <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter">
              {strokes === 1 ? 'HOLE IN ONE!' :
               strokes <= level.par - 1 ? 'BIRDIE!' :
               strokes === level.par ? 'PAR' : 
               strokes === level.par + 1 ? 'BOGEY' : 'HOLE COMPLETE'}
            </h3>
            <p className="text-slate-600 mb-6 font-medium">
              +{strokes} Strokes added to score
            </p>
            <button 
              onClick={onNextLevel}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors shadow-lg"
            >
              Next Hole ➜
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto z-50">
          <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border border-slate-600">
            <h1 className="text-4xl font-bold text-yellow-400 mb-2">COURSE COMPLETE!</h1>
            <div className="text-6xl font-black my-6 text-green-400">{totalScore}</div>
            <p className="text-xl mb-8 text-slate-300">Final Score</p>
            <button 
              onClick={onRestart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition hover:scale-105"
            >
              Play Again ↺
            </button>
          </div>
        </div>
      )}
      
      {/* Bottom hint area */}
      <div className="text-center pb-2 opacity-50 text-white text-sm font-medium drop-shadow-md">
        {gameState === GameState.AIMING ? "Drag back from the ball to aim • Release to shoot" : "Ball in motion..."}
      </div>
    </div>
  );
};