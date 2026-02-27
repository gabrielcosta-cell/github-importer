import { useEffect } from 'react';
import { MorphingLight } from '@/components/ui/morphing-light';

interface CelebrationAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
  customMusic?: string;
}

export const CelebrationAnimation = ({ isActive, onComplete, customMusic }: CelebrationAnimationProps) => {
  useEffect(() => {
    if (isActive) {
      // Create celebration container
      const celebrationContainer = document.createElement('div');
      celebrationContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 10000;
        background: hsl(227, 47%, 15%);
        animation: celebration-backdrop 6s ease-out;
      `;

      // Add MorphingLight component container
      const morphingContainer = document.createElement('div');
      morphingContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      `;
      celebrationContainer.appendChild(morphingContainer);

      // Add main content
      const mainContent = document.createElement('div');
      mainContent.style.cssText = `
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 20;
        text-align: center;
        animation: fade-in 1s ease-out;
      `;

      mainContent.innerHTML = `
        <div style="
          display: inline-flex;
          align-items: center;
          padding: 12px 24px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          margin-bottom: 16px;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 4px;
            right: 4px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            border-radius: 9999px;
          "></div>
          <span style="
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            font-weight: 300;
            position: relative;
            z-index: 10;
          ">✨ Contrato Assinado</span>
        </div>

        <h1 style="
          font-size: clamp(48px, 8vw, 144px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: white;
          margin-bottom: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <span style="font-style: italic; font-weight: 100;">Parabéns</span><br/>
          <span style="
            letter-spacing: -0.02em;
            color: hsl(0, 75%, 55%);
            font-weight: 900;
          ">VAMOOO$$</span>
        </h1>

        <p style="
          font-size: 12px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 16px auto;
          max-width: 400px;
        ">
          Mais um sucesso para a equipe! Continue assim e vamos dominar o mercado.
        </p>
      `;

      celebrationContainer.appendChild(mainContent);

      // Add buttons at bottom
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = `
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        z-index: 20;
        animation: fade-in 1.5s ease-out;
      `;

      buttonsContainer.innerHTML = `
        <button style="
          padding: 12px 32px;
          border-radius: 9999px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-weight: 400;
          font-size: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.5)'" 
           onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(255,255,255,0.3)'">
          Próximo Negócio
        </button>
        <button style="
          padding: 12px 32px;
          border-radius: 9999px;
          background: hsl(0, 75%, 55%);
          border: none;
          color: white;
          font-weight: 400;
          font-size: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        " onmouseover="this.style.background='hsl(0, 75%, 50%)'" 
           onmouseout="this.style.background='hsl(0, 75%, 55%)'">
          Continuar Vendendo
        </button>
      `;

      celebrationContainer.appendChild(buttonsContainer);

      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes celebration-backdrop {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fade-in {
          0% { 
            opacity: 0;
            transform: translate(-50%, -50%) translateY(20px);
          }
          100% { 
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0);
          }
        }
      `;
      document.head.appendChild(style);

      // Initialize MorphingLight effect manually
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      `;
      morphingContainer.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        let time = 0;
        const animateMorphing = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          // Main morphing orb with DOT colors
          const orb1X = centerX + Math.sin(time * 0.008) * 150;
          const orb1Y = centerY + Math.cos(time * 0.01) * 100;
          const orb1Size = 200 + Math.sin(time * 0.005) * 80;
          
          const orbGradient = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, orb1Size);
          orbGradient.addColorStop(0, `hsla(0, 75%, 55%, ${0.6 + Math.sin(time * 0.007) * 0.2})`);
          orbGradient.addColorStop(0.3, `hsla(227, 47%, 15%, ${0.4 + Math.sin(time * 0.005) * 0.15})`);
          orbGradient.addColorStop(1, 'hsla(0, 75%, 55%, 0)');
          
          ctx.fillStyle = orbGradient;
          ctx.beginPath();
          ctx.arc(orb1X, orb1Y, orb1Size, 0, Math.PI * 2);
          ctx.fill();
          
          // Secondary orb
          const orb2X = centerX + Math.sin(time * 0.006 + Math.PI) * 120;
          const orb2Y = centerY + Math.cos(time * 0.008 + Math.PI) * 80;
          const orb2Size = 150 + Math.sin(time * 0.007 + Math.PI) * 60;
          
          const orb2Gradient = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, orb2Size);
          orb2Gradient.addColorStop(0, `hsla(227, 47%, 15%, ${0.5 + Math.sin(time * 0.009) * 0.2})`);
          orb2Gradient.addColorStop(0.3, `hsla(0, 75%, 55%, ${0.3 + Math.sin(time * 0.006) * 0.15})`);
          orb2Gradient.addColorStop(1, 'hsla(227, 47%, 15%, 0)');
          
          ctx.fillStyle = orb2Gradient;
          ctx.beginPath();
          ctx.arc(orb2X, orb2Y, orb2Size, 0, Math.PI * 2);
          ctx.fill();
          
          time += 1;
          if (time < 360) { // 6 seconds at 60fps
            requestAnimationFrame(animateMorphing);
          }
        };
        animateMorphing();
      }

      document.body.appendChild(celebrationContainer);

      // Play custom audio or cash register sound
      try {
        if (customMusic && customMusic.trim()) {
          console.log('🎵 Starting custom music playback:', customMusic);
          const audio = new Audio(customMusic);
          audio.volume = 0.7;
          
          audio.onloadedmetadata = () => {
            console.log('✅ Audio metadata loaded - duration:', audio.duration, 'seconds');
          };
          
          audio.onerror = (e) => {
            console.error('❌ Audio loading error:', e);
            console.error('Audio error details:', audio.error);
            playCashRegisterSound();
          };
          
          audio.oncanplay = () => {
            console.log('✅ Audio can play - ready state:', audio.readyState);
          };
          
          audio.onplay = () => {
            console.log('🔊 Audio started playing successfully!');
          };
          
          audio.onpause = () => {
            console.log('⏸️ Audio paused');
          };
          
          audio.onended = () => {
            console.log('🏁 Audio playback ended');
          };
          
          // Try to play the audio
          console.log('🎯 Attempting to play audio...');
          audio.play().then(() => {
            console.log('✅ Audio.play() promise resolved - playback started');
          }).catch((error) => {
            console.error('❌ Audio.play() promise rejected:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Try to handle autoplay policy
            if (error.name === 'NotAllowedError') {
              console.log('🚫 Autoplay blocked - trying user interaction workaround');
              // Create a user-triggered event
              document.addEventListener('click', () => {
                audio.play().catch(e => console.error('Second attempt failed:', e));
              }, { once: true });
            } else {
              playCashRegisterSound();
            }
          });
          
          // Stop after 10 seconds or when it ends naturally
          setTimeout(() => {
            if (!audio.paused) {
              console.log('⏰ 10 seconds elapsed - stopping audio');
              audio.pause();
            }
          }, 10000);
        } else {
          console.log('🔔 No custom music - playing cash register sound');
          playCashRegisterSound();
        }
      } catch (error) {
        console.error('💥 Exception in audio playback:', error);
        playCashRegisterSound();
      }

      // Cash register sound (fallback)
      function playCashRegisterSound() {
        try {
          // @ts-ignore - webkitAudioContext for Safari compatibility
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContextClass();
          
          const playNote = (frequency: number, duration: number, delay: number = 0, type: OscillatorType = 'sine', volume: number = 0.1) => {
            setTimeout(() => {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
              oscillator.type = type;
              
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + duration);
            }, delay);
          };
          
          // Cash register "ka-ching" sound sequence
          playNote(200, 0.15, 0, 'sawtooth', 0.15);
          playNote(150, 0.1, 50, 'square', 0.12);
          playNote(1500, 0.3, 200, 'sine', 0.2);
          playNote(1800, 0.25, 220, 'sine', 0.15);
          playNote(300, 0.05, 400, 'square', 0.1);
          playNote(280, 0.05, 450, 'square', 0.08);
          playNote(320, 0.05, 500, 'square', 0.1);
          playNote(2000, 0.4, 600, 'triangle', 0.18);
          playNote(2400, 0.35, 620, 'sine', 0.15);
          
        } catch (error) {
          console.log('Cash register audio creation failed');
        }
      }

      // Clean up after 6 seconds
      setTimeout(() => {
        if (document.body.contains(celebrationContainer)) {
          document.body.removeChild(celebrationContainer);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
        onComplete?.();
      }, 6000);
    }
  }, [isActive, onComplete, customMusic]);

  return null;
};