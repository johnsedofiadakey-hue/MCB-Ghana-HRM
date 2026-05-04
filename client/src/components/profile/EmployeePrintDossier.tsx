import { Activity, Briefcase, Landmark, User, BookOpen, Heart, ShieldCheck, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { getSafeAvatarUrl } from '../../utils/avatar';
import { useTranslation } from 'react-i18next';
import { Building } from 'lucide-react';

const EmployeePrintDossier = ({ employee }: { employee: any }) => {
    const { settings, formatCurrency } = useTheme();
    const { t } = useTranslation();
    if (!employee) return null;

    const Section = ({ title, icon: Icon, children, className }: any) => (
        <div className={cn("py-8 border-b border-slate-100 last:border-0 break-inside-avoid", className)}>
            <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                    <Icon size={14} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">{title}</h3>
                </div>
            </div>
            {children}
        </div>
    );

    const InfoRow = ({ label, value, full, icon: Icon }: any) => (
        <div className={cn("flex flex-col gap-1 mb-4", full ? "col-span-2" : "col-span-1")}>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                {Icon && <Icon size={8} className="text-slate-300" />}
                {label}
            </span>
            <span className={cn(
                "text-[12px] font-medium text-slate-800 leading-tight",
                !value && "italic text-slate-300"
            )}>
                {value || 'Not Disclosed'}
            </span>
        </div>
    );

    const year = new Date().getFullYear();

    return (
    return (
        <div className="hidden print:block bg-white text-slate-900 p-0 m-0 min-h-screen relative overflow-hidden font-sans">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
                .print-dossier { font-family: 'Inter', sans-serif; padding: 60px; }
                .print-serif { font-family: 'Playfair Display', serif; }
                @media print {
                    @page { margin: 0; size: auto; }
                    body { margin: 0; padding: 0; }
                    .no-break { break-inside: avoid; }
                }
            ` }} />
            
            <div className="print-dossier">
            {/* Header / Brand Matrix */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-12 mb-12 relative z-10">
                <div className="flex gap-10 items-start">
                    {/* Branding */}
                    <div className="space-y-6">
                        {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) && (
                            <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="Logo" className="h-16 w-auto object-contain" />
                        )}
                        <div className="w-40 h-52 rounded-2xl overflow-hidden bg-slate-50 border-4 border-slate-100 shadow-xl">
                            <img 
                                src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} 
                                alt={employee.fullName} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    </div>

                    <div className="space-y-8 pt-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black tracking-[0.5em] text-slate-400 uppercase leading-none">Official Personnel Dossier</p>
                            <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none print-serif italic">{employee.fullName}</h1>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-3">
                                <Briefcase className="text-slate-400" size={18} />
                                <span className="text-xl font-bold text-slate-700">{employee.jobTitle}</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white px-4 py-2 bg-slate-900 rounded-xl">
                                {employee.employeeCode || `MEM-${employee.id.slice(0, 8).toUpperCase()}`}
                            </span>
                        </div>

                        {/* Professional Summary - NEW */}
                        <div className="max-w-xl">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <BookOpen size={12} className="text-[var(--primary)]" />
                                Professional Profile Summary
                            </p>
                            <p className="text-sm leading-relaxed text-slate-600 font-medium italic">
                                {employee.fullName} is a verified member of the {employee.department || employee.departmentObj?.name || 'Operations'} unit, 
                                currently serving as {employee.jobTitle}. Since joining on {new Date(employee.joinDate).toLocaleDateString(undefined, { dateStyle: 'long' })}, 
                                they have maintained a status of {employee.status}. This dossier contains the comprehensive professional, financial, 
                                and performance records as of {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-right space-y-6">
                    <div className="inline-flex flex-col items-end">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-50 border-2 border-emerald-500/20 text-emerald-700">
                            <ShieldCheck size={20} />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Authenticated</p>
                                <p className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">System Verified Record</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Generated On</p>
                        <p className="text-[13px] font-black text-slate-900">{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                        <p className="text-[9px] font-bold text-slate-400 opacity-60 uppercase tracking-widest mt-1">Ref: {employee.id.slice(0, 14).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Content Core */}
            <div className="grid grid-cols-2 gap-x-24 relative z-10">
                {/* 01: Identity Core */}
                <Section title="Personnel Identity" icon={User}>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                        <InfoRow label="Biological Gender" value={employee.gender} />
                        <InfoRow label="Birth Chronology" value={employee.dob ? new Date(employee.dob).toLocaleDateString([], { dateStyle: 'long' }) : 'N/A'} />
                        <InfoRow label="Region of Origin" value={employee.countryOfOrigin} icon={Globe} />
                        <InfoRow label="Nationality" value={employee.nationality} icon={Globe} />
                        <InfoRow label="Social Status" value={employee.maritalStatus} />
                        <InfoRow label="National ID" value={employee.nationalId} icon={ShieldCheck} />
                        <InfoRow label="Official Email" value={employee.email} icon={Mail} full />
                        <InfoRow label="Primary Contact" value={employee.contactNumber} icon={Phone} full />
                        <InfoRow label="Residential Address" value={employee.address} icon={MapPin} full />
                    </div>
                </Section>

                {/* 02: Deployment Matrix */}
                <Section title="Strategic Deployment" icon={Briefcase}>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                        <InfoRow 
                            label="Organizational Unit" 
                            value={employee.department || employee.departmentObj?.name || 'Central Operations'} 
                            icon={Building}
                        />
                        <InfoRow label="System Authority" value={employee.role} />
                        <InfoRow label="Engagement Model" value={employee.employmentType} />
                        <InfoRow label="Commission Date" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString([], { dateStyle: 'long' }) : 'N/A'} />
                        <InfoRow label="Primary Supervisor" value={employee.supervisor?.fullName || 'Internal Management'} full />
                        <InfoRow label="Reporting Protocol" value={employee.employeeReportingLines?.find((r: any) => !r.isPrimary)?.manager?.fullName || 'Standard Hierarchy'} full />
                    </div>
                </Section>

                {/* 03: Financial Protocol */}
                <Section title="Financial Remuneration" icon={Landmark}>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                        <InfoRow label="Base Compensation" value={formatCurrency(employee.salary || 0)} />
                        <InfoRow label="Banking Institution" value={employee.bankName} />
                        <InfoRow label="Account Identifier" value={employee.bankAccountNumber} />
                        <InfoRow label="Institutional Branch" value={employee.bankBranch} />
                        <InfoRow label="SSNIT Identification" value={employee.ssnitNumber} full />
                    </div>
                </Section>

                {/* 04: Emergency & Kinship */}
                <Section title="Emergency Protocol" icon={Heart}>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                        <InfoRow label="Next of Kin Designation" value={employee.nextOfKinName} />
                        <InfoRow label="Kinship Relation" value={employee.nextOfKinRelation} />
                        <InfoRow label="Kinship Contact" value={employee.nextOfKinContact} full />
                        <div className="col-span-2 pt-6 border-t border-slate-100 mt-2 space-y-4">
                             <div className="flex gap-12">
                                <InfoRow label="SOS Representative" value={employee.emergencyContactName} />
                                <InfoRow label="SOS Protocol Link" value={employee.emergencyContactPhone} />
                             </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Extended Dossier Data */}
            <div className="mt-12 relative z-10">
                {/* 05: Academic Portfolio */}
                <Section title="Academic & Certification Portfolio" icon={BookOpen}>
                    <div className="space-y-10">
                        <InfoRow label="Highest Academic Attainment" value={employee.education} full />
                        {employee.certifications && (
                            <div className="mt-8">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Verified Certifications</p>
                                <div className="grid grid-cols-2 gap-6">
                                {(() => {
                                    try {
                                        const certs = typeof employee.certifications === 'string' ? JSON.parse(employee.certifications) : employee.certifications;
                                        return Array.isArray(certs) && certs.length > 0 ? certs.map((c: any, i: number) => (
                                            <div key={i} className="flex flex-col p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/20">
                                                <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight mb-1">{c.name}</span>
                                                <span className="text-[10px] text-slate-500 font-bold">{c.authority} <span className="mx-2 opacity-30">|</span> Validated: {c.issueDate}</span>
                                            </div>
                                        )) : <p className="text-xs italic text-slate-400 pl-4">No certification records available in system.</p>;
                                    } catch { return null; }
                                })()}
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                {/* 06: Performance Intelligence */}
                <Section title="Performance Matrix & Growth" icon={Activity}>
                    <div className="space-y-12">
                        <div className="grid grid-cols-2 gap-24">
                            <div className="space-y-8">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b-2 border-slate-900 pb-3">Evaluation Chronology</p>
                                {employee.appraisalPackets?.length > 0 ? (
                                    <div className="space-y-5">
                                        {employee.appraisalPackets.filter((p: any) => p.status !== 'CANCELLED').slice(0, 5).map((packet: any) => {
                                            const score = packet.finalScore ?? (packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' || r.reviewStage === 'SUPERVISOR')?.overallRating || 0);
                                            return (
                                                <div key={packet.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{packet.cycle?.title}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{packet.cycle?.period} cycle</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {packet.finalScore != null && <span className="text-[8px] font-black text-[var(--primary)] bg-[var(--primary)]/5 border border-[var(--primary)]/20 px-2 py-0.5 rounded uppercase tracking-tighter">Arbitrated</span>}
                                                        <span className={cn("text-lg font-black tracking-tighter", score >= 80 ? "text-slate-900" : "text-slate-500")}>
                                                            {score > 0 || packet.status === 'COMPLETED' ? `${score}%` : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-400">No performance evaluations recorded yet.</p>
                                )}
                            </div>
                            <div className="space-y-8">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b-2 border-slate-900 pb-3">Strategic Goal Progress</p>
                                {employee.targetsAssignedToMe?.length > 0 ? (
                                    <div className="space-y-6">
                                        {employee.targetsAssignedToMe.slice(0, 5).map((target: any) => (
                                            <div key={target.id} className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate pr-6">{target.title}</span>
                                                    <span className="text-[11px] font-black text-slate-900 tracking-tighter">{Math.round(target.progress || 0)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-900" style={{ width: `${target.progress || 0}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-400">No strategic goals currently tracked.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Official Certification Footer */}
            <div className="mt-20 pt-12 border-t-4 border-slate-900 grid grid-cols-2 gap-24 relative z-10 no-break">
                <div className="space-y-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Official Certification & Sign-off</p>
                    <div className="space-y-4">
                        <div className="border-b-2 border-slate-900 w-full h-16 relative">
                             {/* Space for digital/physical stamp */}
                             <div className="absolute top-0 right-0 opacity-10">
                                <ShieldCheck size={40} />
                             </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Managing Director / HR Head</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Seal Required</p>
                        </div>
                        <p className="text-[8px] font-bold text-slate-300 uppercase italic tracking-widest leading-none">System ID Auth Reference: {employee.id.toUpperCase()}</p>
                    </div>
                </div>
                
                <div className="flex flex-col justify-end text-right space-y-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-relaxed">
                            This document is a confidential internal record and contains sensitive personal data. 
                            Unauthorized duplication or distribution is strictly prohibited under organizational security protocols.
                        </p>
                    </div>
                    <div className="pt-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        &copy; {year} {settings?.companyName}. All Rights Reserved.
                    </div>
                </div>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015] pointer-events-none">
                 {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) ? (
                    <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="" className="w-[800px] h-[800px] object-contain grayscale" />
                 ) : <Globe size={800} />}
            </div>
            </div>
        </div>
    );
};

export default EmployeePrintDossier;
