import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { AICaddy } from './components/AICaddy';
import { LEVELS } from './constants';
import { GameState } from './types';

const App = () => {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.AIMING);
  const [strokes, setStrokes] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentPower, setCurrentPower] = useState(0);

  const currentLevel = LEVELS[currentLevelIndex];

  const handlePowerChange = useCallback((power: number) => {
    setCurrentPower(power);
  }, []);

  const handleGameStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  const handleStrokeTaken = useCallback(() => {
    setStrokes(prev => prev + 1);
  }, []);

  const handleLevelComplete = useCallback((finalStrokes: number) => {
    setTotalScore(prev => prev + finalStrokes);
  }, []);

  const nextLevel = useCallback(() => {
    // Access state via closure or functional updates if needed, 
    // but here we depend on currentLevelIndex so we add it to deps
    if (currentLevelIndex < LEVELS.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
      setStrokes(0);
      setGameState(GameState.AIMING);
    } else {
      setGameState(GameState.GAME_OVER);
    }
  }, [currentLevelIndex]);

  const restartGame = useCallback(() => {
    setCurrentLevelIndex(0);
    setStrokes(0);
    setTotalScore(0);
    setGameState(GameState.AIMING);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 font-sans select-none">
      
      <div className="w-full max-w-4xl relative aspect-[4/3] bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-4 border-slate-700">
        <GameCanvas 
          level={currentLevel}
          gameState={gameState}
          onGameStateChange={handleGameStateChange}
          onStrokeTaken={handleStrokeTaken}
          onLevelComplete={handleLevelComplete}
          onPowerChange={handlePowerChange}
        />
        
        <UIOverlay 
          level={currentLevel}
          strokes={strokes}
          totalScore={totalScore}
          gameState={gameState}
          onNextLevel={nextLevel}
          onRestart={restartGame}
          currentPower={currentPower}
        />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full max-w-4xl justify-between">
        <div className="text-slate-400 text-sm">
          <span className="font-bold text-slate-200">Mini Golf Master</span> &copy; 2025
        </div>
        
        <AICaddy className="transform hover:scale-105" />
      </div>
      
    </div>
  );
};

export default App;