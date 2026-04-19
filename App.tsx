
import React, { useState, useCallback, useEffect } from 'react';
import { AnalysisResult, UserProfile } from './types';
import { analyzeDocument } from './services/geminiService';
import FileUploader from './components/FileUploader';
import DocumentViewer from './components/DocumentViewer';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 
  'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'
];

const App: React.FC = () => {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'upload' | 'detail'>('upload');
  
  // Auth & Profile State
  const [profiles, setProfiles] = useState<UserProfile[]>([
    { 
      id: 'default', 
      name: 'Roopesh Vicky', 
      role: 'Senior Audit Director', 
      avatarColor: 'bg-blue-600',
      bio: 'Document forensic specialist.'
    }
  ]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Persistence (mock)
  useEffect(() => {
    const saved = localStorage.getItem('docx_profiles');
    if (saved) {
      setProfiles(JSON.parse(saved));
    }
  }, []);

  const saveProfilesToStorage = (updatedProfiles: UserProfile[]) => {
    setProfiles(updatedProfiles);
    localStorage.setItem('docx_profiles', JSON.stringify(updatedProfiles));
  };

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setView('upload');
    
    try {
      const results: AnalysisResult[] = [];
      
      for (const file of files) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
        });
        reader.readAsDataURL(file);
        
        const base64Data = await base64Promise;
        const analysis = await analyzeDocument(base64Data, file.name, file.type);
        results.push(analysis);
      }
      
      setHistory(prev => [...results, ...prev]);
      if (results.length === 1) {
        setSelectedResult(results[0]);
        setView('detail');
      } else {
        setView('dashboard');
      }
    } catch (error) {
      alert("Error processing documents. Please ensure they are clear images or PDFs.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSelectResult = (result: AnalysisResult) => {
    setSelectedResult(result);
    setView('detail');
  };

  const handleCreateProfile = (name: string, role: string) => {
    const newProfile: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      role,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    };
    const updated = [...profiles, newProfile];
    saveProfilesToStorage(updated);
    setCurrentUser(newProfile);
  };

  const handleUpdateProfile = (updatedUser: UserProfile) => {
    const updated = profiles.map(p => p.id === updatedUser.id ? updatedUser : p);
    saveProfilesToStorage(updated);
    setCurrentUser(updatedUser);
    setShowProfileModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowProfileModal(false);
  };

  if (!currentUser) {
    return <Login 
      profiles={profiles} 
      onLogin={setCurrentUser} 
      onCreateProfile={handleCreateProfile} 
    />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 6.679V11.33a11.313 11.313 0 0011.08 11.252l.207.007.207-.007A11.313 11.313 0 0021 11.33V6.679l-.382-.039z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Docx Verify <span className="text-blue-600">AI</span></span>
            </div>
            
            <nav className="hidden md:flex space-x-8 text-sm font-medium text-gray-500">
              <button 
                onClick={() => setView('dashboard')}
                className={`transition-all pb-5 mt-5 hover:text-blue-600 ${view === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'border-b-2 border-transparent'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setView('upload')}
                className={`transition-all pb-5 mt-5 hover:text-blue-600 ${view === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'border-b-2 border-transparent'}`}
              >
                Verification Terminal
              </button>
            </nav>

            <div className="flex items-center gap-4">
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 pl-4 border-l border-slate-100 cursor-pointer group"
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{currentUser.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">{currentUser.role}</span>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-105 transition-all ${currentUser.avatarColor}`}>
                  {currentUser.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {view === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                Combat Loan Fraud with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Document Forensics
                </span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-gray-500">
                Instantly detect pixel manipulation, font discrepancies, and metadata tampering in financial documents.
              </p>
            </div>

            <FileUploader onFilesSelected={processFiles} isProcessing={isProcessing} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Pixel Analysis', desc: 'Detects invisible tampering layers and noise patterns.', icon: '🔍' },
                { title: 'OCR Verification', desc: 'Validates mathematical logic in bank statements.', icon: '📑' },
                { title: 'Identity Check', desc: 'Verifies PAN, Aadhaar, and ID formats and holograms.', icon: '🆔' }
              ].map(feature => (
                <div key={feature.title} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <Dashboard history={history} onSelect={handleSelectResult} />
          </div>
        )}

        {view === 'detail' && selectedResult && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analysis Report</h2>
                <p className="text-sm text-gray-500">Ref: {selectedResult.id} • {selectedResult.fileName}</p>
              </div>
            </div>
            <DocumentViewer result={selectedResult} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            &copy; 2024 Docx Verify AI Solutions. Enterprise forensic suite.
          </p>
        </div>
      </footer>

      {showProfileModal && (
        <ProfileModal 
          user={currentUser} 
          onSave={handleUpdateProfile} 
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
