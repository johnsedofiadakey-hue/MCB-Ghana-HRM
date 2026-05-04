import React from 'react';
import { ShieldCheck, User, Globe, Briefcase } from 'lucide-react';
import { getSafeAvatarUrl } from '../../utils/avatar';
import { getLogoUrl } from '../../utils/logo';
import { useTheme } from '../../context/ThemeContext';

const EmployeeIDCard = ({ employee }: { employee: any }) => {
    const { settings } = useTheme();
    if (!employee) return null;

    return (
    return (
        <div id="id-card-print-zone" className="hidden print:block bg-white text-slate-900 p-0 m-0 overflow-hidden" style={{ width: '85.6mm', height: '53.98mm', position: 'relative' }}>
             <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: 85.6mm 53.98mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    body * { 
                        visibility: hidden; 
                    }
                    #id-card-print-zone, #id-card-print-zone * { 
                        visibility: visible !important; 
                    }
                    #id-card-print-zone {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        display: block !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        z-index: 9999;
                    }
                }
            ` }} />
            
            <div className="w-full h-full border border-slate-200 relative overflow-hidden flex flex-col font-sans">
                {/* Accent Bar */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)] z-20" />
                
                {/* ID Header */}
                <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 0 L100 100 M100 0 L0 100" stroke="white" strokeWidth="0.1" />
                        </svg>
                    </div>
                    
                    <div className="flex items-center gap-3 relative z-10">
                        {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) && (
                            <div className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center">
                                <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[150px] leading-tight">
                                {settings?.companyName || 'MCB HRM'}
                            </span>
                            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-[0.3em]">Official Personnel</span>
                        </div>
                    </div>
                    <div className="text-right relative z-10">
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40">Identity Card</span>
                    </div>
                </div>

                <div className="flex-1 flex p-5 gap-6 bg-white relative">
                    {/* Background Decorative Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                        <svg width="100%" height="100%">
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="black" strokeWidth="0.5"/>
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="w-24 h-30 rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 flex-shrink-0 shadow-lg relative z-10">
                        <img 
                            src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                        />
                    </div>

                    <div className="flex-1 flex flex-col justify-center min-w-0 relative z-10">
                        <div className="mb-3">
                            <h2 className="text-[15px] font-black text-slate-900 uppercase leading-none truncate mb-1.5 tracking-tight">{employee.fullName}</h2>
                            <div className="flex items-center gap-2">
                                <div className="h-[2px] w-4 bg-[var(--primary)] rounded-full" />
                                <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest truncate">{employee.jobTitle}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Personnel ID</span>
                                <span className="text-[10px] font-black text-slate-800">{employee.employeeCode || `ID-${employee.id.slice(0, 8).toUpperCase()}`}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Deployment</span>
                                <span className="text-[9px] font-bold text-slate-700 truncate">{employee.department || employee.departmentObj?.name || 'Operations'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="h-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-6 relative overflow-hidden">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={10} className="text-emerald-600" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-emerald-700">Verified & Authorized</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                             <span className="text-[5px] font-black text-slate-300 uppercase tracking-widest">Digital Auth</span>
                             <span className="text-[7px] font-mono font-bold text-slate-400">#{employee.id.slice(0, 12).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                {/* Background Watermark */}
                <div className="absolute bottom-4 right-4 w-24 h-24 bg-slate-900 opacity-[0.02] rounded-full flex items-center justify-center pointer-events-none">
                     <Globe size={60} />
                </div>
            </div>
        </div>
    );
};

export default EmployeeIDCard;
