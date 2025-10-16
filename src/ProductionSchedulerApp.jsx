
import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect as Select } from "@/components/ui/select";
import { Download, Upload, Play, Share2, Plus, Layers } from "lucide-react";

const LANE_HEIGHT = 100;
const GRID = 20;
const NODE_HEIGHT = 64;

function uid(prefix = "id"){ return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }
function snapToGrid(x, y){
  const sx = Math.round(x / GRID) * GRID;
  const sy = Math.round(y / (LANE_HEIGHT)) * LANE_HEIGHT + (LANE_HEIGHT - NODE_HEIGHT) / 2;
  return { x: sx, y: sy };
}
function collides(a, b){
  const ax2 = a.position.x + a.data.duration * GRID;
  const bx2 = b.position.x + b.data.duration * GRID;
  const sameLane = a.data.machineId === b.data.machineId;
  return sameLane && !(ax2 <= b.position.x || bx2 <= a.position.x);
}
function findFirstNonOverlapPosition(nodes, baseNode){
  let x = Math.max(0, baseNode.position.x);
  let candidate = { ...baseNode, position: { ...baseNode.position, x } };
  while (nodes.some((n) => n.id !== candidate.id && collides(candidate, n))) {
    const blockers = nodes.filter((n) => n.id !== candidate.id && n.data.machineId === candidate.data.machineId && collides({ ...candidate, position: { ...candidate.position, x } }, n));
    if (blockers.length === 0) break;
    const rightmost = Math.max(...blockers.map((n) => n.position.x + n.data.duration * GRID));
    x = Math.round(rightmost / GRID) * GRID;
    candidate = { ...candidate, position: { ...candidate.position, x } };
  }
  return candidate.position;
}

function JobNode({ data, selected }){
  return (
    <div className={`rounded-2xl shadow-md px-3 py-2 border ${selected ? "ring-2 ring-offset-2" : ""}`} style={{ width: data.duration * GRID, height: NODE_HEIGHT, background: data.color || "var(--background)" }}>
      <div className="text-sm font-semibold truncate">{data.title}</div>
      <div className="text-xs opacity-70">{data.duration}u • {data.machineName || "Unassigned"}</div>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
}
const nodeTypes = { job: JobNode };

export default function ProductionSchedulerApp(){
  return (
    <ReactFlowProvider>
      <SchedulerShell />
    </ReactFlowProvider>
  );
}

function SchedulerShell(){
  const rf = useReactFlow();
  const [machines, setMachines] = useState([
    { id: uid("m"), name: "CNC-01" },
    { id: uid("m"), name: "Press-02" },
  ]);

  const initialNodes = useMemo(() => {
    const m0 = machines[0]?.id;
    return [{
      id: uid("job"),
      type: "job",
      data: { title: "Job A", duration: 6, machineId: m0, machineName: machines[0]?.name, color: "#F1F5F9" },
      position: { x: 0, y: (LANE_HEIGHT - NODE_HEIGHT) / 2 },
      draggable: true,
    }];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newJob, setNewJob] = useState({ title: "", duration: 4, machineId: machines[0]?.id });
  const [newMachine, setNewMachine] = useState("");

  const laneY = useCallback((machineId) => {
    const idx = machines.findIndex((m) => m.id === machineId);
    return idx * LANE_HEIGHT + (LANE_HEIGHT - NODE_HEIGHT) / 2;
  }, [machines]);

  const addMachine = useCallback(() => {
    if (!newMachine.trim()) return;
    setMachines((prev) => [...prev, { id: uid("m"), name: newMachine.trim() }]);
    setNewMachine("");
  }, [newMachine]);

  const addJob = useCallback(() => {
    if (!newJob.title.trim()) return;
    const machineId = newJob.machineId || machines[0]?.id;
    const m = machines.find((x) => x.id === machineId);
    const id = uid("job");
    const node = {
      id,
      type: "job",
      data: { title: newJob.title.trim(), duration: Number(newJob.duration || 1), machineId, machineName: m?.name },
      position: { x: 0, y: laneY(machineId) },
      draggable: true,
    };
    setNodes((ns) => {
      const snapped = { ...node, position: snapToGrid(node.position.x, node.position.y) };
      const placed = { ...snapped, position: findFirstNonOverlapPosition(ns, snapped) };
      return [...ns, placed];
    });
    setNewJob({ title: "", duration: 4, machineId });
  }, [machines, newJob, laneY, setNodes]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)), [setEdges]);

  const onNodeDrag = useCallback((evt, n, ns) => {
    const { x, y } = snapToGrid(n.position.x, n.position.y);
    const idx = Math.round(y / LANE_HEIGHT);
    const machine = machines[idx];
    if (!machine) return;
    n.position.x = Math.max(0, x);
    n.position.y = (idx * LANE_HEIGHT) + (LANE_HEIGHT - NODE_HEIGHT) / 2;
    n.data = { ...n.data, machineId: machine.id, machineName: machine.name };
  }, [machines]);

  const onNodeDragStop = useCallback((evt, n) => {
    setNodes((prev) => {
      const updated = prev.map((p) => (p.id === n.id ? n : p));
      const corrected = updated.map((p) => {
        if (p.id !== n.id) return p;
        const targetPos = findFirstNonOverlapPosition(updated, p);
        return { ...p, position: targetPos };
      });
      return corrected;
    });
  }, [setNodes]);

  const autoPackLane = useCallback((machineId) => {
    setNodes((prev) => {
      const sameLane = prev.filter((n) => n.data.machineId === machineId).sort((a, b) => a.position.x - b.position.x);
      let x = 0;
      const packed = sameLane.map((n) => {
        const snapped = Math.max(x, Math.round(n.position.x / GRID) * GRID);
        const placed = { ...n, position: { ...n.position, x: snapped } };
        x = snapped + n.data.duration * GRID;
        return placed;
      });
      const others = prev.filter((n) => n.data.machineId !== machineId);
      return [...others, ...packed];
    });
  }, [setNodes]);

  const exportJSON = useCallback(() => {
    const payload = { machines, nodes, edges, meta: { grid: GRID, laneHeight: LANE_HEIGHT, createdAt: new Date().toISOString() } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production-schedule-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [machines, nodes, edges]);

  const importRef = useRef(null);
  const importJSON = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    setMachines(data.machines || []);
    setNodes((data.nodes || []).map((n) => ({ ...n, draggable: true })));
    setEdges(data.edges || []);
  }, []);

  const lanesHeight = machines.length * LANE_HEIGHT;

  return (
    <div className="w-full h-[100vh] grid" style={{ gridTemplateColumns: '340px 1fr' }}>
      <div className="border-r p-4 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <div className="text-base font-semibold">Új gép</div>
          <div className="flex gap-2">
            <Input placeholder="Pl. CNC-03" value={newMachine} onChange={(e) => setNewMachine(e.target.value)} />
            <Button onClick={addMachine}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-base font-semibold">Új munka</div>
          <div className="space-y-1">
            <Label htmlFor="jobTitle">Cím</Label>
            <Input id="jobTitle" placeholder="Pl. Rendelés #512" value={newJob.title} onChange={(e) => setNewJob((s) => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Időtartam (egység)</Label>
            <Input type="number" min={1} value={newJob.duration} onChange={(e) => setNewJob((s) => ({ ...s, duration: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <Label>Gép</Label>
            <Select value={newJob.machineId} onChange={(v) => setNewJob((s) => ({ ...s, machineId: v }))}>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="w-full" onClick={addJob}>Hozzáadás</Button>
            <Button variant="secondary" className="w-full" onClick={() => autoPackLane(newJob.machineId || machines[0]?.id)} title="Tömörítés a kiválasztott gép sávján"><Layers className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-base font-semibold">Export / Import</div>
          <div className="flex gap-2">
            <Button onClick={exportJSON}><Download className="w-4 h-4 mr-2" />Export</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary"><Upload className="w-4 h-4 mr-2" />Import</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ütemezés importálása</DialogTitle></DialogHeader>
                <input ref={importRef} type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0])} />
                <DialogFooter>
                  <Button onClick={() => importRef.current?.click()}>Fájl kiválasztása</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="text-sm leading-relaxed opacity-80">
          • Húzd a munkákat vízszintesen az idő tengely mentén (GRID: {GRID}px / egység).<br/>
          • Függőleges húzás rásznapol a gépsávokra.<br/>
          • Ütközés esetén automatikus eltolás a legkorábbi üres helyre.
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 w-full pointer-events-none" style={{ height: lanesHeight }}>
          {machines.map((m, i) => (
            <div key={m.id} className="absolute left-0 w-full border-b" style={{ top: i * LANE_HEIGHT, height: LANE_HEIGHT }}>
              <div className="pointer-events-auto absolute left-2 top-2 text-xs font-medium bg-white/70 rounded px-2 py-1 shadow">{m.name}</div>
            </div>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          proOptions={{ hideAttribution: true }}
          className="!h-[100vh]"
        >
          <Background gap={GRID} size={1} />
          <MiniMap pannable zoomable />
          <Controls />
          <Panel position="top-center" className="mt-2 bg-white/80 backdrop-blur rounded-full shadow px-3 py-1 text-xs">
            Idő egység: {GRID}px • Sáv magasság: {LANE_HEIGHT}px
          </Panel>
          <Panel position="top-right" className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={() => machines.forEach((m) => autoPackLane(m.id))}><Play className="w-4 h-4 mr-2" />Auto-pack</Button>
            <Button variant="outline"><Share2 className="w-4 h-4 mr-2" />Megosztás (hamarosan)</Button>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
