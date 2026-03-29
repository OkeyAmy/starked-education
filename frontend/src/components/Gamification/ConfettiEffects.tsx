'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocity: { x: number; y: number };
  rotationSpeed: number;
}

interface ConfettiEffectsProps {
  trigger: boolean;
  duration?: number;
  intensity?: 'light' | 'medium' | 'heavy' | 'massive';
  colors?: string[];
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#FFD93D', '#6BCB77', '#FF6B9D',
  '#C44569', '#F8B195', '#F67280', '#355C7D', '#6C5B7B'
];

const INTENSITY_CONFIG = {
  light: { pieces: 30, spread: 120, speed: 2 },
  medium: { pieces: 60, spread: 180, speed: 3 },
  heavy: { pieces: 100, spread: 240, speed: 4 },
  massive: { pieces: 200, spread: 360, speed: 5 }
};

export function ConfettiEffects({
  trigger,
  duration = 3000,
  intensity = 'medium',
  colors = DEFAULT_COLORS,
  onComplete
}: ConfettiEffectsProps) {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const generateConfettiPiece = (index: number, total: number): ConfettiPiece => {
    const config = INTENSITY_CONFIG[intensity];
    const angle = (index / total) * config.spread - config.spread / 2;
    const velocity = config.speed + Math.random() * 2;
    
    return {
      id: Date.now() + index,
      x: 50, // Start from center
      y: 50, // Start from center
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocity: {
        x: Math.cos(angle * Math.PI / 180) * velocity,
        y: Math.sin(angle * Math.PI / 180) * velocity - 5 // Initial upward velocity
      },
      rotationSpeed: (Math.random() - 0.5) * 10
    };
  };

  const startConfetti = () => {
    const config = INTENSITY_CONFIG[intensity];
    const pieces = Array.from({ length: config.pieces }, (_, i) => generateConfettiPiece(i, config.pieces));
    
    setConfettiPieces(pieces);
    setIsActive(true);
    startTimeRef.current = Date.now();
    
    // Clear confetti after duration
    setTimeout(() => {
      setIsActive(false);
      setConfettiPieces([]);
      if (onComplete) onComplete();
    }, duration);
  };

  const animate = () => {
    if (!isActive || !startTimeRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      setIsActive(false);
      setConfettiPieces([]);
      if (onComplete) onComplete();
      return;
    }
    
    setConfettiPieces(prevPieces => 
      prevPieces.map(piece => {
        const gravity = 0.2;
        const friction = 0.99;
        
        return {
          ...piece,
          x: piece.x + piece.velocity.x,
          y: piece.y + piece.velocity.y,
          rotation: piece.rotation + piece.rotationSpeed,
          velocity: {
            x: piece.velocity.x * friction,
            y: piece.velocity.y * friction + gravity
          },
          scale: piece.scale * (1 - progress * 0.5) // Gradually shrink
        };
      })
    );
    
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (trigger) {
      startConfetti();
    }
  }, [trigger]);

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3"
              style={{
                backgroundColor: piece.color,
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                transform: `translate(-50%, -50%) rotate(${piece.rotation}deg) scale(${piece.scale})`,
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 - (Date.now() - (startTimeRef.current || 0)) / duration }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Specialized celebration components
export function CelebrationBurst({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  return (
    <ConfettiEffects
      trigger={trigger}
      intensity="heavy"
      duration={2000}
      colors={['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1']}
      onComplete={onComplete}
    />
  );
}

export function AchievementUnlock({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  return (
    <ConfettiEffects
      trigger={trigger}
      intensity="medium"
      duration={2500}
      colors={['#FFD700', '#FFA500', '#32CD32', '#4169E1', '#9370DB']}
      onComplete={onComplete}
    />
  );
}

export function MilestoneCelebration({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  return (
    <ConfettiEffects
      trigger={trigger}
      intensity="massive"
      duration={4000}
      colors={['#FF1744', '#F50057', '#D500F9', '#651FFF', '#3D5AFE', '#2979FF', '#00B0FF', '#00E5FF', '#1DE9B6', '#76FF03']}
      onComplete={onComplete}
    />
  );
}

// Fireworks effect for major achievements
export function FireworksEffect({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      const newFireworks = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: 20 + (i * 15), // Spread across the screen
        y: 20 + Math.random() * 30
      }));
      
      setFireworks(newFireworks);
      setIsActive(true);
      
      setTimeout(() => {
        setIsActive(false);
        setFireworks([]);
        if (onComplete) onComplete();
      }, 3000);
    }
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {fireworks.map((fw) => (
            <ConfettiEffects
              key={fw.id}
              trigger={true}
              intensity="light"
              duration={2000}
              colors={['#FF1744', '#F50057', '#FFD700', '#00E5FF', '#76FF03']}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Sparkle effect for subtle celebrations
export function SparkleEffect({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      const newSparkles = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100
      }));
      
      setSparkles(newSparkles);
      setIsActive(true);
      
      setTimeout(() => {
        setIsActive(false);
        setSparkles([]);
        if (onComplete) onComplete();
      }, 1500);
    }
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {sparkles.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              className="absolute w-2 h-2"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180]
              }}
              transition={{ 
                duration: 1.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
