'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Search,
  Layers,
  Droplets,
  Heart,
  Truck,
  BarChart3,
  Smartphone,
  MessageSquare,
  WifiOff,
  Zap,
  MoreHorizontal,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    activeRole,
    lowBandwidth,
    language,
    isOnline,
    pendingSyncCount,
    switchPersona,
    logout,
    toggleLowBandwidth,
    setLanguage,
    initSession,
  } = useAppStore();

  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavItems = (role: string) => {
    if (!currentUser) return [];
    switch (role) {
      case 'DONOR':
        return [
          { href: '/donor', label: 'My Donor Card', icon: Heart },
          { href: '/requests', label: 'Blood Appeals', icon: Layers },
        ];
      case 'TRANSPORT':
        return [
          { href: '/logistics', label: 'My Dispatches', icon: Truck },
          { href: '/requests', label: 'Urgent Queue', icon: Layers },
        ];
      case 'BLOOD_BANK':
        return [
          { href: '/blood', label: 'Blood Matrix', icon: Droplets },
          { href: '/requests', label: 'Blood Requests', icon: Layers },
          { href: '/donor', label: 'Donation Drives', icon: Heart },
          { href: '/logistics', label: 'Logistics', icon: Truck },
        ];
      case 'DHO':
      case 'STATE_ADMIN':
        return [
          { href: '/oversight', label: 'District Oversight', icon: BarChart3 },
          { href: '/', label: 'District Map', icon: Activity },
          { href: '/requests', label: 'Queue Policy', icon: Layers },
          { href: '/dashboard', label: 'Facilities', icon: Search },
        ];
      case 'FACILITY_ADMIN':
      default:
        return [
          { href: '/dashboard', label: 'Inventory', icon: Activity },
          { href: '/search', label: 'Borrow Stock', icon: Search },
          { href: '/requests', label: 'Requests', icon: Layers },
          { href: '/blood', label: 'Blood Matrix', icon: Droplets },
          { href: '/logistics', label: 'Logistics', icon: Truck },
        ];
    }
  };

  const navItems = getNavItems(activeRole);

  const getRoleBadgeLabel = () => {
    if (!currentUser) return 'Select Role';
    if (currentUser.phone === '9820011001') return 'Facility Admin • Nerul UHC';
    if (currentUser.phone === '9820011002') return 'Facility Admin • DY Patil';
    if (currentUser.phone === '9820011003') return 'Blood Bank Officer';
    if (currentUser.phone === '9820011004') return 'Citizen Donor';
    if (currentUser.phone === '9820011005') return 'Transport Driver';
    if (currentUser.phone === '9820011006') return 'MHO Officer';
    if (currentUser.phone === '9820011007') return 'State Admin';
    if (currentUser.phone === '9820011008') return 'Facility Admin • Kharghar';
    if (currentUser.phone === '9820011009') return 'Blood Bank • Satellite';
    return currentUser.role?.replace('_', ' ') || 'Role';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-neutral-850 border border-neutral-700 text-neutral-200 flex items-center justify-center font-bold text-xs group-hover:border-neutral-500 transition-colors">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-display font-semibold text-base tracking-tight text-neutral-200">
              LifeLink
            </span>
          </Link>

          {/* Dynamic Role-Based Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {!currentUser && (
              <Link
                href="/how-it-works"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  pathname === '/how-it-works'
                    ? 'bg-neutral-850 text-neutral-100 font-medium border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/80'
                }`}
              >
                <span>How It Works</span>
              </Link>
            )}
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-neutral-850 text-neutral-100 font-medium border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-100' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-2">
          {/* Low Bandwidth Chip */}
          {lowBandwidth && (
            <button
              onClick={toggleLowBandwidth}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono"
            >
              <Zap className="w-3 h-3 text-neutral-300" />
              <span>Low-BW</span>
            </button>
          )}

          {/* Offline Chip */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono">
              <WifiOff className="w-3 h-3 text-neutral-400" />
              <span>Offline ({pendingSyncCount})</span>
            </div>
          )}

          {/* Unauthenticated: Clean Sign In button */}
          {!currentUser ? (
            <Link
              href="/login"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                pathname === '/login'
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                  : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 shadow-sm'
              }`}
              title="Sign In"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          ) : (
            /* Authenticated: Role Badge + Direct Sign Out (no switch role dropdown) */
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300">
                <div className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold text-[9px] flex items-center justify-center font-mono">
                  {currentUser.role[0] || 'R'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-medium text-neutral-200 block text-xs leading-none">
                    {getRoleBadgeLabel()}
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-tight mt-0.5 font-mono">
                    {currentUser.facility?.name || currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition-colors font-mono"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}

          {/* Tools & Utilities Dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Utilities"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-neutral-950 border border-neutral-800 shadow-2xl z-50 p-1.5 space-y-0.5 text-xs">
                <Link
                  href="/how-it-works"
                  onClick={() => setToolsOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-neutral-400" />
                  <span>How It Works</span>
                </Link>

                <Link
                  href="/dev/feature-phone"
                  onClick={() => setToolsOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Feature Phone</span>
                </Link>

                <Link
                  href="/dev/sms"
                  onClick={() => setToolsOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                  <span>SMS Log</span>
                </Link>

                <button
                  onClick={() => {
                    toggleLowBandwidth();
                    setToolsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Low-BW</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {lowBandwidth ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="pt-1 mt-1 border-t border-neutral-800 flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] text-neutral-500">Lang:</span>
                  <div className="flex gap-1">
                    {(['en', 'hi', 'mr'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          setToolsOpen(false);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                          language === lang
                            ? 'bg-neutral-700 text-neutral-100 font-semibold'
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav bar (only when authenticated) */}
      {currentUser && navItems.length > 0 && (
        <div className="lg:hidden border-t border-neutral-800 px-3 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
