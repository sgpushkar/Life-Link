'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Send,
  Terminal,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export default function FeaturePhoneSimulatorPage() {
  const [mode, setMode] = useState<'SMS' | 'USSD'>('SMS');
  const [smsPhone] = useState('9820011001'); // NMMC Nerul UHC Facility Admin
  const [smsInput, setSmsInput] = useState('NEED VENT 1 URGENT 5');
  const [screenText, setScreenText] = useState(
    'LIFELINK 2G\nREADY\nTYPE: NEED VENT 1 URGENT 5'
  );
  const [isBusy, setIsBusy] = useState(false);

  // USSD State
  const [ussdSessionId] = useState(`USSD_${Date.now()}`);
  const [ussdText, setUssdText] = useState('*123#');
  const [, setUssdHistory] = useState<string[]>([]);

  const handleKeypadPress = (val: string) => {
    if (mode === 'SMS') {
      setSmsInput((prev) => prev + val);
    } else {
      setUssdText((prev) => prev + val);
    }
  };

  const handleBackspace = () => {
    if (mode === 'SMS') {
      setSmsInput((prev) => prev.slice(0, -1));
    } else {
      setUssdText((prev) => prev.slice(0, -1));
    }
  };

  const handleSendSms = async (customCommand?: string) => {
    const textToSend = customCommand || smsInput;
    if (!textToSend) return;

    setIsBusy(true);
    setScreenText(`SENDING SMS:\n"${textToSend}"\nTO: 55432...`);

    try {
      const res = await apiRequest('/sms/inbound', {
        method: 'POST',
        body: JSON.stringify({
          fromPhone: smsPhone,
          body: textToSend,
        }),
      });

      setScreenText(`REPLY FROM LIFELINK:\n\n${res.reply}`);
    } catch (err: any) {
      setScreenText(`NETWORK ERROR:\n${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDialUssd = async (overrideText?: string) => {
    const dialString = overrideText !== undefined ? overrideText : ussdText;
    setIsBusy(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ussdSessionId,
          phoneNumber: smsPhone,
          text: dialString === '*123#' ? '' : dialString.replace('*123#*', ''),
        }),
      });

      const reply = await res.text();
      setScreenText(reply);
      setUssdHistory((prev) => [...prev, dialString]);
    } catch (err: any) {
      setScreenText(`USSD FAILED:\n${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const quickSmsTemplates = [
    { label: 'Need Ventilator', cmd: 'NEED VENT 1 URGENT 5' },
    { label: 'Need Blood B+', cmd: 'NEED BLOOD B+ 2 URGENT 4' },
    { label: 'Find Ventilator', cmd: 'FIND VENT' },
    { label: 'Update Stock to 3', cmd: 'STOCK VENT 3' },
    { label: 'Pledge Blood', cmd: 'PLEDGE' },
    { label: 'Help', cmd: 'HELP' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="p-5 rounded-lg mono-card">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> 2G GSM Fallback
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
            SMS & USSD
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mt-1">
          Feature Phone Simulator
        </h2>
        <p className="text-xs text-zinc-400">
          Simulate offline requests via SMS commands and USSD menu (*123#).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Phone Device Graphic with Keypad */}
        <div className="md:col-span-6 flex justify-center">
          <div className="w-[280px] rounded-[32px] bg-[#101012] border-2 border-zinc-800 p-4 shadow-2xl space-y-3.5">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-1 rounded-full bg-zinc-800"></div>
              <span className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase font-semibold">
                LifeLink 2G
              </span>
            </div>

            {/* Monochrome LCD Screen */}
            <div className="relative w-full h-[170px] rounded-lg bg-black border border-zinc-800 p-3 flex flex-col justify-between overflow-hidden">
              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-400 border-b border-zinc-900 pb-1">
                <span>2G AIRTEL</span>
                <span>{mode === 'SMS' ? 'SMS' : 'USSD'}</span>
                <span>95%</span>
              </div>

              <div className="relative z-10 font-mono text-[11px] text-zinc-200 leading-tight whitespace-pre-wrap overflow-y-auto max-h-[105px]">
                {screenText}
              </div>

              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-zinc-400 border-t border-zinc-900 pt-0.5">
                <span>[SELECT]</span>
                <span>[CLEAR]</span>
              </div>
            </div>

            {/* Nav & Dial Keys */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('SMS')}
                className={`py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                  mode === 'SMS'
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                SMS
              </button>
              <button
                onClick={() => {
                  setMode('USSD');
                  handleDialUssd('*123#');
                }}
                className={`py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                  mode === 'USSD'
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                *123#
              </button>
              <button
                onClick={handleBackspace}
                className="py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono font-bold"
              >
                DEL
              </button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {[
                { n: '1', sub: '.,-' },
                { n: '2', sub: 'ABC' },
                { n: '3', sub: 'DEF' },
                { n: '4', sub: 'GHI' },
                { n: '5', sub: 'JKL' },
                { n: '6', sub: 'MNO' },
                { n: '7', sub: 'PQRS' },
                { n: '8', sub: 'TUV' },
                { n: '9', sub: 'WXYZ' },
                { n: '*', sub: 'USSD' },
                { n: '0', sub: 'SPACE' },
                { n: '#', sub: 'LOCK' },
              ].map((k) => (
                <button
                  key={k.n}
                  onClick={() => {
                    if (k.n === '0') handleKeypadPress(' ');
                    else handleKeypadPress(k.n);
                  }}
                  className="py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white flex flex-col items-center justify-center border border-zinc-800 transition-all"
                >
                  <span className="font-mono text-sm font-semibold leading-none">{k.n}</span>
                  <span className="text-[8px] text-zinc-500 font-mono tracking-wider">
                    {k.sub}
                  </span>
                </button>
              ))}
            </div>

            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 mx-auto"></div>
          </div>
        </div>

        {/* Right Column: Quick Testing Controls */}
        <div className="md:col-span-6 space-y-5">
          <div className="p-5 rounded-lg mono-card space-y-4">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <span>Quick Commands</span>
            </h3>

            <div className="space-y-2">
              {quickSmsTemplates.map((t) => (
                <button
                  key={t.cmd}
                  onClick={() => {
                    setSmsInput(t.cmd);
                    handleSendSms(t.cmd);
                  }}
                  disabled={isBusy}
                  className="w-full text-left p-2.5 rounded-md bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <span className="font-medium text-xs text-white block">{t.label}</span>
                    <span className="font-mono text-[11px] text-zinc-400">{t.cmd}</span>
                  </div>
                  <Send className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>

            {/* Custom Bar */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <label className="text-[11px] text-zinc-400 block font-mono">Custom SMS</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  placeholder="NEED VENT 1 URGENT 5"
                  className="flex-1 px-3 py-1.5 rounded-md bg-black border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <button
                  onClick={() => handleSendSms()}
                  disabled={isBusy}
                  className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
