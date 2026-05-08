import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check, Download, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClear?: () => void;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
      }
    }
    
    // Resize handler
    const handleResize = () => {
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (parent) {
            const temp = canvas.toDataURL();
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                 ctx.lineCap = 'round';
                 ctx.lineJoin = 'round';
                 ctx.strokeStyle = '#000000';
                 ctx.lineWidth = 3;
                 const img = new Image();
                 img.src = temp;
                 img.onload = () => ctx.drawImage(img, 0, 0);
            }
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setIsEmpty(false);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        if (onClear) onClear();
      }
    }
  };

  const handleSave = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    if (canvas) {
        // Create a temporary canvas to trim whitespace and ensure transparency
        const data = canvas.toDataURL('image/png');
        onSave(data);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-3xl flex items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#000000]/40">Electronic Signature Pad</p>
        </div>
        <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-3xl bg-white overflow-hidden h-[200px] cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full touch-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <button
                onClick={clear}
                className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                title="Clear Signature"
            >
                <Trash2 size={16} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <AlertCircle size={12} className="text-[var(--text-muted)]" />
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Draw with precision</span>
            </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isEmpty}
          className={cn(
            "flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
            isEmpty 
                ? "bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed" 
                : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 hover:scale-105 active:scale-95"
          )}
        >
          <Check size={14} />
          Register Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
