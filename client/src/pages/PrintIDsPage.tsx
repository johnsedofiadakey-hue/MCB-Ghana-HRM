import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BulkIDCardPrint from '../components/it/BulkIDCardPrint';
import { Loader2, ArrowLeft } from 'lucide-react';

const PrintIDsPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const idsStr = searchParams.get('ids');

    useEffect(() => {
        if (!idsStr) {
            setError('No personnel IDs provided for printing.');
            setLoading(false);
            return;
        }

        const fetchEmployees = async () => {
            try {
                const ids = idsStr.split(',');
                // Fetch each employee or use a bulk endpoint if available
                const promises = ids.map(id => api.get(`/employees/${id}`));
                const results = await Promise.all(promises);
                setEmployees(results.map(r => r.data));
            } catch (err) {
                console.error(err);
                setError('Failed to fetch personnel data for printing.');
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [idsStr]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
                <Loader2 size={48} className="animate-spin text-[var(--primary)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Preparing Identity Assets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white p-10">
                <p className="text-sm font-bold text-rose-500">{error}</p>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                    <ArrowLeft size={16} /> Return to Registry
                </button>
            </div>
        );
    }

    return <BulkIDCardPrint employees={employees} />;
};

export default PrintIDsPage;
