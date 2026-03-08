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

  // virtual position in steps (can go beyond bounds for visual rotation)
  const virtualPosRef = useRef<number>(0);
  // remember last logical index to detect changes
  const lastLogicalRef = useRef<number>(0);
  // last move sign for detecting reversal
  const lastMoveSignRef = useRef<number>(0);

  const currentIndex = Math.max(0, values.indexOf(value));
  const anglePerStep = 360 / values.length; // visual rotation per logical value
  const currentAngle = currentIndex * anglePerStep;
  const TICK_COUNT = 12; // fixed number of ticks to display
  const anglePerTick = 360 / TICK_COUNT;

  useEffect(() => {
    // initialize visual rotation to current value once
    setRotationDeg(currentAngle);
    setDisplayDeg(currentAngle);
    // initialize virtual pos and last logical
    virtualPosRef.current = currentIndex;
    lastLogicalRef.current = currentIndex;
    // we intentionally do not re-sync on later prop changes so the dial
    // can be rotated freely; numeric value is still clamped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDisplay = (v: string | number) => {
    if (typeof v === 'string') return v + (unit || '');
    const lab = String(label).toLowerCase();
    const isShutter = lab.includes('ss') || lab.includes('shutter') || lab.includes('sec');
    if (isShutter) {
      if (v >= 1) {
        // integer seconds -> show with double-quote unless unit provided
        const secStr = Number.isInteger(v) ? String(v) : String(v);
        return unit ? secStr + unit : secStr + '"';
      }
      // fractional seconds -> try to show as reciprocal (1/4, 1/8...)
      if (v > 0) {
        const recip = Math.round(1 / v);
        if (Math.abs(1 / v - recip) < 1e-6 && recip > 0 && recip <= 10000) {
          return `1/${recip}`;
        }
      }
      return String(v) + (unit || '');
    }
    return String(v) + (unit || '');
  };

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

    // compute delta in steps
    const deltaSteps = deltaDeg / anglePerStep;
    // update virtual position (float)
    virtualPosRef.current = virtualPosRef.current + deltaSteps;

    // update visual rotation (allow continuous rotation)
    const newRot = virtualPosRef.current * anglePerStep;
    setRotationDeg(newRot);
    setDisplayDeg(newRot);

    // determine candidate logical index
    const rawRounded = Math.round(virtualPosRef.current);
    const maxIndex = values.length - 1;
    let candidate = Math.max(0, Math.min(maxIndex, rawRounded));

    const moveSign = Math.sign(deltaSteps) || 0;
    // detect reversal when previously clamped
    if (lastLogicalRef.current === maxIndex && rawRounded > maxIndex && moveSign < 0) {
      // reversed after hitting max -> nudge virtual pos slightly inside so value steps immediately
      virtualPosRef.current = maxIndex - 0.6;
      candidate = maxIndex - 1;
    } else if (lastLogicalRef.current === 0 && rawRounded < 0 && moveSign > 0) {
      // reversed after hitting min -> nudge inside
      virtualPosRef.current = 0.6;
      candidate = 1;
    }

    // if within bounds normally, candidate will be proper
    if (candidate !== lastLogicalRef.current) {
      lastLogicalRef.current = candidate;
      // notify parent
      Promise.resolve().then(() => {
        try { onChange(values[candidate] as number); } catch (e) {}
        try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(8); } catch (e) {}
      });
    }

    // remember last move sign
    if (moveSign !== 0) lastMoveSignRef.current = moveSign;

    setStartAngle(angle);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // snap to nearest step when releasing
    // snap virtual position to nearest valid index and align visuals
    const maxIndex = values.length - 1;
    let snapIndex = Math.round(virtualPosRef.current);
    snapIndex = Math.max(0, Math.min(maxIndex, snapIndex));
    virtualPosRef.current = snapIndex;
    const snappedDeg = snapIndex * anglePerStep;
    setRotationDeg(snappedDeg);
    setDisplayDeg(snappedDeg);
    lastLogicalRef.current = snapIndex;
    Promise.resolve().then(() => {
      try { if (snapIndex !== currentIndex) onChange(values[snapIndex] as number); } catch (e) {}
      try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(10); } catch (e) {}
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
        className="relative w-32 h-32 cursor-grab active:cursor-grabbing select-none"
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
            {Array.from({ length: TICK_COUNT }).map((_, ti) => {
              const angle = (ti * anglePerTick - 90) * (Math.PI / 180);
              const x1 = 50 + 36 * Math.cos(angle);
              const y1 = 50 + 36 * Math.sin(angle);
              const x2 = 50 + 42 * Math.cos(angle);
              const y2 = 50 + 42 * Math.sin(angle);
              // map logical current position (or virtual pos) to tick index (0..TICK_COUNT-1)
              const virtualPos = virtualPosRef.current ?? currentIndex;
              // allow ISO mode to occupy 2 ticks per logical value
              const isIso = String(label).toLowerCase().includes('iso');
              const ticksPerValue = (TICK_COUNT / values.length) * (isIso ? 2 : 1);
              let tickIndex = Math.round(virtualPos * ticksPerValue);
              tickIndex = Math.max(0, Math.min(TICK_COUNT - 1, tickIndex));
              // use uniform gray ticks (no red active tick)
              const stroke = '#52525b';
              const strokeWidth = '1';
              return (
                <line
                  key={ti}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>

        <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-600">
            <span className="text-white text-lg font-semibold leading-none">{formatDisplay(values[currentIndex] ?? value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
