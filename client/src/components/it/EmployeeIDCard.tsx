import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../utils/cn';
import { Shield, Mail, Phone, MapPin, Fingerprint, Globe, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmployeeIDCardProps {
  employee: {
    fullName: string;
    jobTitle: string;
    departmentObj?: { name: string };
    employeeCode: string;
    avatarUrl?: string;
    email: string;
    contactNumber?: string;
    bloodGroup?: string;
  };
  organization: {
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    address?: string;
    idCardPrimaryColor?: string;
    idCardAccentColor?: string;
    idCardShowLogo?: boolean;
    idCardShowQrCode?: boolean;
    idCardOrientation?: 'VERTICAL' | 'HORIZONTAL';
    idCardTheme?: 'LIGHT' | 'DARK' | 'PRISTINE';
    idCardBackMessage?: string;
    idCardSecurityText?: string;
  };
}

const EmployeeIDCard: React.FC<EmployeeIDCardProps> = ({ employee, organization }) => {
  const primaryColor = organization.idCardPrimaryColor || organization.primaryColor || '#4F46E5';
  const accentColor = organization.idCardAccentColor || '#F59E0B';
  const showLogo = organization.idCardShowLogo ?? true;
  const showQr = organization.idCardShowQrCode ?? true;
  const orientation = organization.idCardOrientation || 'VERTICAL';
  const theme = organization.idCardTheme || 'DARK';
  const isDark = theme === 'DARK';
  const isPristine = theme === 'PRISTINE';

  const isVertical = orientation === 'VERTICAL';
  
  const txtPrimary = isPristine ? 'text-slate-900' : (isDark ? 'text-white' : 'text-slate-900');
  const txtSecondary = isPristine ? 'text-slate-600' : (isDark ? 'text-white/60' : 'text-slate-600');
  const txtMuted = isPristine ? 'text-slate-400' : (isDark ? 'text-white/30' : 'text-slate-400');
  const glassBg = isPristine ? 'bg-slate-100/50' : (isDark ? 'bg-white/5' : 'bg-slate-900/5');
  const glassBorder = isPristine ? 'border-slate-200' : (isDark ? 'border-white/10' : 'border-slate-900/10');

  return (
    <div className="flex flex-col gap-12 items-center py-8 px-4 font-display selection:bg-white/20">
      
      {/* ── FRONT SIDE: THE BILLION DOLLAR VIEW ─────────────────────────── */}
      <motion.div 
        id="id-card-front"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden border group transition-all duration-700",
          isVertical ? "w-[340px] h-[520px]" : "w-[520px] h-[340px]",
          isPristine ? "border-slate-200" : (isDark ? "border-white/10" : "border-slate-200")
        )}
        style={{ 
          background: isPristine 
            ? '#ffffff'
            : (isDark 
                ? `linear-gradient(135deg, ${primaryColor} 0%, #000000 100%)` 
                : `linear-gradient(135deg, ${primaryColor}22 0%, #ffffff 100%)`),
          printColorAdjust: 'exact' 
        } as any}
      >
        {/* Elite Background: Mesh Gradient Engine */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {isPristine ? (
               <>
                 <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] opacity-80" />
                 <div className="absolute top-0 left-0 w-2 h-full bg-[var(--primary)] opacity-40" />
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full blur-3xl" />
                 <div className="absolute top-1/4 -right-16 w-64 h-64 border-8 border-[var(--primary)]/5 rounded-full" />
               </>
            ) : (
              <div 
                className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] opacity-40 blur-[80px] animate-pulse"
                style={{ 
                  background: `radial-gradient(circle at 20% 30%, ${primaryColor} 0%, transparent 50%), 
                               radial-gradient(circle at 80% 70%, ${accentColor} 0%, transparent 50%)` 
                }}
              />
            )}
            {/* Subtle Geometric Overlay */}
            <div className="absolute inset-0 opacity-[0.03] grayscale" style={{ backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>

        {/* Safe Zone Boundary - Visible in non-print preview */}
        <div className="absolute inset-4 border-2 border-dashed border-[var(--primary)]/10 rounded-[1.8rem] z-50 pointer-events-none print:hidden flex items-center justify-center">
            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-[var(--primary)] opacity-20 absolute top-2">CR80 Standard: 85.6mm × 54.0mm</span>
            <span className="text-[6px] font-black uppercase tracking-[0.4em] text-[var(--primary)] opacity-10 absolute bottom-2">Content Safe Zone</span>
        </div>

        {/* Holographic Security Overlay (Reacts to Hover) */}
        <div className="absolute inset-0 z-50 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-1000 mix-blend-overlay bg-gradient-to-tr from-rose-500 via-emerald-500 to-sky-500 animate-gradient-xy" />

        {/* Content Architecture */}
        <div className={cn(
            "relative z-10 h-full flex",
            isVertical ? "flex-col items-center text-center p-8" : "flex-row items-center p-10 pt-12"
        )}>
          
          {/* Header/Side Branding */}
          <div className={cn(
            "flex shrink-0 z-20",
            isVertical ? "flex-col items-center mb-8" : "absolute top-8 left-8 right-8 flex-row items-center justify-between"
          )}>
             <div className="flex items-center gap-3">
               {showLogo && organization.logoUrl && (
                  <img src={organization.logoUrl} alt="Logo" className={cn("object-contain", isVertical ? "h-10" : "h-9")} />
               )}
               <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    {!organization.logoUrl && <Hexagon size={isVertical ? 20 : 16} style={{ color: accentColor }} fill={accentColor} fillOpacity={0.2} />}
                    <span className={cn("font-black tracking-tighter uppercase italic", isVertical ? "text-lg" : "text-sm", txtPrimary)}>{organization.name}</span>
                  </div>
                  {!isVertical && (
                    <p className={cn("text-[7px] font-black uppercase tracking-[0.3em] opacity-40", txtMuted)}>ID System</p>
                  )}
               </div>
             </div>
             {!isVertical && (
                <div className="flex items-center gap-2">
                   <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                       <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Status</span>
                   </div>
                </div>
             )}
          </div>

          {/* Portrait Architecture */}
          <div className={cn(
            "relative shrink-0",
            isVertical ? "mb-8" : ""
          )}>
            <div className="relative group/photo">
                <div 
                    className="w-36 h-36 rounded-[2.5rem] border-[6px] border-white/5 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-md relative z-10"
                >
                    {employee.avatarUrl ? (
                        <img src={employee.avatarUrl} alt={employee.fullName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                            <span className="text-5xl font-black text-white/20 italic">{employee.fullName[0]}</span>
                        </div>
                    )}
                </div>
                {/* Visual Accent Ring */}
                <div 
                    className="absolute -inset-2 rounded-[2.8rem] opacity-20 blur-md animate-pulse z-0"
                    style={{ background: primaryColor }}
                />
            </div>
          </div>

          {/* Identity Detail Stack */}
          <div className={cn(
            "flex-1 flex flex-col justify-center",
            isVertical ? "items-center w-full" : "items-start border-l border-white/10 pl-10"
          )}>
            <h2 className={cn(
                "font-black leading-none uppercase italic tracking-tighter mb-3",
                isVertical ? "text-2xl" : "text-3xl",
                txtPrimary
            )}>{employee.fullName}</h2>
            
            <div className={cn(
                "px-4 py-2 rounded-full mb-6 inline-flex items-center gap-2 border",
                isVertical ? glassBg : "bg-[var(--primary)]/10",
                glassBorder
            )}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap", txtPrimary)}>
                    {employee.jobTitle}
                </p>
            </div>

            {/* Grid Metadata */}
            <div className={cn(
                "grid gap-x-8 gap-y-4 w-full",
                isVertical ? "grid-cols-2 text-center" : "grid-cols-2 text-left"
            )}>
                <div>
                    <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-1 opacity-50", txtMuted)}>Dept</span>
                    <span className={cn("text-[10px] font-bold uppercase", txtSecondary)}>{employee.departmentObj?.name || 'Operations'}</span>
                </div>
                <div>
                    <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-1 opacity-50", txtMuted)}>Card ID</span>
                    <span className={cn("text-[10px] font-mono font-black tracking-widest", txtPrimary)}>{employee.employeeCode || 'MCB-000'}</span>
                </div>
            </div>
          </div>

          {/* Biometric Gateway (QR) */}
          <div className={cn(
             "shrink-0",
             isVertical ? "mt-auto" : "absolute bottom-8 right-8"
          )}>
             {showQr && (
                <div className="flex flex-col items-center gap-3">
                   <div className="p-3 bg-white rounded-[1.5rem] shadow-2xl relative group-hover:scale-110 transition-transform duration-500">
                      <QRCodeSVG 
                        value={`AGENT_ID:${employee.employeeCode}|NAME:${employee.fullName}|ORG:${organization.name}`} 
                        size={isVertical ? 64 : 56} 
                        level="H"
                        includeMargin={false}
                        fgColor="#0f172a"
                      />
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Global Branding Strip */}
        <div className="absolute bottom-0 left-0 w-full h-1.5 overflow-hidden flex">
            <div className="flex-1 h-full" style={{ backgroundColor: primaryColor }} />
            <div className="w-1/3 h-full" style={{ backgroundColor: accentColor }} />
        </div>
      </motion.div>

      {/* ── BACK SIDE: THE INSTITUTIONAL VIEW ─────────────────────────── */}
      <motion.div 
        id="id-card-back"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative rounded-[2.5rem] shadow-2xl overflow-hidden border transition-all duration-700",
          isVertical ? "w-[340px] h-[520px]" : "w-[520px] h-[340px]",
          isPristine ? "bg-white text-slate-900 border-slate-200" : "bg-[#080c16] text-white border-white/5"
        )}
        style={{ printColorAdjust: 'exact' } as any}
      >
        {/* Safe Zone Boundary */}
        <div className={cn("absolute inset-4 border-2 border-dashed rounded-[1.8rem] z-50 pointer-events-none print:hidden", isPristine ? "border-slate-200" : "border-white/10")} />

        <div className="p-10 flex flex-col items-center text-center h-full relative z-10">
            <Fingerprint size={48} className={cn("mb-8", isPristine ? "text-slate-200" : "text-white/10")} />
            
            <h3 className={cn("text-[10px] font-black uppercase tracking-[0.4em] mb-8 italic", isPristine ? "text-slate-400" : "text-white/40")}>
                {organization.idCardSecurityText || 'Terms of Use'}
            </h3>
            
            <p className={cn("text-[10px] leading-relaxed mb-10 font-medium px-4", isPristine ? "text-slate-600" : "text-white/60")}>
                {organization.idCardBackMessage || (
                  <>
                    This Employee ID card belongs to <strong>{organization.name}</strong>. 
                    Unauthorized use, duplication, or possession by non-authorized personnel is subject to legal action. 
                    If found, please surrender to the nearest global transit hub or the authority listed below.
                  </>
                )}
            </p>

            <div className={cn("w-full space-y-6 text-left border-t pt-8", isPristine ? "border-slate-100" : "border-white/5")}>
                <div className="flex items-center gap-5">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", isPristine ? "bg-slate-50" : "bg-white/5")}>
                        <MapPin size={18} className={isPristine ? "text-slate-400" : "text-white/40"} />
                    </div>
                    <div>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isPristine ? "text-slate-300" : "text-white/30")}>HQ Deployment</p>
                        <p className={cn("text-xs font-bold", isPristine ? "text-slate-800" : "text-white/90")}>{organization.address || 'West Africa Operational Hub'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", isPristine ? "bg-slate-50" : "bg-white/5")}>
                        <Globe size={18} className={isPristine ? "text-slate-400" : "text-white/40"} />
                    </div>
                    <div>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isPristine ? "text-slate-300" : "text-white/30")}>Digital Axis</p>
                        <p className={cn("text-xs font-bold", isPristine ? "text-slate-800" : "text-white/90")}>mcb-hrm-ghana.web.app</p>
                    </div>
                </div>
            </div>

            <div className={cn("mt-auto flex items-center gap-2 opacity-30", isPristine ? "text-slate-400" : "text-white")}>
                <Shield size={14} />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase">MCB Institutional Security</p>
            </div>
        </div>

        {/* Dynamic Background Polish */}
        <div className={cn("absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full blur-[80px]", isPristine ? "bg-slate-100" : "bg-white/5")} />
        <div className={cn("absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full blur-[60px]", isPristine ? "bg-[var(--primary)]/5" : "bg-[var(--primary)]/5")} />
      </motion.div>

      {/* PRINT ENGINE ARCHITECTURE */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-front, #id-card-front *,
          #id-card-back, #id-card-back * { visibility: visible; }
          
          #id-card-front { 
            position: absolute; 
            left: 50%; 
            top: 20mm; 
            transform: translateX(-50%) !important;
            margin: 0; 
            box-shadow: none !important; 
            border: 0.5pt solid rgba(0,0,0,0.1);
            width: ${isVertical ? '2.125in' : '3.375in'};
            height: ${isVertical ? '3.375in' : '2.125in'};
            page-break-after: always;
            border-radius: 12pt;
          }

          #id-card-back {
            position: absolute;
            left: 50%;
            top: 110mm;
            transform: translateX(-50%) !important;
            margin: 0;
            box-shadow: none !important;
            border: 0.5pt solid rgba(0,0,0,0.1);
            width: ${isVertical ? '2.125in' : '3.375in'};
            height: ${isVertical ? '3.375in' : '2.125in'};
            border-radius: 12pt;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: portrait;
            margin: 0;
          }
        }

        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        .animate-gradient-xy {
          animation: gradient-xy 5s ease infinite;
          background-size: 400% 400%;
        }
      `}</style>
    </div>
  );
};

export default EmployeeIDCard;
