import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { 
  Shield, Zap, Fingerprint, BrainCircuit, ArrowUpRight, 
  X, Check, Focus, ArrowRight, Star, ChevronDown, 
  CheckCircle2, Sparkles, CreditCard, Smile, 
  Phone, Mail, Globe, Menu, Server, Lock, 
  LayoutDashboard, Activity, Database, Terminal, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { storage, StorageKey } from '../services/storage';
import { toast } from '../utils/toast';
import axios from 'axios';

const StormglideHome = () => {
  const [formStatus, setFormStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS'>('IDLE');
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDemoLaunch = () => {
    navigate('/login?demo=true');
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: 'How it Works', id: 'workflow' },
    { name: 'Security', id: 'security' },
    { name: 'Pricing', id: 'pricing' },
    { name: 'Company', id: 'company' }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-blue-600/10 selection:text-blue-700">
      
      {/* ── Top Header Info ── */}
      <div className="bg-blue-600 text-white py-2.5 px-6 text-center">
         <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
           <Sparkles size={14} className="animate-pulse" /> 
           <span>MCB HRM Ghana Platform v5.0 is now live</span>
           <button onClick={handleDemoLaunch} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full border border-white/20 transition-all font-black ml-2 uppercase">Try the Demo</button>
         </p>
      </div>

      {/* ── Navigation ── */}
      <nav className={cn(
        "fixed top-[37px] left-0 right-0 z-50 transition-all duration-500 px-6",
        scrolled ? "py-4 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm" : "py-8 bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 group-hover:-rotate-3 transition-transform">
               <Shield size={20} className="fill-white/20" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 italic">MCB<span className="text-blue-600">.</span></span>
          </div>
          
          <div className="hidden lg:flex items-center gap-12">
             {navLinks.map(l => (
               <button key={l.id} onClick={() => scrollTo(l.id)} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">{l.name}</button>
             ))}
             <button onClick={handleDemoLaunch} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all">Launch Playground</button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-blue-600 transition-colors">
             <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[100] bg-white p-10 flex flex-col"
          >
             <div className="flex items-center justify-between mb-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white"><Shield size={20}/></div>
                  <span className="font-black text-2xl tracking-tighter italic">MCB.</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400"><X size={32}/></button>
             </div>
             <div className="space-y-12 flex-1">
                {navLinks.map(l => (
                   <button key={l.id} onClick={() => scrollTo(l.id)} className="block text-4xl font-black uppercase italic tracking-tighter text-slate-900 hover:text-blue-600 transition-colors">{l.name}</button>
                ))}
             </div>
             <button onClick={handleDemoLaunch} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-200">Start Free Demo</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Section ── */}
      <section className="pt-52 pb-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-20">
           <div className="relative z-10">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                 <Focus size={14} /> The Enterprise HRM Ecosystem
              </motion.div>
              <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase italic mb-8">
                 Manage Your <br /> <span className="text-blue-600">Company Brain.</span>
              </h1>
              <p className="max-w-lg text-lg text-slate-400 font-medium leading-relaxed mb-12">
                 The MCB HRM Ghana Platform is a recursive enterprise shell designed to handle the complexities of modern teams—from automated payroll to AI-driven performance appraisals.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                 <button onClick={handleDemoLaunch} className="w-full sm:w-auto px-12 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                    Launch Demo Hub <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
                 <button onClick={() => scrollTo('workflow')} className="w-full sm:w-auto px-12 py-6 bg-slate-50 text-slate-400 border border-slate-100 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all text-center">How it Works</button>
              </div>
           </div>

           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative">
              <div className="absolute inset-0 bg-blue-400/20 blur-[120px] rounded-full -z-10 animate-pulse" />
              <img 
                src="/mcb_hero.png" 
                alt="MCB Interface" 
                className="w-full h-auto rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] transform hover:scale-[1.02] hover:-rotate-1 transition-all duration-700 pointer-events-none"
              />
              <div className="absolute -bottom-10 -right-10 p-8 bg-white/80 backdrop-blur-3xl border border-white rounded-[3rem] shadow-2xl hidden xl:block">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg"><Activity size={32}/></div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payroll Health</p>
                       <p className="text-3xl font-black text-slate-900 tabular-nums">99.99%</p>
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>
      </section>

      {/* ── Workflow Exhibit (How it Works) ── */}
      <section id="workflow" className="py-32 px-6 bg-slate-50">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-6 underline decoration-4 underline-offset-8">Workflow Engine</h2>
               <p className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-[1] mb-6">Built for High-Growth <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Enterprise Speed.</span></p>
               <p className="text-slate-400 font-medium max-w-xl mx-auto">See how MCB HRM Ghana streamlines your entire organization in three simple stages.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
               {[
                 { 
                   step: "01", 
                   title: "Recursive Onboarding", 
                   desc: "Import your entire team from any system. MCB automatically maps profiles, roles, and payroll schedules using AI.",
                   icon: <Users size={24}/>
                 },
                 { 
                   step: "02", 
                   title: "Unified Shell Control", 
                   desc: "Manage payroll, leave, performance reviews, and biometric attendance from a single administrative hub.",
                   icon: <LayoutDashboard size={24}/>
                 },
                 { 
                   step: "03", 
                   title: "Intelligent Scaling", 
                   desc: "Use the Cortex AI to identify talent growth opportunities and automate departmental reporting in seconds.",
                   icon: <BrainCircuit size={24}/>
                 }
               ].map((item, i) => (
                 <div key={i} className="p-12 bg-white rounded-[4rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all group">
                    <div className="flex items-center justify-between mb-8">
                       <span className="text-4xl font-black text-slate-100 italic tracking-tighter group-hover:text-blue-50 transition-colors uppercase">{item.step}</span>
                       <div className="w-14 h-14 bg-slate-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">{item.icon}</div>
                    </div>
                    <h3 className="text-2xl font-black uppercase italic mb-4">{item.title}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── Capabilities (List features nicely) ── */}
      <section id="features" className="py-32 px-6">
         <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
               <div className="space-y-12">
                  <div className="space-y-6">
                     <h2 className="text-sm font-black uppercase tracking-[0.4em] text-blue-600">System Capabilities</h2>
                     <p className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">Everything your <br /> team needs.</p>
                     <p className="text-slate-400 font-medium">We've built a complete HRM platform, so you don't have to stitch together 10 different apps.</p>
                  </div>
                  
                  <div className="grid gap-8">
                     {[
                        { title: "Nuclear Payroll", desc: "Automated tax, bank transfers, and direct disbursement.", icon: <Server /> },
                        { title: "Biometric Integration", desc: "Real-time presence tracking with hardware-agnostic sync.", icon: <Fingerprint /> },
                        { title: "Performance Cortex", desc: "AI-driven staff appraisals and talent growth mapping.", icon: <Star /> },
                        { title: "Legal Shell", desc: "Global compliance and local tax law automation.", icon: <Shield /> }
                     ].map((f, i) => (
                        <div key={i} className="flex gap-6 group">
                           <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">{f.icon}</div>
                           <div>
                              <h4 className="text-lg font-black uppercase italic">{f.title}</h4>
                              <p className="text-slate-400 text-sm font-medium">{f.desc}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="relative">
                  <div className="bg-slate-900 rounded-[4rem] p-12 overflow-hidden shadow-2xl relative">
                     <div className="absolute top-0 right-0 p-8">
                        <Terminal className="text-blue-500 opacity-20" size={120} />
                     </div>
                     <div className="space-y-6 relative z-10">
                        <div className="flex gap-2">
                           <div className="w-3 h-3 rounded-full bg-rose-500" />
                           <div className="w-3 h-3 rounded-full bg-amber-500" />
                           <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-blue-400 font-black text-xs uppercase tracking-widest">MCB Review Engine v1.0.4</p>
                        <div className="space-y-4">
                           <motion.p 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ repeat: Infinity, duration: 3 }}
                             className="text-white font-black text-2xl uppercase italic"
                           >
                              "The Operating System for Human Potential."
                           </motion.p>
                           <p className="text-slate-500 text-sm font-bold">— Director of Growth, Enterprise Ltd.</p>
                        </div>
                        <div className="pt-20">
                           <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">M</div>
                              <div>
                                 <p className="text-[10px] font-black text-white uppercase tracking-widest">MCB Cortex is thinking...</p>
                                 <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden mt-1">
                                    <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1/2 h-full bg-blue-500" />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* ── Security Exhibit ── */}
      <section id="security" className="py-32 px-6 bg-slate-900 text-white overflow-hidden relative">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
         </div>
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-24 items-center">
               <div className="space-y-10">
                  <h2 className="text-sm font-black uppercase tracking-[0.5em] text-blue-500">Military-Grade Shell</h2>
                  <p className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">Bank-Level Security <br /> by Construction.</p>
                  <p className="text-slate-400 text-lg font-medium">MCB HRM Ghana uses recursive encryption and multi-tenant isolation to ensure your organization's data remains untouchable.</p>
                  <div className="grid grid-cols-2 gap-8">
                     {[
                        { title: "SOC 2 Type II", desc: "Enterprise certified controls.", icon: <Lock /> },
                        { title: "256-bit AES", desc: "Encryption at rest and transit.", icon: <Shield /> },
                        { title: "Biometric Auth", desc: "Multi-layered staff verification.", icon: <Fingerprint /> },
                        { title: "99.99% Uptime", desc: "Redundant cloud infrastructure.", icon: <Server /> }
                     ].map((item, i) => (
                        <div key={i} className="space-y-4">
                           <div className="text-blue-500">{item.icon}</div>
                           <h4 className="text-sm font-black uppercase italic tracking-widest">{item.title}</h4>
                           <p className="text-slate-500 text-xs font-bold">{item.desc}</p>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="relative flex justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                    className="w-[500px] h-[500px] border border-blue-500/20 rounded-full flex items-center justify-center"
                  >
                     <div className="w-[400px] h-[400px] border border-blue-500/30 rounded-full flex items-center justify-center">
                        <div className="w-[300px] h-[300px] border border-blue-500/40 rounded-full flex items-center justify-center">
                           <Shield className="text-blue-500 animate-pulse" size={120} />
                        </div>
                     </div>
                  </motion.div>
               </div>
            </div>
         </div>
      </section>

      {/* ── Pricing Exhibit (Consultative) ── */}
      <section id="pricing" className="py-32 px-6">
         <div className="max-w-4xl mx-auto text-center space-y-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 underline decoration-4 underline-offset-8">Premium Engagement</h2>
            <p className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.9]">Tailored for Your <br /> <span className="bg-blue-600 text-white px-6 rounded-[2rem] italic">Scale.</span></p>
            <p className="text-slate-400 font-medium text-lg max-w-xl mx-auto italic">We don't do generic tiers. We build strategic HR infrastructure custom-fit for your unique organization. Contact us for an enterprise quote.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10">
               <button onClick={() => scrollTo('contact')} className="w-full sm:w-auto px-16 py-8 bg-slate-900 text-white rounded-[3rem] font-black uppercase italic tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-4">
                  Request Strategic Quote <ArrowRight />
               </button>
               <button onClick={handleDemoLaunch} className="w-full sm:w-auto px-16 py-8 border-2 border-slate-100 text-slate-400 rounded-[3rem] font-black uppercase italic tracking-[0.2em] hover:bg-slate-50 transition-all">Launch Live Demo</button>
            </div>
         </div>
      </section>

      {/* ── Company (About) ── */}
      <section id="company" className="py-32 px-6 bg-slate-50">
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
               <div className="grid grid-cols-2 gap-4">
                  <div className="h-64 bg-blue-600 rounded-[3rem] flex flex-col justify-end p-10 text-white">
                     <p className="text-4xl font-black italic uppercase">120+</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Global Clients</p>
                  </div>
                  <div className="h-64 bg-slate-900 rounded-[3rem] mt-12 flex flex-col justify-end p-10 text-white">
                     <p className="text-4xl font-black italic uppercase">1M+</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Staff Verified</p>
                  </div>
                  <div className="h-64 bg-emerald-500 rounded-[3rem] -mt-12 flex flex-col justify-end p-10 text-white">
                     <p className="text-4xl font-black italic uppercase">0.01s</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Payroll Speed</p>
                  </div>
                  <div className="h-64 bg-amber-500 rounded-[3rem] flex flex-col justify-end p-10 text-white">
                     <p className="text-4xl font-black italic uppercase">24/7</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">AI Monitoring</p>
                  </div>
               </div>
            </div>
            <div className="space-y-10">
               <h2 className="text-sm font-black uppercase tracking-[0.4em] text-blue-600">Our Strategic Intent</h2>
               <p className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-[1]">Developing the world's most <span className="text-blue-600">Advanced People-Brain.</span></p>
               <p className="text-slate-400 font-medium text-lg leading-relaxed italic">MCB HRM Ghana was born from a single realization: Most HR software is built for compliance, not potential. We've built a platform that treats your people as your most powerful asset, giving you the tools to help them scale alongside your company.</p>
               <button className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-slate-900 hover:text-blue-600 transition-colors">
                  Meet the Board <ArrowRight size={16}/>
               </button>
            </div>
         </div>
      </section>

      {/* ── Contact Form (Conversion) ── */}
      <section id="contact" className="py-32 px-6">
         <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 mb-6 underline decoration-4 underline-offset-8">Direct Engagement</h2>
            <p className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-[1] mb-12">Scale Your Team <br /> <span className="bg-emerald-50 text-emerald-600 px-6 rounded-[2rem] border-b-8 border-emerald-100 italic">the MCB Way.</span></p>
            
            <div className="bg-white border-2 border-slate-100 p-12 md:p-20 rounded-[4rem] shadow-2xl relative">
              {formStatus === 'SUCCESS' ? (
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl"><CheckCircle2 size={48}/></div>
                    <h3 className="text-4xl font-black uppercase italic">Handshake Initiated.</h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto italic">MCB HRM Ghana v5.0 Lead Registered. A specialist will synchronize with you shortly.</p>
                 </motion.div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setFormStatus('SENDING');
                  try {
                    await axios.post('/api/support/leads', formData);
                    setFormStatus('SUCCESS');
                  } catch { setFormStatus('IDLE'); }
                }} className="space-y-10 text-left">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Your Full Name</label>
                         <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-slate-900 outline-none focus:border-blue-600 transition-all font-bold placeholder:text-slate-300" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Work Email</label>
                         <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="md@company.com" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-slate-900 outline-none focus:border-blue-600 transition-all font-bold placeholder:text-slate-300" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Company Name</label>
                         <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Global Enterprise Inc." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-slate-900 outline-none focus:border-blue-600 transition-all font-bold placeholder:text-slate-300" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">How can we help your team scale?</label>
                         <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Tell us about your organization size and growth blockers..." className="w-full h-40 bg-slate-50 border border-slate-100 rounded-3xl p-8 text-slate-900 outline-none focus:border-blue-600 transition-all font-bold resize-none placeholder:text-slate-300" />
                      </div>
                   </div>
                   <button 
                     disabled={formStatus === 'SENDING'}
                     className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                   >
                     {formStatus === 'SENDING' ? 'Processing Handshake...' : <>Request Strategic Deployment <ArrowRight/></>}
                   </button>
                </form>
              )}
            </div>
         </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-20 px-6 border-t border-slate-100 bg-white">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-16">
            <div className="max-w-sm space-y-8">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100"><Shield size={24}/></div>
                  <span className="font-black text-2xl tracking-tighter text-slate-900 italic uppercase">MCB HRM Ghana<span className="text-blue-600">.</span></span>
               </div>
               <p className="text-slate-400 font-medium leading-relaxed italic">
                 The world's most advanced operating system for human potential. We build the infrastructure so you can build the future.
               </p>
               <div className="flex gap-4">
                  {[Phone, Mail, Globe, Lock].map((Icon, i) => (
                    <div key={i} className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all cursor-pointer"><Icon size={20}/></div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-20">
               <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 italic underline decoration-2 decoration-blue-600">Company</p>
                  <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <li onClick={() => scrollTo('company')} className="hover:text-blue-600 cursor-pointer transition-colors">Strategic Mission</li>
                     <li className="hover:text-blue-600 cursor-pointer transition-colors">Scale Careers</li>
                     <li className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Shell</li>
                  </ul>
               </div>
               <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 italic underline decoration-2 decoration-blue-600">Product</p>
                  <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <li onClick={handleDemoLaunch} className="hover:text-blue-600 cursor-pointer transition-colors">Instant Showroom</li>
                     <li onClick={() => navigate('/login')} className="hover:text-blue-600 cursor-pointer transition-colors">Command Login</li>
                     <li onClick={() => scrollTo('workflow')} className="hover:text-blue-600 cursor-pointer transition-colors">Workflow Core</li>
                  </ul>
               </div>
               <div className="space-y-6 hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 italic underline decoration-2 decoration-blue-600">Infrastructure</p>
                  <ul className="space-y-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <li onClick={() => scrollTo('security')} className="hover:text-blue-600 cursor-pointer transition-colors">ISO 27001</li>
                     <li className="hover:text-blue-600 cursor-pointer transition-colors">GDPR Shield</li>
                     <li className="hover:text-blue-600 cursor-pointer transition-colors">Atomic Uptime</li>
                  </ul>
               </div>
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">© 2026 MCB HRM GHANA. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Core Status: Active</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default StormglideHome;
