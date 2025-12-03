import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  gradient?: string;
  className?: string;
}

export default function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  gradient = 'from-primary to-primary/80',
  className,
}: QuickActionCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl',
        'bg-gradient-to-br',
        gradient,
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Icon className="w-7 h-7 text-white" />
        </div>
        
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/80">{description}</p>
        
        <div className="mt-4 flex items-center text-white/90 text-sm font-medium group-hover:translate-x-1 transition-transform">
          Get started →
        </div>
      </div>
    </Link>
  );
}
