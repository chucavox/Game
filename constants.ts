import { LevelData } from './types';

// Physics Constants
export const FRICTION_GRASS = 0.975;
export const FRICTION_SAND = 0.88; // Increased drag (was 0.92)
export const WALL_BOUNCE = 0.7;
export const STOP_VELOCITY = 0.08;
export const MAX_POWER = 15;
export const POWER_MULTIPLIER = 0.15;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Levels
export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "The Starter",
    par: 2,
    startPos: { x: 100, y: 300 },
    hole: { x: 700, y: 300, radius: 15 },
    walls: [
      { x: 380, y: 200, w: 40, h: 200, type: 'wood' }, // Middle obstacle
      { x: 0, y: 0, w: 800, h: 20, type: 'stone' }, // Top
      { x: 0, y: 580, w: 800, h: 20, type: 'stone' }, // Bottom
      { x: 0, y: 0, w: 20, h: 600, type: 'stone' }, // Left
      { x: 780, y: 0, w: 20, h: 600, type: 'stone' }, // Right
    ],
    traps: [],
  },
  {
    id: 2,
    name: "The Zigzag",
    par: 3,
    startPos: { x: 100, y: 500 },
    hole: { x: 700, y: 100, radius: 15 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20, type: 'stone' },
      { x: 0, y: 580, w: 800, h: 20, type: 'stone' },
      { x: 0, y: 0, w: 20, h: 600, type: 'stone' },
      { x: 780, y: 0, w: 20, h: 600, type: 'stone' },
      // Obstacles
      { x: 200, y: 250, w: 400, h: 30, type: 'wood' },
      { x: 400, y: 0, w: 30, h: 250, type: 'wood' },
    ],
    traps: [
      { x: 500, y: 300, w: 150, h: 100 }, // Sand trap in the turn
    ],
  },
  {
    id: 3,
    name: "The Maze",
    par: 4,
    startPos: { x: 50, y: 50 },
    hole: { x: 740, y: 540, radius: 15 },
    walls: [
      { x: 0, y: 0, w: 800, h: 20, type: 'stone' },
      { x: 0, y: 580, w: 800, h: 20, type: 'stone' },
      { x: 0, y: 0, w: 20, h: 600, type: 'stone' },
      { x: 780, y: 0, w: 20, h: 600, type: 'stone' },
      // Maze walls
      { x: 150, y: 0, w: 20, h: 450, type: 'wood' },
      { x: 300, y: 150, w: 20, h: 450, type: 'wood' },
      { x: 450, y: 0, w: 20, h: 400, type: 'wood' },
      { x: 600, y: 200, w: 20, h: 400, type: 'wood' },
    ],
    traps: [
      { x: 170, y: 450, w: 130, h: 100 },
      { x: 620, y: 100, w: 160, h: 80 },
    ],
  },
];