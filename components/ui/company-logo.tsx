import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CompanyLogo({ 
  logoUrl, 
  companyName = 'Company', 
  size = 'md', 
  className = '' 
}: CompanyLogoProps) {
  const [logoError, setLogoError] = useState(false);
  
  // Size mappings
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };
  
  const iconSizes = {
    sm: 18,
    md: 28,
    lg: 40
  };
  
  const containerClass = `flex-shrink-0 bg-white rounded-md p-2 shadow-sm ${sizeClasses[size]} flex items-center justify-center ${className}`;
  
  // Show icon placeholder if no logo or if logo fails to load
  if (!logoUrl || logoError) {
    return (
      <div className={containerClass} title={companyName}>
        <Briefcase className="text-primary/50" size={iconSizes[size]} />
      </div>
    );
  }
  
  return (
    <div className={containerClass} title={companyName}>
      <img 
        src={logoUrl} 
        alt={`${companyName} logo`} 
        className="max-h-full max-w-full object-contain"
        onError={() => setLogoError(true)}
      />
    </div>
  );
} 