import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  color?: string; // Tailwind color class e.g., 'text-sky-600'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text, color = 'text-sky-600' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center" aria-label={text || "Loading..."}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent ${color} border-solid`}
        style={{ borderTopColor: 'transparent' }} // Ensure border-t-transparent works
      ></div>
      {text && <p className={`mt-2 text-sm ${color.replace('text-', 'text-')}`}>{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
