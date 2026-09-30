import { useEffect, useRef } from 'react';
import { RealtimeMatch } from '../services/realtimeMatchEngine';
import { input, InputState } from '../services/inputEngine';

interface UseGameLoopOptions {
  match: RealtimeMatch;
  onFrame: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, match: RealtimeMatch) => void;
  enabled?: boolean;
}

/**
 * Drives the 60FPS physics + render loop, decoupled from React re-renders.
 * Polls input, advances match physics, and calls `onFrame` to render.
 */
export function useGameLoop({ match, onFrame, enabled = true }: UseGameLoopOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);

  // Keep latest onFrame without restarting the loop
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const loop = () => {
      if (!running) return;

      const inp: InputState = input.poll();
      match.update(inp);

      onFrameRef.current(ctx, canvas, match);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [match, enabled]);

  return canvasRef;
}