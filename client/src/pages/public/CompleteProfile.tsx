import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Phone, MapPin, Heart, Briefcase, BookOpen, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface GreetData {
  id: string;
  fullName: string;
  email: string;
  jobTitle?: string;
  department?: string;
}

type FormState = {
  contactNumber: string;
  gender: string;
  maritalStatus: string;
  dob: string;
  nationalId: string;
  bloodGroup: string;
  nationality: string;
  address: string;
  ssnitNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranch: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  nextOfKinName: string;
  nextOfKinRelation: string;
  nextOfKinContact: string;
  education: string;
};

const EMPTY: FormState = {
  contactNumber: '', gender: '', maritalStatus: '', dob: '', nationalId: '',
  bloodGroup: '', nationality: 'Ghanaian', address: '', ssnitNumber: '',
  bankName: '', bankAccountNumber: '', bankBranch: '',
  emergencyContactName: '', emergencyContactPhone: '',
  nextOfKinName: '', nextOfKinRelation: '', nextOfKinContact: '',
  education: '',
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
      <span className="text-[var(--primary)]">{icon}</span>
      <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
    {children}
  </div>
);

const inp = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";
const sel = inp + " cursor-pointer";

export const CompleteProfile: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [greet, setGreet] = useState<GreetData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) { setLoadError('Invalid invite link.'); return; }
    api.get(`/onboard/profile-form/${token}`)
      .then(r => setGreet(r.data))
      .catch(e => setLoadError(e.response?.data?.error || 'This link is invalid or has expired.'));
  }, [token]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setSubmitError('');
    try {
      await api.patch(`/onboard/profile-form/${token}`, form);
      setStatus('success');
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
      setStatus('error');
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Link Unavailable</h2>
          <p className="text-sm text-[var(--text-secondary)]">{loadError}</p>
          <p className="mt-4 text-xs text-[var(--text-secondary)]">Please contact your HR team to request a new invite.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-xl">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Profile Submitted!</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Your profile is now under review by HR. You'll receive an email with login instructions once your account is activated.
          </p>
        </div>
      </div>
    );
  }

  if (!greet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-10)] mb-4">
            <User className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Complete Your Profile</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Welcome, <strong>{greet.fullName}</strong>
            {greet.jobTitle ? ` · ${greet.jobTitle}` : ''}
            {greet.department ? ` · ${greet.department}` : ''}
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Please fill in your details below. HR will review and activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">

          <Section icon={<User size={16} />} title="Personal Information">
            <Field label="Date of Birth">
              <input type="date" className={inp} value={form.dob} onChange={set('dob')} />
            </Field>
            <Field label="Gender">
              <select className={sel} value={form.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Marital Status">
              <select className={sel} value={form.maritalStatus} onChange={set('maritalStatus')}>
                <option value="">Select…</option>
                <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
              </select>
            </Field>
            <Field label="Blood Group">
              <select className={sel} value={form.bloodGroup} onChange={set('bloodGroup')}>
                <option value="">Select…</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Nationality">
              <input className={inp} value={form.nationality} onChange={set('nationality')} placeholder="Ghanaian" />
            </Field>
            <Field label="National ID Number">
              <input className={inp} value={form.nationalId} onChange={set('nationalId')} placeholder="GHA-XXXXXXXXX-X" />
            </Field>
          </Section>

          <Section icon={<Phone size={16} />} title="Contact & Address">
            <Field label="Phone Number">
              <input className={inp} value={form.contactNumber} onChange={set('contactNumber')} placeholder="+233 XX XXX XXXX" />
            </Field>
            <Field label="SSNIT Number">
              <input className={inp} value={form.ssnitNumber} onChange={set('ssnitNumber')} placeholder="SSNIT-XXXXXXXXX" />
            </Field>
            <Field label="Home Address" full>
              <textarea className={inp} rows={2} value={form.address} onChange={set('address')} placeholder="House No., Street, City, Region" />
            </Field>
          </Section>

          <Section icon={<Heart size={16} />} title="Emergency Contact & Next of Kin">
            <Field label="Emergency Contact Name">
              <input className={inp} value={form.emergencyContactName} onChange={set('emergencyContactName')} />
            </Field>
            <Field label="Emergency Contact Phone">
              <input className={inp} value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} />
            </Field>
            <Field label="Next of Kin Name">
              <input className={inp} value={form.nextOfKinName} onChange={set('nextOfKinName')} />
            </Field>
            <Field label="Next of Kin Relationship">
              <input className={inp} value={form.nextOfKinRelation} onChange={set('nextOfKinRelation')} placeholder="e.g. Spouse, Parent, Sibling" />
            </Field>
            <Field label="Next of Kin Contact">
              <input className={inp} value={form.nextOfKinContact} onChange={set('nextOfKinContact')} />
            </Field>
          </Section>

          <Section icon={<Briefcase size={16} />} title="Bank Details">
            <Field label="Bank Name">
              <input className={inp} value={form.bankName} onChange={set('bankName')} placeholder="e.g. GCB, Ecobank, Absa" />
            </Field>
            <Field label="Account Number">
              <input className={inp} value={form.bankAccountNumber} onChange={set('bankAccountNumber')} />
            </Field>
            <Field label="Branch">
              <input className={inp} value={form.bankBranch} onChange={set('bankBranch')} />
            </Field>
          </Section>

          <Section icon={<BookOpen size={16} />} title="Education">
            <Field label="Highest Qualification" full>
              <textarea className={inp} rows={3} value={form.education} onChange={set('education')} placeholder="e.g. BSc Computer Science – University of Ghana, 2018" />
            </Field>
          </Section>

          {submitError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {status === 'submitting' ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit My Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
