import React, { useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Eye,
  FileSearch,
  HeartPulse,
  Home,
  Lock,
  LogOut,
  Menu,
  MessageSquareHeart,
  Moon,
  PhoneCall,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { AcademyView } from './components/modules/AcademyView';
import { AdminDashboardView } from './components/modules/AdminDashboardView';
import { AudioReaderView } from './components/modules/AudioReaderView';
import { AutonomyEngineView } from './components/modules/AutonomyEngineView';
import { BuddyChatView } from './components/modules/BuddyChatView';
import { CaregiverDashboardView } from './components/modules/CaregiverDashboardView';
import { DashboardView } from './components/modules/DashboardView';
import { EmergencyView } from './components/modules/EmergencyView';
import { FamilyHubView } from './components/modules/FamilyHubView';
import { RemindersView } from './components/modules/RemindersView';
import { ResearchHubView } from './components/modules/ResearchHubView';
import { ScamShieldView } from './components/modules/ScamShieldView';
import { SettingsBackupView } from './components/modules/SettingsBackupView';
import { WellnessView } from './components/modules/WellnessView';
import { AppProvider, useApp } from './context/AppContext';
import type { ModuleId } from './types';

const MainShell: React.FC = () => {
  const { user, loading, logout, t, theme, updatePreferences } = useApp();
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] dark:bg-[#0B141D] text-xl font-bold text-[#0F3D5E] dark:text-white">
        Loading Buddy Elder AI...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const navItems: Array<{ id: ModuleId; label: string; icon: React.ReactNode; visible: boolean }> = [
    { id: 'dashboard', label: t('dashboard'), icon: <Home className="w-5 h-5" />, visible: true },
    { id: 'chat', label: t('chat'), icon: <MessageSquareHeart className="w-5 h-5" />, visible: true },
    { id: 'scam', label: t('scam'), icon: <ShieldAlert className="w-5 h-5" />, visible: true },
    { id: 'reader', label: t('reader'), icon: <Eye className="w-5 h-5" />, visible: true },
    { id: 'wellness', label: t('wellness'), icon: <HeartPulse className="w-5 h-5" />, visible: true },
    { id: 'family', label: t('family'), icon: <Users className="w-5 h-5" />, visible: true },
    { id: 'autonomy', label: t('autonomy'), icon: <Lock className="w-5 h-5" />, visible: true },
    { id: 'academy', label: t('academy'), icon: <BookOpen className="w-5 h-5" />, visible: true },
    { id: 'research', label: t('research'), icon: <FileSearch className="w-5 h-5" />, visible: true },
    { id: 'reminders', label: t('reminders'), icon: <CalendarClock className="w-5 h-5" />, visible: true },
    { id: 'emergency', label: t('emergency'), icon: <PhoneCall className="w-5 h-5" />, visible: true },
    { id: 'caregiver', label: t('caregiver'), icon: <UserCheck className="w-5 h-5" />, visible: user.role === 'caregiver' || user.role === 'admin' },
    { id: 'admin', label: t('admin'), icon: <ShieldCheck className="w-5 h-5" />, visible: user.role === 'admin' },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-5 h-5" />, visible: true },
  ];

  const selectModule = (id: ModuleId) => {
    setActiveModule(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView onNavigate={selectModule} />;
      case 'chat':
        return <BuddyChatView />;
      case 'scam':
        return <ScamShieldView />;
      case 'reader':
        return <AudioReaderView />;
      case 'wellness':
        return <WellnessView />;
      case 'family':
        return <FamilyHubView />;
      case 'autonomy':
        return <AutonomyEngineView />;
      case 'academy':
        return <AcademyView />;
      case 'research':
        return <ResearchHubView />;
      case 'reminders':
        return <RemindersView />;
      case 'emergency':
        return <EmergencyView />;
      case 'caregiver':
        return user.role === 'caregiver' || user.role === 'admin' ? <CaregiverDashboardView /> : <DashboardView onNavigate={selectModule} />;
      case 'admin':
        return user.role === 'admin' ? <AdminDashboardView /> : <DashboardView onNavigate={selectModule} />;
      case 'settings':
        return <SettingsBackupView />;
      default:
        return <DashboardView onNavigate={selectModule} />;
    }
  };

  const activeLabel = navItems.find((n) => n.id === activeModule)?.label || t('dashboard');

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#0B141D] text-[#14212B] dark:text-[#F1F5F9] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[272px] shrink-0 flex-col border-r border-[#E5DEC9] dark:border-slate-800 bg-white dark:bg-[#121F2C]">
        <div className="p-6 border-b border-[#E5DEC9] dark:border-slate-800">
          <button
            type="button"
            onClick={() => selectModule('dashboard')}
            className="text-left text-2xl font-bold tracking-tight text-[#0F3D5E] dark:text-sky-300"
          >
            {t('brand')}
          </button>
          <p className="text-xs text-[#4A5A68] dark:text-slate-400 mt-1">{t('tagline')}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {navItems
            .filter((item) => item.visible)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectModule(item.id)}
                className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl flex items-center gap-3 text-base font-semibold transition-colors whitespace-nowrap ${
                  activeModule === item.id
                    ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'text-[#14212B] dark:text-slate-200 hover:bg-[#F3EFE6] dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="p-4 border-t border-[#E5DEC9] dark:border-slate-800 space-y-2">
          <p className="text-sm font-bold truncate">{user.fullName}</p>
          <p className="text-xs text-[#4A5A68] dark:text-slate-400 capitalize truncate">
            {user.role} · {user.email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-80 max-w-[85vw] bg-white dark:bg-[#121F2C] h-full flex flex-col border-r border-[#E5DEC9] dark:border-slate-800 z-10">
            <div className="p-5 border-b border-[#E5DEC9] dark:border-slate-800 flex items-center justify-between">
              <span className="text-xl font-bold text-[#0F3D5E] dark:text-sky-300">{t('brand')}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg hover:bg-[#F3EFE6] dark:hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems
                .filter((item) => item.visible)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectModule(item.id)}
                    className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl flex items-center gap-3 text-base font-semibold ${
                      activeModule === item.id
                        ? 'bg-[#0F3D5E] text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'hover:bg-[#F3EFE6] dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
            </nav>
            <div className="p-4 border-t border-[#E5DEC9] dark:border-slate-800">
              <button
                type="button"
                onClick={logout}
                className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#121F2C]/95 backdrop-blur-sm border-b border-[#E5DEC9] dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 flex items-center justify-center"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-base sm:text-lg font-bold truncate">
              <span className="text-[#4A5A68] dark:text-slate-400 font-medium hidden sm:inline">Buddy Elder AI / </span>
              <span>{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => updatePreferences({ theme: theme === 'light' ? 'dark' : 'light' })}
              aria-label="Toggle theme"
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D8CEB8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-slate-800 flex items-center gap-1.5 text-sm font-bold whitespace-nowrap"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="hidden sm:inline">{theme === 'light' ? t('darkMode') : t('lightMode')}</span>
            </button>

            <button
              type="button"
              onClick={() => selectModule('emergency')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t('quickEmergency')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
