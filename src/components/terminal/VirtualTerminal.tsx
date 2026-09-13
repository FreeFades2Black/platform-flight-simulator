'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Terminal as TermIcon, Play, CornerDownLeft } from 'lucide-react';

export const VirtualTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ cmd?: string; output: string }>>([
    {
      output: `================================================================================
Platform Flight Simulator - Triage Shell v1.4
Connected to Cluster: site-01-canary [us-gov-east-1a]
Type "help" to view diagnostic commands or "tcpdump -nnvv -i eth0" to trace packets.
================================================================================`,
    },
  ]);
  const { executeCommand, currentMission } = useSimulationStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const output = executeCommand(cmd);

    setHistory((prev) => [...prev, { cmd, output }]);
    setInput('');
  };

  const getQuickCommands = () => {
    if (currentMission === 'mission-01') {
      return ['tcpdump -nnvv -i eth0', 'ip link show flannel.1', 'fix-mtu'];
    }
    if (currentMission === 'mission-02') {
      return ['dmesg -T | grep -i oom', 'kubectl describe pod kafka-broker-0', 'resolve-oom'];
    }
    if (currentMission === 'mission-03') {
      return ['kubectl describe pod', 'kubectl get volumeattachment', 'unlock-storage'];
    }
    return ['kubectl get pod -o yaml', 'strip-finalizer'];
  };

  return (
    <div className="w-full h-full bg-[#090d13] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl font-mono">
      {/* Terminal Bar */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-xs text-slate-400 font-bold ml-2 flex items-center gap-1.5">
            <TermIcon className="w-3.5 h-3.5 text-cyan-400" />
            root@site-01-node-b:~#
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-1 hidden sm:inline">Playbooks:</span>
          {getQuickCommands().map((qc) => (
            <button
              key={qc}
              onClick={() => {
                const output = executeCommand(qc);
                setHistory((prev) => [...prev, { cmd: qc, output }]);
              }}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[10px] border border-slate-700 transition-colors"
            >
              {qc}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal History */}
      <div className="flex-1 p-3 overflow-y-auto text-xs space-y-2 text-slate-200 font-mono">
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            {item.cmd && (
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="text-slate-500">$</span>
                <span>{item.cmd}</span>
              </div>
            )}
            <pre className="whitespace-pre-wrap text-slate-300 font-mono text-[11px] leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/40">
              {item.output}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Prompt Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800/80 bg-slate-950 p-2 flex items-center gap-2">
        <span className="text-cyan-400 font-bold text-xs pl-2">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter triage command (e.g. tcpdump, dmesg, fix-mtu)..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
          autoFocus
        />
        <button
          type="submit"
          className="p-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 transition-colors"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
