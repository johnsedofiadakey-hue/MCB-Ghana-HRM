import React from 'react';
import { ShieldCheck, User, Globe, Briefcase } from 'lucide-react';
import { getSafeAvatarUrl } from '../../utils/avatar';
import { getLogoUrl } from '../../utils/logo';
import { useTheme } from '../../context/ThemeContext';

const EmployeeIDCard = ({ employee }: { employee: any }) => {
    const { settings } = useTheme();
    if (!employee) return null;

    return (
        <div id="id-card-print-zone" className="hidden print:block bg-white text-slate-900 p-0 m-0 overflow-hidden" style={{ width: '85.6mm', height: '53.98mm' }}>
             <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    #id-card-print-zone, #id-card-print-zone * { visibility: visible; }
                    #id-card-print-zone {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            ` }} />
            
            <div className="w-full h-full border border-slate-200 relative overflow-hidden flex flex-col">
                {/* ID Header */}
                <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) && (
                            <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="" className="w-6 h-6 object-contain invert brightness-0" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">
                            {settings?.companyName || 'MCB HRM'}
                        </span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Identity Card</span>
                </div>

                <div className="flex-1 flex p-4 gap-4 bg-gradient-to-br from-white to-slate-50">
                    <div className="w-24 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 shadow-sm">
                        <img 
                            src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                        />
                    </div>

                    <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="mb-2">
                            <h2 className="text-[14px] font-black text-slate-900 uppercase leading-none truncate mb-1">{employee.fullName}</h2>
                            <p className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-tight truncate">{employee.jobTitle}</p>
                        </div>

                        <div className="space-y-1.5 mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Employee ID</span>
                                <span className="text-[9px] font-black text-slate-700">{employee.employeeCode || `ID-${employee.id.slice(0, 8).toUpperCase()}`}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                                <span className="text-[9px] font-bold text-slate-700 truncate">{employee.department || employee.departmentObj?.name || 'GH Operations'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="h-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-4">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={8} className="text-emerald-600" />
                        <span className="text-[6px] font-black uppercase tracking-widest text-emerald-600">Verified Personnel</span>
                    </div>
                    <span className="text-[6px] font-black text-slate-300">MCB-GHANA-HRM</span>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-12 right-0 w-24 h-24 bg-slate-900/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            </div>
        </div>
    );
};

export default EmployeeIDCard;
