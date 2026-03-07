import React, { useRef, useEffect, useState } from 'react';

interface CircularDialProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  values: (string | number)[];
}

export default function CircularDial({
  value,
  onChange,
  label,
  unit = '',
  values,
}: CircularDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [displayDeg, setDisplayDeg] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);

  const currentIndex = Math.max(0, values.indexOf(value));
  const anglePerStep = 360 / values.length;
  const currentAngle = currentIndex * anglePerStep;

  useEffect(() => {
    // initialize visual rotation to current value once
    setRotationDeg(currentAngle);
    setDisplayDeg(currentAngle);
    // we intentionally do not re-sync on later prop changes so the dial
    // can be rotated freely; numeric value is still clamped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    setStartAngle(angle);
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let deltaAngle = angle - startAngle;
    // normalize deltaAngle to [-PI, PI]
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    const deltaDeg = (deltaAngle * 180) / Math.PI;

    setRotationDeg((prevRot) => {
      const newRot = prevRot + deltaDeg;
      const stepPos = Math.round(newRot / anglePerStep);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, stepPos));
      // while dragging, reflect finger movement immediately
      setDisplayDeg(newRot);
      if (clampedIndex !== currentIndex) {
        // defer parent update to avoid setState during render
        Promise.resolve().then(() => {
          try { onChange(values[clampedIndex] as number); } catch (e) {}
          try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(8); } catch (e) {}
        });
      }
      return newRot;
    });

    setStartAngle(angle);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // snap to nearest step when releasing
    setRotationDeg((prevRot) => {
      const stepPos = Math.round(prevRot / anglePerStep);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, stepPos));
      const snappedDeg = stepPos * anglePerStep;
      setDisplayDeg(snappedDeg);
      // sync rotation to snapped angle
      Promise.resolve().then(() => {
        try { if (clampedIndex !== currentIndex) onChange(values[clampedIndex] as number); } catch (e) {}
        try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(10); } catch (e) {}
      });
      return snappedDeg;
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      // preventDefault may be disallowed if the listener is passive; only
      // call when the event is cancelable to avoid console errors.
      if (e.cancelable) e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, startAngle, currentIndex, anglePerStep, values, onChange]);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={dialRef}
        className="relative w-24 h-24 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' as any }}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.cancelable) e.preventDefault();
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg border-2 border-zinc-700" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          <g transform={`rotate(${displayDeg},50,50)`}>
            {values.map((_, index) => {
              const angle = (index * anglePerStep - 90) * (Math.PI / 180);
              const x1 = 50 + 36 * Math.cos(angle);
              const y1 = 50 + 36 * Math.sin(angle);
              const x2 = 50 + 42 * Math.cos(angle);
              const y2 = 50 + 42 * Math.sin(angle);
              const isActive = index === currentIndex;
              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isActive ? '#ef4444' : '#52525b'}
                  strokeWidth={isActive ? '2.2' : '1'}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>

        <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-600" />
        </div>
      </div>
    </div>
  );
}
