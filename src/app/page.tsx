'use client';
import React from 'react';
import { MissionNav } from '../components/controls/MissionNav';
import { TopologyCanvas } from '../components/canvas/TopologyCanvas';
import { VirtualTerminal } from '../components/terminal/VirtualTerminal';
import { DeepStackInspector } from '../components/inspector/DeepStackInspector';

export default function SimulatorPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Top Mission Navigation */}
      <MissionNav />

      {/* Main 3-Pane Layout */}
      <main className="flex-1 p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Left / Center Area: Topology Canvas & Virtual Terminal (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-3 h-full overflow-hidden">
          {/* Top Canvas (55% height) */}
          <div className="h-[55%] min-h-[300px]">
            <TopologyCanvas />
          </div>

          {/* Bottom Virtual Terminal (45% height) */}
          <div className="h-[45%] min-h-[220px]">
            <VirtualTerminal />
          </div>
        </section>

        {/* Right Pane: Deep-Stack Inspector (4 cols) */}
        <aside className="lg:col-span-4 h-full overflow-hidden">
          <DeepStackInspector />
        </aside>
      </main>
    </div>
  );
}
