import React, { useMemo } from 'react';

export const FloatingParticles: React.FC = () => {
  const orbs = useMemo(() => {
    return [
      { id: 1, left: '15%', top: '10%', size: '360px', color: 'bg-emerald-500/10' },
      { id: 2, left: '85%', top: '15%', size: '420px', color: 'bg-purple-500/10' },
      { id: 3, left: '50%', top: '50%', size: '500px', color: 'bg-purple-600/10' },
      { id: 4, left: '20%', top: '80%', size: '380px', color: 'bg-amber-400/10' },
    ];
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {orbs.map(orb => (
        <div
          key={orb.id}
          className={`absolute rounded-full blur-[120px] pointer-events-none ${orb.color}`}
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      {/* Subtle grid pattern overlay for modern aesthetic */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
