// Physics Types
export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  isMoving: boolean;
  color: string;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'wood' | 'stone';
}

export interface SandTrap {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hole {
  x: number;
  y: number;
  radius: number;
}

export interface Particle {
  pos: Vector2D;
  vel: Vector2D;
  life: number;
  color: string;
  size: number;
}

// Game Logic Types
export interface LevelData {
  id: number;
  name: string;
  par: number;
  startPos: Vector2D;
  hole: Hole;
  walls: Wall[];
  traps: SandTrap[];
  startRotation?: number; // For initial aim hint
}

export enum GameState {
  AIMING,
  MOVING,
  HOLE_OUT,
  LEVEL_TRANSITION,
  GAME_OVER
}

export interface ScoreCard {
  [levelId: number]: number;
}

// Live API Types
export interface LiveConfig {
  voiceName: string;
}
