import React from 'react';

const OceanBackground = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5">
      {/* Animated Wave Patterns */}
      <div className="absolute inset-0 opacity-30">
        <svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          
          {/* Wave Layer 1 */}
          <path
            d="M0,400 C300,300 600,500 900,400 C1050,350 1150,400 1200,380 L1200,800 L0,800 Z"
            fill="url(#waveGradient1)"
            className="wave-loading"
            style={{ animationDelay: '0s', animationDuration: '8s' }}
          />
          
          {/* Wave Layer 2 */}
          <path
            d="M0,500 C250,400 550,600 800,500 C950,450 1100,500 1200,480 L1200,800 L0,800 Z"
            fill="url(#waveGradient2)"
            className="wave-loading"
            style={{ animationDelay: '2s', animationDuration: '10s' }}
          />
        </svg>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-primary/20 rounded-full pulse-indicator" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-secondary/30 rounded-full pulse-indicator" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-accent/20 rounded-full pulse-indicator" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-10 w-2 h-2 bg-primary/15 rounded-full pulse-indicator" style={{ animationDelay: '3s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default OceanBackground;