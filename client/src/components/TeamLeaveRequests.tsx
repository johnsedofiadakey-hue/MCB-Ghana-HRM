import { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import api from '../services/api';
import { Check, X, Calendar, User } from 'lucide-react';

interface EmployeeRef {
  fullName?: string;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  employee?: EmployeeRef;
}

const TeamLeaveRequests = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/leave/pending');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
      await api.post('/leave/process', { id, action });
      // Remove from list immediately (optimistic update)
      setRequests((prev) => (Array.isArray(prev) ? prev : []).filter((r) => r.id !== id));
    } catch {
      toast.info("Failed to process request");
    }
  };

  if (loading) return <div className="p-4 text-slate-400">Checking for requests...</div>;

  return (
    <div className="space-y-4">
      {(requests || []).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-green-500" />
          </div>
          <h3 className="text-slate-800 font-bold">All caught up!</h3>
          <p className="text-slate-500 text-sm">No pending leave requests.</p>
        </div>
      ) : (
        (requests || []).map((req) => (
          <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">

            {/* Employee Info */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-lg">
                {req.employee?.fullName?.[0] || <User />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{req.employee?.fullName}</h3>
                <p className="text-slate-500 text-sm flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                </p>
                <div className="mt-2 bg-slate-50 px-3 py-1 rounded text-sm text-slate-600 inline-block">
                  "{req.reason}"
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => handleAction(req.id, 'REJECTED')}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors"
              >
                <X size={18} className="mr-2" /> Reject
              </button>
              <button
                onClick={() => handleAction(req.id, 'APPROVED')}
                className="flex-1 md:flex-none flex items-center justify-center px-6 py-2 bg-[var(--primary)] text-white font-bold rounded-lg hover:opacity-90 shadow-lg shadow-[var(--primary)]/20 transition-all"
              >
                <Check size={18} className="mr-2" /> Approve
              </button>
            </div>

          </div>
        ))
      )}
    </div>
  );
};

export default TeamLeaveRequests;