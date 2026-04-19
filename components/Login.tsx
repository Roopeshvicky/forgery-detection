
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface LoginProps {
  profiles: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onCreateProfile: (name: string, role: string) => void;
}

const Login: React.FC<LoginProps> = ({ profiles, onLogin, onCreateProfile }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Document Auditor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateProfile(newName, newRole);
      setIsCreating(false);
      setNewName('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 6.679V11.33a11.313 11.313 0 0011.08 11.252l.207.007.207-.007A11.313 11.313 0 0021 11.33V6.679l-.382-.039z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Docx Verify AI</h1>
          <p className="text-blue-100 text-sm mt-1">Enterprise Forensic Gateway</p>
        </div>

        <div className="p-8">
          {!isCreating ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800">Select Profile</h2>
              <div className="grid gap-3">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => onLogin(profile)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${profile.avatarColor}`}>
                      {profile.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700">{profile.name}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">{profile.role}</div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-3 px-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-medium"
              >
                + Create New Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800">New Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Roopesh Vicky"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Organization Role</label>
                  <input
                    type="text"
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Senior Auditor"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
