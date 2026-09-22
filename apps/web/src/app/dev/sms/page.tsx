'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  Smartphone,
  CheckCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { getClientSocket } from '../../../lib/socket';

export default function SmsSimulatorPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/logistics/sms/outbox');
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load SMS outbox:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();

    const socket = getClientSocket();
    if (socket) {
      socket.on('sms:received', (newMsg: any) => {
        setMessages((prev) => [newMsg, ...prev]);
      });
      socket.on('feature_phone:sms_exchange', (data: any) => {
        if (data?.outbound) {
          setMessages((prev) => [data.outbound, ...prev]);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('sms:received');
        socket.off('feature_phone:sms_exchange');
      }
    };
  }, [fetchMessages]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between p-5 rounded-lg mono-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Gateway Dispatch
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            SMS Dispatch Log
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time outbound notifications and alert dispatches.
          </p>
        </div>

        <button
          onClick={fetchMessages}
          className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white transition-colors"
          title="Refresh outbox"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Message Stream */}
      <div className="space-y-2.5">
        {messages.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500 mono-card rounded-lg">
            Outbox is empty.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="p-3.5 rounded-lg mono-card space-y-2 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-zinc-400" />
                  <span className="font-mono font-medium text-white">{msg.toPhone}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 font-mono text-zinc-400 border border-zinc-800">
                    {msg.provider.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  <span className="text-zinc-300 flex items-center gap-0.5 ml-1">
                    <CheckCheck className="w-3.5 h-3.5 text-zinc-400" /> Sent
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-black text-xs font-mono text-zinc-300 leading-relaxed border border-zinc-800">
                {msg.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
