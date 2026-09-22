'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  KeyRound,
  ArrowRight,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Droplets,
  Heart,
  Truck,
  BarChart3,
  ShieldCheck,
  Check,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import {
  useAppStore,
  DEMO_ROLE_CREDENTIALS,
  RoleCredential,
} from '../../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const {
    currentUser,
    activeRole,
    switchPersona,
    login,
    loginWithOtp,
    logout,
    isLoadingPersona,
  } = useAppStore();

  // Form Inputs
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCredPhone, setSelectedCredPhone] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'clinics' | 'blood' | 'logistics' | 'donor' | 'governance'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick 1-Click Credential Login: fills form & logs in
  const handleSelectCredential = async (cred: RoleCredential) => {
    setFormError(null);
    setSelectedCredPhone(cred.phone);
    setPhoneInput(cred.phone);
    setPasswordInput(cred.password);
    setOtpInput('123456');

    try {
      setIsLoggingIn(true);
      await switchPersona(cred.role, cred.phone);
      router.push(cred.primaryRoute);
    } catch (err: any) {
      setFormError(err?.message || 'Authentication failed');
      setIsLoggingIn(false);
    }
  };

  // Manual Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phoneInput.trim().replace(/^\+91/, '').replace(/\s+/g, '');
    if (!cleanPhone) {
      setFormError('Please enter a 10-digit mobile number');
      return;
    }

    try {
      setIsLoggingIn(true);
      if (authMode === 'password') {
        if (!passwordInput) {
          setFormError('Please enter your password (demo: demo1234)');
          setIsLoggingIn(false);
          return;
        }
        const user = await login(cleanPhone, passwordInput);
        const match = DEMO_ROLE_CREDENTIALS.find((c) => c.phone === user.phone);
        router.push(match?.primaryRoute || '/dashboard');
      } else {
        if (!otpInput) {
          setFormError('Please enter the 6-digit OTP (demo: 123456)');
          setIsLoggingIn(false);
          return;
        }
        const user = await loginWithOtp(cleanPhone, otpInput);
        const match = DEMO_ROLE_CREDENTIALS.find((c) => c.phone === user.phone);
        router.push(match?.primaryRoute || '/dashboard');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Invalid credentials');
      setIsLoggingIn(false);
    }
  };

  // Helper for role icon in strictly monochrome tone
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'DONOR':
        return <Heart className="w-4 h-4 text-neutral-300" />;
      case 'TRANSPORT':
        return <Truck className="w-4 h-4 text-neutral-300" />;
      case 'BLOOD_BANK':
        return <Droplets className="w-4 h-4 text-neutral-300" />;
      case 'DHO':
        return <BarChart3 className="w-4 h-4 text-neutral-300" />;
      case 'STATE_ADMIN':
        return <ShieldCheck className="w-4 h-4 text-neutral-300" />;
      case 'FACILITY_ADMIN':
      default:
        return <Building2 className="w-4 h-4 text-neutral-300" />;
    }
  };

  const activeCred = DEMO_ROLE_CREDENTIALS.find(
    (c) => c.phone === currentUser?.phone || c.role === activeRole
  );

  return (
    <div className="min-h-[82vh] py-6 sm:py-10 max-w-6xl mx-auto space-y-8">
      {/* Page Title & Portal Badge */}
      <div className="text-center space-y-2 max-w-xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-neutral-300" />
          <span>LifeLink Sign In • Navi Mumbai & Mumbai Health Mesh</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-neutral-200 tracking-tight">
          Sign In to Your Workspace
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
          Protected health network. Enter your mobile credentials below or select any test role to log in.
        </p>
      </div>

      {/* Active Session Notification (if already logged in) */}
      {currentUser && (
        <div className="p-4 rounded-xl bg-[#121214] border border-neutral-750 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-400 shrink-0"></div>
            <div>
              <span className="text-neutral-500 block font-mono text-[11px]">Currently Authenticated:</span>
              <span className="text-neutral-200 font-semibold text-sm">
                {activeCred?.roleTitle || currentUser.role}
              </span>
              <span className="text-neutral-500 text-xs ml-2 font-mono">
                ({activeCred?.facilityName || currentUser.facility?.name || 'Assigned Facility'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href={activeCred?.primaryRoute || '/dashboard'}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-medium text-xs shadow-sm transition-colors text-center"
            >
              Open Dashboard →
            </Link>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Responsive Layout: Actual Login Form + All Demo Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (5 cols): The Actual Login Form */}
        <div className="lg:col-span-5 bg-[#121214] border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
          <div>
            <div className="w-9 h-9 rounded-lg bg-neutral-850 border border-neutral-750 flex items-center justify-center font-bold text-xs text-neutral-300 mb-3">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-200">
              Account Login
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Enter your registered mobile number and password or 2G SMS OTP.
            </p>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Phone Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400 font-mono">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-neutral-500 font-mono">
                  +91
                </span>
                <input
                  type="text"
                  placeholder="9820011001"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full pl-12 pr-3 py-2.5 bg-[#0a0a0c] border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 font-mono"
                />
              </div>
            </div>

            {/* Password vs OTP Mode Switcher */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`text-xs font-mono pb-1 border-b-2 transition-colors ${
                    authMode === 'password'
                      ? 'border-neutral-400 text-neutral-200 font-medium'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    if (!otpInput) setOtpInput('123456');
                  }}
                  className={`text-xs font-mono pb-1 border-b-2 transition-colors ${
                    authMode === 'otp'
                      ? 'border-neutral-400 text-neutral-200 font-medium'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  2G SMS OTP
                </button>
              </div>

              <span className="text-[11px] text-neutral-500 font-mono">
                {authMode === 'password' ? 'Demo: demo1234' : 'OTP: 123456'}
              </span>
            </div>

            {/* Input for Password or OTP */}
            {authMode === 'password' ? (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="123456"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 font-mono text-center tracking-widest"
                />
                <span className="text-[10px] text-neutral-500 text-center block font-mono">
                  Demo bypass OTP: <strong className="text-neutral-300">123456</strong>
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn || isLoadingPersona}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <span className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Universal Helper */}
          <div className="pt-3 border-t border-neutral-850 text-xs text-neutral-500 font-mono flex items-center justify-between">
            <span>Pass: <strong className="text-neutral-300">demo1234</strong></span>
            <span>•</span>
            <span>OTP: <strong className="text-neutral-300">123456</strong></span>
            <span>•</span>
            <span>2G SMS Ready</span>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Demo Role Credentials Directory with Category Tabs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-semibold text-neutral-200">
                Demo Credentials Directory
              </h2>
              <p className="text-xs text-neutral-400">
                Select any role category below to test specific stakeholder workflows.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono bg-[#121214] px-2.5 py-1 rounded border border-neutral-800 shrink-0">
              <Sparkles className="w-3 h-3 text-neutral-400" />
              <span>1-Click Sign In</span>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Roles', count: DEMO_ROLE_CREDENTIALS.length },
              { id: 'clinics', label: 'Hospitals & Clinics', count: DEMO_ROLE_CREDENTIALS.filter((c) => c.category === 'clinics').length },
              { id: 'blood', label: 'Blood Centres', count: DEMO_ROLE_CREDENTIALS.filter((c) => c.category === 'blood').length },
              { id: 'logistics', label: 'Fleet Transport', count: DEMO_ROLE_CREDENTIALS.filter((c) => c.category === 'logistics').length },
              { id: 'governance', label: 'Governance & Admin', count: DEMO_ROLE_CREDENTIALS.filter((c) => c.category === 'governance').length },
              { id: 'donor', label: 'Citizen Donors', count: DEMO_ROLE_CREDENTIALS.filter((c) => c.category === 'donor').length },
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                      : 'bg-[#121214] text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${isActive ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by role title or facility name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#0a0a0c] border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtered Credentials List */}
          <div className="space-y-2.5">
            {(() => {
              const filtered = DEMO_ROLE_CREDENTIALS.filter((cred) => {
                const matchesCategory = selectedCategory === 'all' || cred.category === selectedCategory;
                const q = searchQuery.toLowerCase().trim();
                const matchesSearch = !q ||
                  cred.roleTitle.toLowerCase().includes(q) ||
                  cred.facilityName.toLowerCase().includes(q) ||
                  cred.phone.includes(q) ||
                  cred.scopeDescription.toLowerCase().includes(q);
                return matchesCategory && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-xs font-mono text-neutral-500 rounded-xl border border-neutral-850 bg-[#121214]">
                    No credentials match the current category and search query.
                  </div>
                );
              }

              return filtered.map((cred) => {
                const isSelected = phoneInput === cred.phone || selectedCredPhone === cred.phone;
                const isCurrent = currentUser?.phone === cred.phone;
                const icon = getRoleIcon(cred.role);

                return (
                  <div
                    key={cred.phone}
                    onClick={() => handleSelectCredential(cred)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group ${
                      isSelected
                        ? 'bg-neutral-850 border-neutral-600 ring-1 ring-neutral-700'
                        : 'bg-[#121214] hover:bg-[#18181c] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Left: Role Info & Facility */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:border-neutral-700 transition-colors mt-0.5 sm:mt-0">
                        {icon}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                            {cred.roleTitle}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono border border-neutral-700">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-400 font-mono truncate">
                          {cred.facilityName}
                        </p>

                        <p className="text-[11px] text-neutral-500 leading-snug">
                          {cred.scopeDescription}
                        </p>
                      </div>
                    </div>

                    {/* Right: Credentials (Phone, Pass) & Login Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-850 font-mono">
                      <div className="text-left sm:text-right text-xs">
                        <span className="text-neutral-300 font-bold block">
                          +91 {cred.phone}
                        </span>
                        <span className="text-[11px] text-neutral-500 block">
                          pass: <code className="text-neutral-400">{cred.password}</code>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCredential(cred);
                        }}
                        className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] text-neutral-200 font-sans font-medium flex items-center gap-1 group-hover:border-neutral-600 transition-colors"
                      >
                        <span>Sign In</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Clean Guidance Link to How It Works Guide */}
      <div className="pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-400" />
          <span>Need guidance on testing specific roles and triage flows?</span>
        </div>
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white underline transition-colors font-sans"
        >
          <span>View Step-by-Step Role Demonstration Protocols</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
