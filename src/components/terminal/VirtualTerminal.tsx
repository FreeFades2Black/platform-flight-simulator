'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Terminal as TermIcon, CornerDownLeft, ShieldCheck, Play } from 'lucide-react';

export const VirtualTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ cmd?: string; output: string }>>([
    {
      output: `================================================================================
Platform Flight Simulator - Triage Shell v1.4
Connected Cluster: site-01-canary [us-gov-east-1a]
Active Session: Full 18-Scenario Failure Taxonomy Ready.
Type "help" to view diagnostic commands, or click any suggested playbook chip below.
Type "nominal" or click "Remediate" to restore pipeline baseline.
================================================================================`,
    },
  ]);
  const { executeCommand, scenarioInfo, activeScenario } = useSimulationStore();
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

  const handleCommandClick = (cmd: string) => {
    const output = executeCommand(cmd);
    setHistory((prev) => [...prev, { cmd, output }]);
  };

  return (
    <div className="w-full h-full bg-[#090d13] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl font-mono">
      {/* Terminal Top Bar */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-xs text-slate-400 font-bold ml-2 flex items-center gap-1.5">
            <TermIcon className="w-3.5 h-3.5 text-cyan-400" />
            root@site-01-triage:~#
          </span>
        </div>

        {/* Dynamic Context-Aware Playbook Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 mr-1 hidden sm:inline">Playbooks:</span>
          {scenarioInfo.suggestedCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleCommandClick(cmd)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 text-[10px] border border-slate-700/80 transition-colors"
            >
              {cmd}
            </button>
          ))}
          {scenarioInfo.remediationCommand && scenarioInfo.remediationCommand !== 'N/A (Healthy)' && (
            <button
              onClick={() => handleCommandClick(scenarioInfo.remediationCommand)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[10px] border border-emerald-600/50 font-bold transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              {scenarioInfo.remediationCommand}
            </button>
          )}
        </div>
      </div>

      {/* Terminal History Display */}
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

      {/* Command Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800/80 bg-slate-950 p-2 flex items-center gap-2">
        <span className="text-cyan-400 font-bold text-xs pl-2">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Enter triage command (or run "${scenarioInfo.suggestedCommands[0] || 'help'}")...`}
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
