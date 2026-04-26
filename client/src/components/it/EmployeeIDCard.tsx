import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../utils/cn';
import { Shield, Mail, Phone, MapPin, Fingerprint } from 'lucide-react';

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
  };
}

const EmployeeIDCard: React.FC<EmployeeIDCardProps> = ({ employee, organization }) => {
  const primaryColor = organization.primaryColor || '#4F46E5';

  return (
    <div className="flex flex-col gap-10 items-center bg-gray-50 p-10 min-h-screen font-sans">
      {/* FRONT SIDE */}
      <div 
        id="id-card-front"
        className="relative w-[340px] h-[520px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-200"
        style={{ printColorAdjust: 'exact' } as any}
      >
        {/* Header Wave */}
        <div 
          className="absolute top-0 left-0 w-full h-[180px]"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center pt-8 px-6 text-center">
          {/* Logo */}
          <div className="h-10 mb-8 flex items-center justify-center">
            {organization.logoUrl ? (
              <img src={organization.logoUrl} alt="Logo" className="h-full object-contain" />
            ) : (
              <span className="text-white font-black text-xl tracking-tighter uppercase italic">{organization.name}</span>
            )}
          </div>

          {/* Photo */}
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                   <span className="text-4xl font-black text-white">{employee.fullName[0]}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 right-0 bg-white p-1.5 rounded-full shadow-lg">
                <Shield size={16} style={{ color: primaryColor }} />
            </div>
          </div>

          {/* Name & Title */}
          <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase mb-1">{employee.fullName}</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: primaryColor }}>
            {employee.jobTitle}
          </p>

          <div className="w-12 h-1 bg-gray-100 rounded-full mb-6" />

          {/* Dept & Code */}
          <div className="space-y-2 w-full">
            <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Department</span>
                <span className="text-xs font-bold text-gray-700 uppercase">{employee.departmentObj?.name || 'CENTRAL HUB'}</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Employee ID</span>
                <span className="text-xs font-mono font-black text-gray-900">{employee.employeeCode || 'NEX-000'}</span>
            </div>
          </div>

          {/* Footer QR */}
          <div className="absolute bottom-8 flex flex-col items-center">
             <div className="p-2 bg-white rounded-xl shadow-md border border-gray-100">
                <QRCodeSVG value={`EMP:${employee.employeeCode}|${employee.fullName}`} size={60} />
             </div>
             <p className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Identity Verified</p>
          </div>
        </div>
      </div>

      {/* BACK SIDE */}
      <div 
        id="id-card-back"
        className="relative w-[340px] h-[520px] bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden text-white"
        style={{ printColorAdjust: 'exact' } as any}
      >
        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />
        
        <div className="p-10 flex flex-col items-center text-center h-full">
            <Fingerprint size={40} className="mb-10 opacity-20" />
            
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 italic">
                Terms of Use
            </h3>
            
            <p className="text-[9px] leading-relaxed text-gray-400 mb-10">
                This identity card remains the property of <strong>{organization.name}</strong>. 
                If found, please return to the nearest police station or the address below. 
                Unauthorized use of this card is strictly prohibited and may lead to prosecution.
            </p>

            <div className="w-full space-y-6 text-left border-t border-white/5 pt-8">
                <div className="flex items-start gap-4">
                    <MapPin size={14} className="text-gray-500 mt-1" />
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Corporate Address</p>
                        <p className="text-[10px] font-bold text-gray-300">{organization.address || 'MCB Ghana Corporate HQ, Accra'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <Mail size={14} className="text-gray-500 mt-1" />
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Support Contact</p>
                        <p className="text-[10px] font-bold text-gray-300">{employee.email}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <Phone size={14} className="text-gray-500 mt-1" />
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Emergency Line</p>
                        <p className="text-[10px] font-bold text-gray-300">{employee.contactNumber || '+233 00 000 0000'}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto">
                <p className="text-[12px] font-black tracking-tighter uppercase italic opacity-40">{organization.name}</p>
            </div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-front, #id-card-front * { visibility: visible; }
          #id-card-front { 
            position: absolute; 
            left: 0; 
            top: 0; 
            margin: 0; 
            box-shadow: none; 
            border: none;
            width: 3.375in;
            height: 2.125in;
          }
          /* Layout adjustments for landscape printing if needed, or keeping it portrait */
        }
      `}</style>
    </div>
  );
};

export default EmployeeIDCard;
