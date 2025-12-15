import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  gradient?: boolean;
  animate?: boolean;
  showGlow?: boolean;
}

export default function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  gradient = true,
  animate = true,
  showGlow = true,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    if (animate) {
      // Animate progress on mount
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animate]);

  // Generate unique gradient ID to avoid conflicts
  const gradientId = `progressGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Glow effect */}
      {showGlow && animatedProgress > 0 && (
        <div 
          className="absolute inset-0 rounded-full opacity-20 blur-lg animate-pulse-glow"
          style={{
            background: `conic-gradient(from 0deg, hsl(var(--primary)) ${animatedProgress}%, transparent ${animatedProgress}%)`,
          }}
        />
      )}
      
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Gradient Definition */}
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(271, 81%, 56%)" />
            </linearGradient>
          </defs>
        )}
        
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-50"
        />
        
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradient ? `url(#${gradientId})` : 'hsl(var(--primary))'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: showGlow ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' : 'none',
          }}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
