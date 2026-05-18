/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Users, 
  Camera, 
  Settings2, 
  Languages, 
  HardHat, 
  Info,
  ChevronRight,
  Plus,
  LogOut,
  MapPin,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { TRANSLATIONS, Language } from './translations';
import { MaterialRates, Site, Laborer, AttendanceLog, ProgressPhoto } from './types';
import { auth, db, signIn } from './services/firebase';
import { useAuth } from './contexts/AuthContext';
import { handleFirestoreError, OperationType } from './lib/errorHandlers';

// Initial Rates
const DEFAULT_RATES: MaterialRates = {
  brick: 12,
  cement: 450,
  sand: 60
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'calc' | 'team' | 'photos' | 'rates'>('calc');
  const [rates, setRates] = useState<MaterialRates>(DEFAULT_RATES);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  
  // Firestore State
  const [sites, setSites] = useState<Site[]>([]);
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  const t = TRANSLATIONS[lang];

  // Load User Settings
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubs = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRates(data.rates || DEFAULT_RATES);
        setLang(data.language || 'en');
      } else {
        // Init profile
        setDoc(userDocRef, { 
          language: 'en', 
          rates: DEFAULT_RATES,
          displayName: user.displayName 
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    });
    return unsubs;
  }, [user]);

  // Load Sites
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'sites'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setSites(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Site)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sites'));
  }, [user]);

  // Load Laborers
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'laborers'), where('ownerId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setLaborers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Laborer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'laborers'));
  }, [user]);

  const toggleLang = async () => {
    const newLang = lang === 'en' ? 'kn' : 'en';
    setLang(newLang);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { language: newLang });
    }
  };

  const handleUpdateRates = async (newRates: MaterialRates) => {
    setRates(newRates);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { rates: newRates });
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><HardHat className="w-12 h-12 text-orange-600" /></motion.div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-orange-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6 max-w-sm">
          <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
            <HardHat className="w-20 h-20 text-orange-600" />
          </div>
          <h1 className="text-4xl font-black">{t.appTitle}</h1>
          <p className="text-orange-100 font-medium">Professional "Construction Assistant" for the local building Mistri.</p>
          <button 
            onClick={signIn}
            className="w-full bg-white text-orange-600 font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
          >
            <img src="https://www.gstatic.com/firebase/explore/images/google-logo.svg" className="w-6 h-6" referrerPolicy="no-referrer" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-orange-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HardHat className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleLang}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors flex items-center gap-1"
            >
              <Languages className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">{lang === 'en' ? 'ಕನ್ನಡ' : 'En'}</span>
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Site Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-500 overflow-hidden">
            <MapPin className="w-5 h-5 flex-shrink-0" />
            {activeSiteId ? (
              <span className="font-bold text-slate-800 truncate">
                {sites.find(s => s.id === activeSiteId)?.name || t.selectSite}
              </span>
            ) : (
              <span className="font-bold">{t.selectSite}</span>
            )}
          </div>
          <SiteManagerModal sites={sites} activeSiteId={activeSiteId} setActiveSiteId={setActiveSiteId} t={t} user={user} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'calc' && <MaterialCalculator t={t} rates={rates} />}
            {activeTab === 'team' && <LaborDiary t={t} laborers={laborers} activeSiteId={activeSiteId} user={user} />}
            {activeTab === 'photos' && <SitePhotos t={t} activeSiteId={activeSiteId} user={user} />}
            {activeTab === 'rates' && <RatesEditor t={t} rates={rates} setRates={handleUpdateRates} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-md mx-auto px-2 flex justify-around">
          {[
            { id: 'calc', label: t.calculator, icon: Calculator },
            { id: 'team', label: t.team, icon: Users },
            { id: 'photos', label: t.photos, icon: Camera },
            { id: 'rates', label: t.rates, icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center py-3 px-1 gap-1 transition-all flex-1 ${
                  isActive ? 'text-orange-600' : 'text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-orange-100 scale-110' : ''}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold ${lang === 'kn' ? 'text-[11px]' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// --- Sub-components ---

function SiteManagerModal({ sites, activeSiteId, setActiveSiteId, t, user }: { sites: Site[], activeSiteId: string | null, setActiveSiteId: (id: string | null) => void, t: any, user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const addSite = async () => {
    if (!newName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'sites'), {
        name: newName,
        address: '',
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });
      setActiveSiteId(docRef.id);
      setNewName('');
      setIsOpen(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'sites'); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">{t.selectSite}</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {sites.map(site => (
                <button
                  key={site.id}
                  onClick={() => { setActiveSiteId(site.id); setIsOpen(false); }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                    activeSiteId === site.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className="font-bold">{site.name}</span>
                  {activeSiteId === site.id && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <input 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="New Site Name"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-orange-500"
              />
              <button onClick={addSite} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add New Site
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function MaterialCalculator({ t, rates }: { t: any, rates: MaterialRates }) {
  const [inputs, setInputs] = useState({ length: '', height: '', thickness: '9' });
  const [result, setResult] = useState<any>(null);

  const handleCalc = () => {
    const l = parseFloat(inputs.length);
    const h = parseFloat(inputs.height);
    const th = parseFloat(inputs.thickness);
    if (l > 0 && h > 0) {
      const vol = l * h * (th / 12);
      const bricks = Math.ceil(vol * 14.16);
      const mortar = vol * 0.3 * 1.33;
      const cement = Math.ceil((mortar * (1/7)) / 1.25);
      const sand = Math.ceil(mortar * (6/7));
      setResult({ bricks, cement, sand, cost: (bricks * rates.brick) + (cement * rates.cement) + (sand * rates.sand) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.length}</label>
          <input 
            type="number" 
            value={inputs.length}
            onChange={e => setInputs({...inputs, length: e.target.value})}
            className="w-full text-2xl font-black bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 focus:border-orange-500 outline-none transition-all"
            placeholder="0"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.height}</label>
            <input 
              type="number" 
              value={inputs.height}
              onChange={e => setInputs({...inputs, height: e.target.value})}
              className="w-full text-2xl font-black bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 focus:border-orange-500 outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t.thickness}</label>
            <select 
              value={inputs.thickness}
              onChange={e => setInputs({...inputs, thickness: e.target.value})}
              className="w-full text-lg font-black bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 focus:border-orange-500 outline-none h-[72px]"
            >
              <option value="4.5">4.5 inch</option>
              <option value="9">9 inch</option>
              <option value="13.5">13.5 inch</option>
            </select>
          </div>
        </div>
        <button 
          onClick={handleCalc}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-xl"
        >
          <Calculator className="w-6 h-6" />
          {t.calculate}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl space-y-4"
        >
          <h3 className="text-orange-400 font-black uppercase tracking-wider flex items-center gap-2 text-sm">
            <Info className="w-4 h-4" /> {t.results}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] uppercase text-white/40 block font-bold mb-1">{t.bricks}</span>
              <span className="text-2xl font-black">{result.bricks}</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] uppercase text-white/40 block font-bold mb-1">{t.cement}</span>
              <span className="text-2xl font-black">{result.cement}</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] uppercase text-white/40 block font-bold mb-1">{t.sand}</span>
              <span className="text-2xl font-black">{result.sand}</span>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between items-end">
             <span className="text-sm font-bold text-white/50">{t.totalCost}</span>
             <span className="text-4xl font-black text-orange-400 tracking-tighter">₹{result.cost.toLocaleString()}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LaborDiary({ t, laborers, activeSiteId, user }: { t: any, laborers: Laborer[], activeSiteId: string | null, user: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('600');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  // Load Attendance Logs for active site
  useEffect(() => {
    if (!activeSiteId || !user) return;
    const q = query(collection(db, 'attendance'), where('siteId', '==', activeSiteId), where('ownerId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));
  }, [activeSiteId, user]);

  const addLaborer = async () => {
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, 'laborers'), {
        name: newName,
        dailyRate: parseFloat(newRate),
        ownerId: user.uid
      });
      setIsAdding(false);
      setNewName('');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'laborers'); }
  };

  const markAttendance = async (laborerId: string, present: boolean) => {
    if (!activeSiteId) return;
    const today = new Date().toISOString().split('T')[0];
    const existingLog = logs.find(l => l.laborerId === laborerId && l.date === today);

    try {
      if (existingLog) {
        await updateDoc(doc(db, 'attendance', existingLog.id), { isPresent: present });
      } else {
        await addDoc(collection(db, 'attendance'), {
          laborerId,
          siteId: activeSiteId,
          date: today,
          isPresent: present,
          advancePaid: 0,
          ownerId: user.uid
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'attendance'); }
  };

  const addAdvance = async (laborerId: string, amount: string) => {
    if (!activeSiteId || !amount) return;
    const today = new Date().toISOString().split('T')[0];
    const existingLog = logs.find(l => l.laborerId === laborerId && l.date === today);

    try {
      if (existingLog) {
        await updateDoc(doc(db, 'attendance', existingLog.id), { advancePaid: (existingLog.advancePaid || 0) + parseFloat(amount) });
      } else {
        await addDoc(collection(db, 'attendance'), {
          laborerId,
          siteId: activeSiteId,
          date: today,
          isPresent: false, // Default to false if just adding advance? Or keep as is.
          advancePaid: parseFloat(amount),
          ownerId: user.uid
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'attendance'); }
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">{t.team}</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-slate-200"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs uppercase tracking-tight">Laborer</span>
        </button>
      </div>

      {!activeSiteId && (
        <div className="bg-amber-100 border border-amber-200 p-4 rounded-2xl flex gap-3 items-center text-amber-800">
          <Info className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-black tracking-tight">Please select an ACTIVE SITE to mark attendance.</p>
        </div>
      )}

      {isAdding && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-3xl border-2 border-orange-500 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg">New Team Member</h3>
            <button onClick={() => setIsAdding(false)}><X className="w-5 h-5" /></button>
          </div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold" />
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2">
            <span className="font-bold text-slate-400">₹/day</span>
            <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} className="w-full font-bold bg-transparent outline-none" />
          </div>
          <button onClick={addLaborer} className="w-full bg-orange-600 text-white font-black py-4 rounded-xl">Save Laborer</button>
        </motion.div>
      )}

      <div className="space-y-3">
        {laborers.map(laborer => {
          const today = new Date().toISOString().split('T')[0];
          const todayLog = logs.find(l => l.laborerId === laborer.id && l.date === today);
          
          // Simplified balance calculation (example logic: Total Days * Rate - Total Advance)
          // In a real app, you'd aggregate all logs for this laborer.
          const laborerLogs = logs.filter(l => l.laborerId === laborer.id);
          const totalPresent = laborerLogs.filter(l => l.isPresent).length;
          const totalAdvance = laborerLogs.reduce((acc, curr) => acc + curr.advancePaid, 0);
          const balance = (totalPresent * laborer.dailyRate) - totalAdvance;

          return (
            <div key={laborer.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center font-black text-orange-600 text-lg uppercase">
                    {laborer.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 leading-tight">{laborer.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">₹{laborer.dailyRate}/day</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">{t.balance}</div>
                  <div className={`text-xl font-black ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ₹{Math.abs(balance).toLocaleString()}
                    {balance < 0 && ' (Dr)'}
                  </div>
                </div>
              </div>

              {activeSiteId && (
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => markAttendance(laborer.id, true)}
                    className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                      todayLog?.isPresent ? 'bg-green-600 border-green-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <Check className="w-5 h-5" /> {t.present}
                  </button>
                  <button 
                    onClick={() => markAttendance(laborer.id, false)}
                    className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                      todayLog && !todayLog.isPresent ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <X className="w-5 h-5" /> {t.absent}
                  </button>
                  <button 
                    onClick={() => {
                      const amt = prompt('Advance Amount?');
                      if (amt) addAdvance(laborer.id, amt);
                    }}
                    className="aspect-square bg-slate-900 text-white rounded-xl flex items-center justify-center border-2 border-slate-900"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SitePhotos({ t, activeSiteId, user }: { t: any, activeSiteId: string | null, user: any }) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  useEffect(() => {
    if (!activeSiteId || !user) return;
    const q = query(collection(db, 'photos'), where('siteId', '==', activeSiteId), where('ownerId', '==', user.uid), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProgressPhoto)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'photos'));
  }, [activeSiteId, user]);

  const addStaticPhoto = async () => {
    if (!activeSiteId) return;
    // Simulate photo upload with a placeholder for now as per image-generation skill/constraints
    try {
      await addDoc(collection(db, 'photos'), {
        url: `https://picsum.photos/seed/${Math.random()}/800/800`,
        siteId: activeSiteId,
        caption: `Progress Update - ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        ownerId: user.uid
      });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'photos'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">{t.photos}</h2>
        <button 
          onClick={addStaticPhoto}
          disabled={!activeSiteId}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold disabled:opacity-50"
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs uppercase">Snap</span>
        </button>
      </div>

      {!activeSiteId && (
        <div className="bg-amber-100 border border-amber-200 p-4 rounded-2xl flex gap-3 items-center text-amber-800">
          <Info className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-black">Select a site to view/add photos.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {photos.map(photo => (
          <motion.div key={photo.id} component="div" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative aspect-square bg-slate-200 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
             <img src={photo.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex flex-col justify-end">
               <span className="text-[10px] text-white/70 font-bold uppercase">{new Date(photo.timestamp).toLocaleDateString()}</span>
               <span className="text-xs text-white font-black truncate">{photo.caption}</span>
             </div>
             <button 
               onClick={() => deleteDoc(doc(db, 'photos', photo.id))}
               className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
             >
               <Trash2 className="w-4 h-4 text-white" />
             </button>
          </motion.div>
        ))}
        {activeSiteId && photos.length === 0 && (
          <button 
            onClick={addStaticPhoto}
            className="aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2"
          >
            <Plus className="w-8 h-8" />
            <span className="text-[10px] font-black uppercase">{t.addPhoto}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function RatesEditor({ t, rates, setRates }: { t: any, rates: MaterialRates, setRates: (r: MaterialRates) => void }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t.rates}</h2>
        <p className="text-xs font-medium text-slate-400">Current market prices for accurate estimation.</p>
      </div>
      <div className="space-y-4">
        <RateInput icon={Calculator} label={t.bricks} value={rates.brick} onChange={v => setRates({...rates, brick: v})} />
        <RateInput icon={HardHat} label={t.cement} value={rates.cement} onChange={v => setRates({...rates, cement: v})} />
        <RateInput icon={Info} label={t.sand} value={rates.sand} onChange={v => setRates({...rates, sand: v})} />
      </div>
      
      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3 text-orange-700">
        <Info className="w-5 h-5 flex-shrink-0" />
        <div className="text-xs font-medium">
          These rates are used globally for all your calculations. Update them whenever prices change in your local area.
        </div>
      </div>
    </div>
  );
}

function RateInput({ label, value, onChange, icon: Icon }: { label: string, value: number, onChange: (v: number) => void, icon: any }) {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-orange-100 p-4 rounded-2xl">
        <Icon className="w-8 h-8 text-orange-600" />
      </div>
      <div className="flex-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
        <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-2xl focus-within:border-orange-500 transition-all">
          <span className="font-black text-slate-300 text-xl">₹</span>
          <input 
            type="number" 
            value={value} 
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-full font-black text-2xl bg-transparent outline-none text-slate-800"
          />
        </div>
      </div>
    </div>
  );
}
