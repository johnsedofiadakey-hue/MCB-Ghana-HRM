import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RefreshCcw, PenTool } from 'lucide-react';
import api from '../../services/api';

interface SignaturePadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (signatureData: string) => void;
}

const SignaturePadModal: React.FC<SignaturePadModalProps> = ({ isOpen, onClose, onSaved }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        clearCanvas();
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.getContext('2d')?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsEmpty(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        setIsEmpty(true);
    };

    const saveSignature = async () => {
        if (isEmpty || !canvasRef.current) return;
        setIsSaving(true);
        try {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            
            // Save to profile
            await api.post('/users/signature', { signatureUrl: dataUrl });
            
            onSaved(dataUrl);
            onClose();
        } catch (error) {
            console.error('Failed to save signature:', error);
            alert('Failed to save signature securely. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-subtle)]"
                    >
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                    <PenTool size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[var(--text-primary)]">Digital Signature</h3>
                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Capture your official e-signature for document endorsement.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="w-full bg-[var(--bg-elevated)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)] overflow-hidden relative touch-none">
                                {isEmpty && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] pointer-events-none">
                                        <PenTool size={32} className="mb-2 opacity-30" />
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Sign Here</p>
                                    </div>
                                )}
                                <canvas
                                    ref={canvasRef}
                                    width={450}
                                    height={200}
                                    className="w-full h-[200px] cursor-crosshair bg-white"
                                    onMouseDown={startDrawing}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onMouseMove={draw}
                                    onTouchStart={startDrawing}
                                    onTouchEnd={stopDrawing}
                                    onTouchMove={draw}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-[var(--bg-elevated)]/50 border-t border-[var(--border-subtle)] flex items-center justify-between">
                            <button
                                onClick={clearCanvas}
                                disabled={isEmpty || isSaving}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <RefreshCcw size={16} /> Clear
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveSignature}
                                    disabled={isEmpty || isSaving}
                                    className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 hover:bg-[var(--accent)] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Signature'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SignaturePadModal;
