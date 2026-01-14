import React, { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface ParticleSystemProps {
  type: 'creation' | 'destruction' | 'flow' | 'ambient';
  x?: number;
  y?: number;
  count?: number;
  color?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  type,
  x = 0,
  y = 0,
  count = 20,
  color = '#00ff88',
  duration = 2000,
  onComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());

  const createParticles = useCallback(() => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = type === 'creation' ? 2 + Math.random() * 3 : 1 + Math.random() * 2;
      
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: duration / 16.67, // Convert to frames (60fps)
        size: type === 'ambient' ? 2 + Math.random() * 2 : 3 + Math.random() * 4,
        color,
        alpha: 1,
      });
    }
    
    return particles;
  }, [type, x, y, count, color, duration]);

  const updateParticles = useCallback((particles: Particle[]) => {
    return particles
      .map((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity for destruction effect
        if (type === 'destruction') {
          particle.vy += 0.2;
        }
        
        // Apply friction for ambient effect
        if (type === 'ambient') {
          particle.vx *= 0.99;
          particle.vy *= 0.99;
        }
        
        // Update life
        particle.life += 1;
        
        // Update alpha based on life
        particle.alpha = 1 - (particle.life / particle.maxLife);
        
        return particle;
      })
      .filter((particle) => particle.life < particle.maxLife);
  }, [type]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = particle.color;
      ctx.fill();
      
      ctx.restore();
    });
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Update particles
    particlesRef.current = updateParticles(particlesRef.current);
    
    // Draw particles
    drawParticles(ctx, particlesRef.current);
    
    // Check if animation is complete
    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed >= duration && particlesRef.current.length === 0) {
      onComplete?.();
      return;
    }
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [updateParticles, drawParticles, duration, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Initialize particles
    particlesRef.current = createParticles();
    startTimeRef.current = Date.now();
    
    // Start animation
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [createParticles, animate]);

  return (
    <canvas
      ref={canvasRef}
      className={`particle-system ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};
