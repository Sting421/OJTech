"use client";
import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

interface HeroHeaderProps {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  imageSrc?: string;
  waveColor1?: string;
  waveColor2?: string;
  waveColor3?: string;
  waveColor4?: string;
  waveColor5?: string;
  waveColor6?: string;
  waveColor7?: string;
  waveColor8?: string;
  waveOpacityBase?: number;
  waveOpacityIncrement?: number;
  waveAmplitude?: number;
  waveSpeedMultiplier?: number;
}

const defaultProps: HeroHeaderProps = {
  title: 'Find Your Perfect <br /> Internship Match',
  subtitle: 'Our AI-powered matching connects you with relevant job opportunities that align with your skills and aspirations.',
  primaryButtonText: 'Explore Opportunities',
  primaryButtonUrl: '/opportunities',
  secondaryButtonText: 'Upload Resume',
  secondaryButtonUrl: '/profile',
  imageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
  // Dark theme colors with increasing opacity - no blue
  waveColor1: 'rgba(30, 30, 30, 0.1)',
  waveColor2: 'rgba(35, 35, 35, 0.13)',
  waveColor3: 'rgba(40, 40, 40, 0.16)',
  waveColor4: 'rgba(45, 45, 45, 0.19)',
  waveColor5: 'rgba(50, 50, 50, 0.22)',
  waveColor6: 'rgba(55, 55, 55, 0.25)',
  waveColor7: 'rgba(60, 60, 60, 0.28)',
  waveColor8: 'rgba(65, 65, 65, 0.31)',
  waveOpacityBase: 0.1,
  waveOpacityIncrement: 0.03,
  waveAmplitude: 40,
  waveSpeedMultiplier: 0.005,
};

export const HeroHeader = ({
  title,
  subtitle,
  primaryButtonText,
  primaryButtonUrl,
  secondaryButtonText,
  secondaryButtonUrl,
  imageSrc,
  waveColor1,
  waveColor2,
  waveColor3,
  waveColor4,
  waveColor5,
  waveColor6,
  waveColor7,
  waveColor8,
  waveOpacityBase,
  waveOpacityIncrement,
  waveAmplitude,
  waveSpeedMultiplier,
}: HeroHeaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let time = 0;

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);

      // dark base - pure black
      ctx.fillStyle = '#010915';
      ctx.fillRect(0, 0, width, height);

      // flowing waves
      const waveColors = [
        waveColor1,
        waveColor2,
        waveColor3,
        waveColor4,
        waveColor5,
        waveColor6,
        waveColor7,
        waveColor8,
      ];
      for (let i = 0; i < 8; i++) {
        const opacity = waveOpacityBase! + i * waveOpacityIncrement!;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin((x + time + i * 100) * waveSpeedMultiplier!) * waveAmplitude! + i * 20;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = waveColors[i] || `rgba(50, 50, 50, ${opacity})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      time += 1.5;
      requestAnimationFrame(drawBackground);
    }

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener('resize', onResize);
    drawBackground();

    return () => window.removeEventListener('resize', onResize);
  }, [
    waveColor1,
    waveColor2,
    waveColor3,
    waveColor4,
    waveColor5,
    waveColor6,
    waveColor7,
    waveColor8,
    waveOpacityBase,
    waveOpacityIncrement,
    waveAmplitude,
    waveSpeedMultiplier,
  ]);

  const handlePrimaryClick = () => {
    if (primaryButtonUrl && typeof primaryButtonUrl === 'string') {
      router.push(primaryButtonUrl);
    }
  };

  const handleSecondaryClick = () => {
    if (secondaryButtonUrl && typeof secondaryButtonUrl === 'string') {
      router.push(secondaryButtonUrl);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#010915] text-white">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-0"
      />

      <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-6 h-full">
        <div className="max-w-xl">
          <h1
            className="text-5xl font-bold leading-tight bg-gradient-to-r from-gray-200 via-white to-gray-300 text-transparent bg-clip-text animate-fade-in-up"
            dangerouslySetInnerHTML={{ __html: title! }}
          />
          <p className="mt-6 text-lg text-gray-300 animate-fade-in-up delay-200">
            {subtitle}
          </p>
          <div className="mt-8 flex gap-4 animate-fade-in-up delay-300">
            {primaryButtonText && (
              <Button 
                variant="default" 
                onClick={handlePrimaryClick}
                className="bg-white text-black hover:bg-gray-200"
              >
                {primaryButtonText}
              </Button>
            )}
            {secondaryButtonText && (
              <Button 
                variant="outline" 
                onClick={handleSecondaryClick}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {secondaryButtonText}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden md:block max-w-sm">
          <div
            className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl p-4 transform-gpu transition-transform duration-500 -rotate-6 shadow-lg"
          >
            <img
              src={imageSrc}
              alt="Hero Visual"
              className="w-full h-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

HeroHeader.defaultProps = defaultProps; 