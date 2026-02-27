import { useEffect, useRef } from 'react';

export const MorphingLight = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      
      gradient.addColorStop(0, `hsla(0, 73%, 42%, ${0.1 + Math.sin(time * 0.01) * 0.05})`); // DOT red
      gradient.addColorStop(0.3, `hsla(0, 73%, 42%, ${0.08 + Math.sin(time * 0.008) * 0.03})`);
      gradient.addColorStop(0.7, `hsla(0, 0%, 0%, ${0.05 + Math.sin(time * 0.006) * 0.02})`);
      gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create morphing light shapes
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Main morphing orb
      const orb1X = centerX + Math.sin(time * 0.005) * 100;
      const orb1Y = centerY + Math.cos(time * 0.007) * 80;
      const orb1Size = 150 + Math.sin(time * 0.003) * 50;
      
      const orbGradient = ctx.createRadialGradient(
        orb1X, orb1Y, 0,
        orb1X, orb1Y, orb1Size
      );
      orbGradient.addColorStop(0, `hsla(0, 73%, 52%, ${0.3 + Math.sin(time * 0.004) * 0.1})`);
      orbGradient.addColorStop(0.4, `hsla(15, 85%, 60%, ${0.2 + Math.sin(time * 0.003) * 0.08})`);
      orbGradient.addColorStop(1, 'hsla(0, 73%, 42%, 0)');
      
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(orb1X, orb1Y, orb1Size, 0, Math.PI * 2);
      ctx.fill();

      // Secondary morphing orb
      const orb2X = centerX + Math.sin(time * 0.008 + Math.PI) * 120;
      const orb2Y = centerY + Math.cos(time * 0.006 + Math.PI) * 100;
      const orb2Size = 100 + Math.sin(time * 0.004 + Math.PI/3) * 40;
      
      const orb2Gradient = ctx.createRadialGradient(
        orb2X, orb2Y, 0,
        orb2X, orb2Y, orb2Size
      );
      orb2Gradient.addColorStop(0, `hsla(0, 73%, 62%, ${0.25 + Math.sin(time * 0.005) * 0.08})`);
      orb2Gradient.addColorStop(0.5, `hsla(25, 90%, 65%, ${0.15 + Math.sin(time * 0.004) * 0.06})`);
      orb2Gradient.addColorStop(1, 'hsla(0, 73%, 42%, 0)');
      
      ctx.fillStyle = orb2Gradient;
      ctx.beginPath();
      ctx.arc(orb2X, orb2Y, orb2Size, 0, Math.PI * 2);
      ctx.fill();

      // Flowing light streaks
      for (let i = 0; i < 3; i++) {
        const streakX = centerX + Math.sin(time * 0.003 + i * Math.PI/1.5) * 200;
        const streakY = centerY + Math.cos(time * 0.004 + i * Math.PI/1.5) * 150;
        const streakLength = 80 + Math.sin(time * 0.002 + i) * 30;
        
        const streakGradient = ctx.createLinearGradient(
          streakX - streakLength, streakY,
          streakX + streakLength, streakY
        );
        streakGradient.addColorStop(0, 'hsla(0, 73%, 52%, 0)');
        streakGradient.addColorStop(0.5, `hsla(0, 73%, 52%, ${0.4 + Math.sin(time * 0.006 + i) * 0.2})`);
        streakGradient.addColorStop(1, 'hsla(0, 73%, 52%, 0)');
        
        ctx.fillStyle = streakGradient;
        ctx.fillRect(streakX - streakLength, streakY - 2, streakLength * 2, 4);
      }

      time += 1;
      animationId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ background: 'radial-gradient(circle at center, hsl(0, 0%, 5%) 0%, hsl(0, 0%, 0%) 100%)' }}
    />
  );
};