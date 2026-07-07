import React, { useState } from 'react';
import { AppConfig, UserProfile, Language } from '../types';
import { X, Plus, Trash2, UserCircle2, User, UserPlus } from 'lucide-react';

interface UserSessionsModalProps {
  appConfig: AppConfig;
  onUpdateAppConfig: (config: AppConfig) => void;
  onClose: () => void;
  language: Language;
}

export default function UserSessionsModal({
  appConfig,
  onUpdateAppConfig,
  onClose,
  language
}: UserSessionsModalProps) {
  const isHindi = language === 'Hindi';
  const [newUserName, setNewUserName] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const newUser: UserProfile = {
      id: 'user_' + Date.now().toString(),
      name: newUserName.trim(),
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    onUpdateAppConfig({
      ...appConfig,
      users: [...appConfig.users, newUser],
    });
    setNewUserName('');
  };

  const handleSwitchUser = (userId: string) => {
    const updatedUsers = appConfig.users.map(u => 
      u.id === userId ? { ...u, lastActive: Date.now() } : u
    );
    
    onUpdateAppConfig({
      users: updatedUsers,
      activeUserId: userId,
    });
    
    // Slight delay to allow state to settle before closing, 
    // or just close immediately.
    setTimeout(onClose, 100);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (appConfig.users.length <= 1) {
      alert(isHindi ? "कम से कम एक प्रोफाइल होना चाहिए।" : "At least one profile must exist.");
      return;
    }
    
    if (window.confirm(isHindi ? `क्या आप '${userName}' का डेटा हटाना चाहते हैं?` : `Delete profile '${userName}' and all associated data?`)) {
      const remainingUsers = appConfig.users.filter(u => u.id !== userId);
      
      let newActiveId = appConfig.activeUserId;
      if (appConfig.activeUserId === userId) {
        newActiveId = remainingUsers[0].id;
      }
      
      onUpdateAppConfig({
        users: remainingUsers,
        activeUserId: newActiveId,
      });
      
      // Cleanup associated local storage data (optional, but good practice)
      // Since it could be complex, we can just let it be orphaned for now 
      // or clean it up explicitly.
      const suffix = userId === 'default' ? '' : `_${userId}`;
      window.localStorage.removeItem(`carpentry_parts${suffix}`);
      window.localStorage.removeItem(`carpentry_settings${suffix}`);
      window.localStorage.removeItem(`carpentry_saved_jobs${suffix}`);
      window.localStorage.removeItem(`carpentry_attendance${suffix}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-950 px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-inner border border-indigo-100 dark:border-indigo-800/50">
              <UserCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {isHindi ? "यूज़र प्रोफाइल (User Profiles)" : "User Profiles"}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isHindi ? "अलग-अलग कारपेंटर के लिए अलग वर्कस्पेस" : "Independent workspaces for multiple carpenters"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-300 dark:border-b-slate-950 shadow-sm active:translate-y-[2px] active:border-b transition-all duration-75 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Active Users List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">
              {isHindi ? "चुनें या स्विच करें:" : "Select or Switch Profile:"}
            </h3>
            <div className="grid gap-3">
              {appConfig.users.map(user => {
                const isActive = user.id === appConfig.activeUserId;
                return (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isActive 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm ring-2 ring-indigo-500/20" 
                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <User size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          {user.name}
                          {isActive && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                              {isHindi ? "सक्रिय" : "Active"}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {isHindi ? "अंतिम बार खोला गया: " : "Last active: "}
                          {new Date(user.lastActive).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitchUser(user.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                        >
                          {isHindi ? "स्विच करें" : "Switch"}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={appConfig.users.length <= 1}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                        title={isHindi ? "डिलीट करें" : "Delete Profile"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New User */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <UserPlus size={16} className="text-emerald-500" />
              {isHindi ? "नया कारपेंटर प्रोफाइल बनाएं" : "Create New Profile"}
            </h3>
            <form onSubmit={handleAddUser} className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder={isHindi ? "कारपेंटर का नाम..." : "Carpenter's name..."}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={!newUserName.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} />
                {isHindi ? "जोड़ें" : "Add"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
