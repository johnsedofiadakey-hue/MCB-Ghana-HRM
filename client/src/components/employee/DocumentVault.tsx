import React, { useState, useEffect, useRef } from 'react';
import { toast } from '../../utils/toast';
import { FileText, Download, Trash2, Upload, Loader2, Plus, X } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentVault({ employeeId, isAdmin }: { employeeId: string, isAdmin?: boolean }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get(`/documents/employee/${employeeId}`);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [employeeId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.post(`/documents/employee/${employeeId}`, {
          title: file.name,
          category: file.type.includes('image') ? 'ID' : file.type.includes('pdf') ? 'Certification' : 'Other',
          fileUrl: reader.result
        });
        fetchDocs();
      } catch (err) {
        toast.info('Upload failed');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocs();
    } catch (e) {
      toast.info('Delete failed');
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary-light" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <FileText size={18} className="text-primary-light" /> Document Vault
        </h3>
        {isAdmin && (
          <div>
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
            </motion.button>
          </div>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 text-center">
          <FileText size={40} className="mx-auto mb-4 text-slate-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {(docs || []).map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-6 rounded-3xl border border-white/[0.05] relative group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-light mb-4">
                  {doc.category === 'ID' ? <FileText size={20} /> : <FileText size={20} />}
                </div>
                <h4 className="text-sm font-bold text-white mb-1 truncate" title={doc.title}>{doc.title}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()} · {doc.category}</p>

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {doc.fileUrl.toLowerCase().includes('.pdf') && !doc.title.includes('[Signed]') && (
                     <button
                        onClick={async () => {
                           if (!window.confirm('Do you want to digitally sign this ' + doc.title + '? This will permanently embed your e-signature. Ensure your signature is configured in your profile.')) return;
                           try {
                               const res = await api.post(`/documents/${doc.id}/sign`);
                               toast.info('Document signed successfully!');
                               fetchDocs();
                               // Download the new one automatically
                               window.open(res.data.document.fileUrl, '_blank');
                           } catch (err: any) {
                               toast.info(err?.response?.data?.error || 'Failed to sign document');
                           }
                        }}
                        className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        title="Digitally Sign Document"
                     >
                        <FileText size={14} />
                     </button>
                  )}
                  <a href={doc.fileUrl} download={doc.title} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors" title="Download">
                    <Download size={14} />
                  </a>
                  {isAdmin && (
                    <button onClick={() => handleDelete(doc.id)} className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
