import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Link as LinkIcon, Trash2, Plus, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export const ApiIntegrations = () => {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  
  // New Hook Form
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState('EMPLOYEE_CREATED,LEAVE_APPROVED');
  const [hookSecret, setHookSecret] = useState('');

  const [keyName, setKeyName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [keysRes, hooksRes] = await Promise.all([
        api.get('/integrations/keys'),
        api.get('/integrations/webhooks')
      ]);
      setKeys(keysRes.data);
      setWebhooks(hooksRes.data);
    } catch (err) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName) return toast.error('Key name required');
    try {
      const res = await api.post('/integrations/keys', { name: keyName });
      setNewKey(res.data.key);
      setKeyName('');
      fetchData();
      toast.success('App Key created successfully');
    } catch (err) {
      toast.error('Failed to create key');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Revoke this API Key immediately? Systems using it will fail.')) return;
    try {
      await api.delete(`/integrations/keys/${id}`);
      fetchData();
      toast.success('Key revoked');
    } catch (err) {
      toast.error('Failed to revoke key');
    }
  };

  const handleCreateWebhook = async () => {
    if (!hookUrl || !hookEvents) return toast.error('URL and Events required');
    try {
      await api.post('/integrations/webhooks', { url: hookUrl, events: hookEvents, secret: hookSecret });
      setHookUrl(''); setHookEvents('EMPLOYEE_CREATED,LEAVE_APPROVED'); setHookSecret('');
      fetchData();
      toast.success('Webhook registered');
    } catch (err) {
      toast.error('Failed to register webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await api.delete(`/integrations/webhooks/${id}`);
      fetchData();
      toast.success('Webhook deleted');
    } catch (err) {
      toast.error('Failed to delete webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) return <div className="p-10 flex items-center justify-center"><RefreshCw className="animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-12">
      {/* API Keys Section */}
      <section className="p-10 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 relative overflow-hidden">
        <div className="flex items-center gap-5 mb-8">
           <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
              <Key size={28} />
           </div>
           <div>
             <h4 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">API Application Keys</h4>
             <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Authenticate External Systems</p>
           </div>
        </div>

        {newKey && (
          <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl relative">
            <h5 className="text-green-600 font-bold mb-2 flex items-center gap-2"><CheckCircle size={16} /> Key Generated Successfully</h5>
            <p className="text-[12px] text-[var(--text-muted)] mb-4">Please copy this key immediately. You will not be able to see it again.</p>
            <div className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]">
              <code className="text-sm font-mono text-[var(--text-primary)] flex-1 overflow-x-auto">{newKey}</code>
              <button onClick={() => copyToClipboard(newKey!)} className="p-2 bg-[var(--primary)] text-white rounded-lg hover:scale-105 transition-all"><Copy size={16}/></button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-4 mb-8 p-6 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">New Key Name</label>
            <input 
              type="text" 
              placeholder="e.g. Zapier Integration"
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-2 transition-all"
            />
          </div>
          <button onClick={handleCreateKey} className="h-[44px] px-6 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
            <Plus size={16} /> Create Key
          </button>
        </div>

        <div className="space-y-4">
          {keys.map((k: any) => (
            <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all gap-4">
               <div>
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">{k.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono uppercase tracking-widest">
                    Last Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                  </p>
               </div>
               <button onClick={() => handleRevokeKey(k.id)} className="text-red-500 hover:text-red-700 bg-red-500/10 p-3 rounded-xl transition-colors shrink-0">
                  <Trash2 size={16} />
               </button>
            </div>
          ))}
          {keys.length === 0 && <p className="text-[12px] text-[var(--text-muted)] font-medium text-center py-6">No API keys active.</p>}
        </div>
      </section>

      {/* Webhooks Section */}
      <section className="p-10 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 relative overflow-hidden">
        <div className="flex items-center gap-5 mb-8">
           <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)]">
              <LinkIcon size={28} />
           </div>
           <div>
             <h4 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Outbound Webhooks</h4>
             <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">Real-time Event Triggers</p>
           </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-subtle)] mb-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">Endpoint URL</label>
            <input 
              type="text" 
              placeholder="https://hooks.zapier.com/..."
              value={hookUrl}
              onChange={e => setHookUrl(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[14px] font-mono py-2 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">Events (Comma Separated)</label>
            <input 
              type="text" 
              placeholder="EMPLOYEE_CREATED,LEAVE_APPROVED,PAYROLL_RUN_COMPLETED"
              value={hookEvents}
              onChange={e => setHookEvents(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[13px] font-mono py-2 transition-all"
            />
          </div>
          <div className="flex items-end gap-4">
             <div className="flex-1">
                <label className="block text-[10px] font-black text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">Signing Secret (Optional)</label>
                <input 
                  type="password" 
                  placeholder="HMAC Secret"
                  value={hookSecret}
                  onChange={e => setHookSecret(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[14px] font-mono py-2 transition-all"
                />
             </div>
             <button onClick={handleCreateWebhook} className="h-[44px] px-6 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                <Plus size={16} /> Register Webhook
             </button>
          </div>
        </div>

        <div className="space-y-4">
          {webhooks.map((h: any) => (
            <div key={h.id} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all flex items-start justify-between gap-4">
               <div className="flex-1 overflow-hidden">
                  <p className="text-[13px] font-mono font-bold text-[var(--text-secondary)] truncate">{h.url}</p>
                  <p className="text-[10px] text-[var(--primary)] mt-2 font-black uppercase tracking-widest">{h.events}</p>
               </div>
               <button onClick={() => handleDeleteWebhook(h.id)} className="text-red-500 hover:text-red-700 bg-red-500/10 p-3 rounded-xl transition-colors shrink-0">
                  <Trash2 size={16} />
               </button>
            </div>
          ))}
          {webhooks.length === 0 && <p className="text-[12px] text-[var(--text-muted)] font-medium text-center py-6">No webhooks registered.</p>}
        </div>
      </section>
    </div>
  );
};
