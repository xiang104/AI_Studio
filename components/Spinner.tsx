
import React from 'react';

interface SpinnerProps {
  size?: string;
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = '8', color = 'border-white' }) => {
  return (
    <div className={`w-${size} h-${size} rounded-full animate-spin border-4 ${color} border-t-transparent`}></div>
  );
};

export default Spinner;
