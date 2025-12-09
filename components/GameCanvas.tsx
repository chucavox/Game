import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Ball, Wall, SandTrap, Hole, Particle, Vector2D, LevelData, GameState
} from '../types';
import { 
  FRICTION_GRASS, FRICTION_SAND, WALL_BOUNCE, STOP_VELOCITY, 
  MAX_POWER, POWER_MULTIPLIER, CANVAS_WIDTH, CANVAS_HEIGHT 
} from '../constants';
import { audioManager } from '../services/audioService';

interface GameCanvasProps {
  level: LevelData;
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onStrokeTaken: () => void;
  onLevelComplete: (strokes: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  level, gameState, onGameStateChange, onStrokeTaken, onLevelComplete 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (to avoid closures in animation loop)
  const ballRef = useRef<Ball>({ 
    pos: { ...level.startPos }, 
    vel: { x: 0, y: 0 }, 
    radius: 8, 
    isMoving: false, 
    color: '#ffffff' 
  });
  
  const particlesRef = useRef<Particle[]>([]);
  const dragStartRef = useRef<Vector2D | null>(null);
  const dragCurrentRef = useRef<Vector2D | null>(null);
  const strokesRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const wasInSandRef = useRef(false);

  // Sync prop state to ref
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Reset ball on level change
  useEffect(() => {
    ballRef.current = { 
      pos: { ...level.startPos }, 
      vel: { x: 0, y: 0 }, 
      radius: 8, 
      isMoving: false, 
      color: '#ffffff' 
    };
    strokesRef.current = 0;
    particlesRef.current = [];
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    wasInSandRef.current = false;
  }, [level]);

  // Physics Logic Helpers
  const checkCollisionRect = (ball: Ball, rect: Wall) => {
    // Find closest point on the rectangle to the circle
    const closestX = Math.max(rect.x, Math.min(ball.pos.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(ball.pos.y, rect.y + rect.h));

    const dx = ball.pos.x - closestX;
    const dy = ball.pos.y - closestY;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < ball.radius * ball.radius) {
      // Collision detected
      const distance = Math.sqrt(distanceSq);
      const overlap = ball.radius - distance;
      
      // Normal vector
      let nx = dx / (distance || 1);
      let ny = dy / (distance || 1);
      
      // If center is inside rect (shouldn't happen often with sub-stepping, but safeguard)
      if (distance === 0) {
        nx = 0; ny = 0; // Simplified fallback
        // Push out based on relative position to center of rect
        const cx = rect.x + rect.w/2;
        const cy = rect.y + rect.h/2;
        if (Math.abs(ball.pos.x - cx) > Math.abs(ball.pos.y - cy)) {
            nx = Math.sign(ball.pos.x - cx);
        } else {
            ny = Math.sign(ball.pos.y - cy);
        }
      }

      // Resolve Position (push out)
      ball.pos.x += nx * overlap;
      ball.pos.y += ny * overlap;

      // Resolve Velocity (Reflect)
      const dot = ball.vel.x * nx + ball.vel.y * ny;
      
      // Only bounce if moving towards the wall (dot product < 0)
      if (dot < 0) {
          ball.vel.x = (ball.vel.x - 2 * dot * nx) * WALL_BOUNCE;
          ball.vel.y = (ball.vel.y - 2 * dot * ny) * WALL_BOUNCE;
          
          // Play collision sound
          const speed = Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);
          audioManager.playWallHit(speed, rect.type);
      }
    }
  };

  const createParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        pos: { x, y },
        vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
        life: 1.0,
        color: color,
        size: Math.random() * 3 + 2
      });
    }
  };

  // Main Loop
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = ballRef.current;
    
    // --- UPDATE ---
    
    // 1. Movement
    if (gameStateRef.current === GameState.MOVING) {
      ball.pos.x += ball.vel.x;
      ball.pos.y += ball.vel.y;

      // Friction
      let currentFriction = FRICTION_GRASS;
      let inSand = false;
      
      // Check Sand Traps
      for (const trap of level.traps) {
        if (ball.pos.x > trap.x && ball.pos.x < trap.x + trap.w &&
            ball.pos.y > trap.y && ball.pos.y < trap.y + trap.h) {
          currentFriction = FRICTION_SAND;
          inSand = true;
          break;
        }
      }

      // Play sand entry sound
      if (inSand && !wasInSandRef.current) {
          audioManager.playSandEnter();
      }
      wasInSandRef.current = inSand;
      
      ball.vel.x *= currentFriction;
      ball.vel.y *= currentFriction;

      // Check Stop
      const speed = Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);
      if (speed < STOP_VELOCITY) {
        ball.vel.x = 0;
        ball.vel.y = 0;
        ball.isMoving = false;
        
        // Only change state if we haven't holed out
        if (gameStateRef.current !== GameState.HOLE_OUT) {
             onGameStateChange(GameState.AIMING);
        }
      }

      // Check Walls
      level.walls.forEach(wall => checkCollisionRect(ball, wall));

      // Check Hole
      const dx = ball.pos.x - level.hole.x;
      const dy = ball.pos.y - level.hole.y;
      const distToHole = Math.sqrt(dx*dx + dy*dy);
      
      if (distToHole < level.hole.radius && speed < 5) {
        // Sunk!
        if (gameStateRef.current !== GameState.HOLE_OUT) {
           onGameStateChange(GameState.HOLE_OUT);
           createParticles(ball.pos.x, ball.pos.y, 50, '#FFD700'); // Gold confetti
           audioManager.playHoleIn();
           
           // Suck into hole animation effect (simple logic in rendering)
           ball.vel.x = 0;
           ball.vel.y = 0;
           ball.pos.x = level.hole.x;
           ball.pos.y = level.hole.y;
           
           setTimeout(() => {
              onLevelComplete(strokesRef.current);
           }, 2000);
        }
      }
    }

    // 2. Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        p.life -= 0.02;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // --- RENDER ---
    
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grass (Gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#4ade80');
    grad.addColorStop(1, '#22c55e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Sand Traps
    ctx.fillStyle = '#fde047'; // Sand yellow
    level.traps.forEach(trap => {
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        // Inner shadow for depth
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
    });

    // Draw Hole
    ctx.beginPath();
    ctx.arc(level.hole.x, level.hole.y, level.hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Flag
    if (gameStateRef.current !== GameState.HOLE_OUT) {
        ctx.beginPath();
        ctx.moveTo(level.hole.x, level.hole.y);
        ctx.lineTo(level.hole.x, level.hole.y - 60);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(level.hole.x, level.hole.y - 60);
        ctx.lineTo(level.hole.x + 25, level.hole.y - 50);
        ctx.lineTo(level.hole.x, level.hole.y - 40);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    }

    // Draw Walls
    level.walls.forEach(wall => {
        ctx.fillStyle = wall.type === 'stone' ? '#64748b' : '#92400e';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        // 3D effect bevel
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y + wall.h);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.lineTo(wall.x + wall.w, wall.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Draw Ball
    if (gameStateRef.current !== GameState.HOLE_OUT) {
        // Shadow
        ctx.beginPath();
        ctx.ellipse(ball.pos.x + 2, ball.pos.y + 2, ball.radius, ball.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Ball Body
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        // Shine
        ctx.beginPath();
        ctx.arc(ball.pos.x - 2, ball.pos.y - 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
    }

    // Draw Aim Line
    if (gameStateRef.current === GameState.AIMING && dragStartRef.current && dragCurrentRef.current) {
        const dx = dragStartRef.current.x - dragCurrentRef.current.x;
        const dy = dragStartRef.current.y - dragCurrentRef.current.y;
        
        // Clamp power visualization
        const rawPower = Math.sqrt(dx*dx + dy*dy);
        const clampedPower = Math.min(rawPower * POWER_MULTIPLIER, MAX_POWER);
        const scale = clampedPower / (rawPower * POWER_MULTIPLIER || 1);
        
        const aimX = ball.pos.x + dx * scale * 5; // Visualize projected path length
        const aimY = ball.pos.y + dy * scale * 5;

        // Dotted Line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(ball.pos.x, ball.pos.y);
        ctx.lineTo(aimX, aimY);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Arrow Head
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(aimX, aimY);
        ctx.lineTo(aimX - 10 * Math.cos(angle - Math.PI/6), aimY - 10 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(aimX - 10 * Math.cos(angle + Math.PI/6), aimY - 10 * Math.sin(angle + Math.PI/6));
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Power Circle Indicator around ball
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, 15 + clampedPower * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, ${255 - clampedPower * 15}, 0, 0.5)`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    requestAnimationFrame(loop);
  }, [level, onGameStateChange, onLevelComplete]);

  useEffect(() => {
    const animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [loop]);

  // Input Handlers
  const handleStart = (x: number, y: number) => {
    if (gameStateRef.current !== GameState.AIMING) return;
    
    // Check if clicked near ball
    const ball = ballRef.current;
    const dx = x - ball.pos.x;
    const dy = y - ball.pos.y;
    
    // Allow dragging from anywhere if we want easier mobile controls, 
    // but strictly speaking should be near ball. Let's make it forgiving (50px radius)
    if (dx*dx + dy*dy < 2500) {
        dragStartRef.current = { x: ball.pos.x, y: ball.pos.y }; // Anchor drag start to ball center
        dragCurrentRef.current = { x, y }; // Current is where mouse is
    }
  };

  const handleMove = (x: number, y: number) => {
    if (!dragStartRef.current) return;
    dragCurrentRef.current = { x, y };
  };

  const handleEnd = () => {
    if (!dragStartRef.current || !dragCurrentRef.current) return;
    
    const dx = dragStartRef.current.x - dragCurrentRef.current.x;
    const dy = dragStartRef.current.y - dragCurrentRef.current.y;
    
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 5) { // Minimum pull threshold
        const power = Math.min(dist * POWER_MULTIPLIER, MAX_POWER);
        const angle = Math.atan2(dy, dx);
        
        ballRef.current.vel.x = Math.cos(angle) * power;
        ballRef.current.vel.y = Math.sin(angle) * power;
        ballRef.current.isMoving = true;
        
        strokesRef.current += 1;
        onStrokeTaken();
        onGameStateChange(GameState.MOVING);
        
        // Audio
        audioManager.playShoot(power);

        // Spawn dust particles
        createParticles(ballRef.current.pos.x, ballRef.current.pos.y, 10, '#fff');
    }
    
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  };

  // Mouse/Touch Events
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain bg-slate-800 rounded-lg shadow-2xl touch-none cursor-crosshair"
      onMouseDown={(e) => {
          const { x, y } = getCoords(e);
          handleStart(x, y);
      }}
      onMouseMove={(e) => {
          const { x, y } = getCoords(e);
          handleMove(x, y);
      }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => {
          const { x, y } = getCoords(e);
          handleStart(x, y);
      }}
      onTouchMove={(e) => {
          const { x, y } = getCoords(e);
          handleMove(x, y);
      }}
      onTouchEnd={handleEnd}
    />
  );
};

export default GameCanvas;