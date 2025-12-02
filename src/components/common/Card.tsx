import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={cn('bg-card rounded-xl shadow-sm p-6', className)}>
      {children}
    </div>
  );
};

export default Card;
