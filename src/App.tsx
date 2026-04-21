import React, { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Layers, 
  Activity, 
  Box, 
  Cpu, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Info,
  Database,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { motion, AnimatePresence } from "motion/react";
import { v4 as uuidv4 } from 'uuid';
import { toast, Toaster } from 'sonner';
import { analyzeProject } from './lib/gemini';
import { storageService } from './lib/storage';
import { Project, SpektrResult } from './types';
import { cn } from './lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(storageService.getActiveId());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; data: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedProjects = await storageService.getAllProjects();
        setProjects(storedProjects);
        
        // Restore active project if exists in the list
        const lastId = storageService.getActiveId();
        if (lastId && storedProjects.some(p => p.id === lastId)) {
          setActiveProjectId(lastId);
        }
      } catch (error) {
        toast.error('Error al cargar la capa de persistencia.');
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save active ID when changed
  useEffect(() => {
    storageService.saveActiveId(activeProjectId);
  }, [activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (rev: ProgressEvent<FileReader>) => {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: rev.target?.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (rev) => {
      try {
        const content = rev.target?.result as string;
        const importedProjects = JSON.parse(content);
        
        // Basic validation: ensure it's an array of projects with valid structure
        if (Array.isArray(importedProjects) && importedProjects.length > 0) {
          const isValid = importedProjects.every(p => p.id && p.name && p.analysis);
          if (isValid) {
            await storageService.importBackup(importedProjects);
            const freshProjects = await storageService.getAllProjects();
            setProjects(freshProjects);
            toast.success("Memoria local restaurada con éxito.");
          } else {
            toast.error("El archivo no tiene un formato válido de ARKHÉ.");
          }
        } else {
          toast.error("El archivo está vacío o mal formado.");
        }
      } catch (err) {
        toast.error("Error crítico al leer el archivo de backup.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleStartAnalysis = async () => {
    if (!newName || !newDesc) {
      toast.error('Nombre y Brief requeridos.');
      return;
    }

    setIsAnalyzing(true);
    toast.info('ARKHÉ: Iniciando motores de agentes STRATOS, AXON y MORPHO...');

    try {
      const result = await analyzeProject(
        newDesc,
        uploadedFiles.map(f => ({ data: f.data, mimeType: f.type }))
      );

      const newProject: Project = {
        id: uuidv4(),
        name: newName,
        description: newDesc,
        budget_per_m2: newBudget,
        createdAt: new Date().toISOString(),
        files: uploadedFiles,
        analysis: result
      };

      await storageService.saveProject(newProject);
      setProjects([newProject, ...projects]);
      setActiveProjectId(newProject.id);
      setIsCreating(false);
      resetForm();
      toast.success('Expediente generado y persistido con éxito.');
    } catch (error) {
      toast.error('Error en el motor lógico ARKHÉ.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewBudget(0);
    setUploadedFiles([]);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a AAA app, we use a softer confirmation or internal dialog, but for now browser confirmation is tactical
    if (window.confirm('¿Desea abortar la misión? Esta acción eliminará el expediente de la memoria local permanentemente.')) {
      try {
        await storageService.deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) setActiveProjectId(null);
        toast.success('Expediente purgado correctamente.');
      } catch (error) {
        toast.error('Error al purgar expediente de memoria.');
      }
    }
  };

  return (
    <div className="flex h-screen bg-bg selection:bg-accent selection:text-white">
      <Toaster position="top-right" expand={true} richColors />
      
      {/* SIDEBAR: LEVEL 1 (EXPLORER) */}
      <motion.aside 
        animate={{ width: isSidebarCollapsed ? 64 : 280 }}
        className="border-r border-line bg-surface flex flex-col z-20 shrink-0 relative"
      >
        <div className="h-16 border-b border-line flex items-center px-4 justify-between shrink-0">
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="font-black text-xl tracking-[0.3em] text-navy"
            >
              ARKHÉ
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 hover:bg-bg rounded-none border border-line text-navy"
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className="p-4 border-b border-line shrink-0">
          <Button 
            className="w-full h-11 rounded-none bg-navy hover:bg-ink text-white font-bold text-[10px] uppercase tracking-widest gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
            {!isSidebarCollapsed && "NUEVA INGESTA"}
          </Button>
          {!isSidebarCollapsed && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              <input 
                placeholder="BUSCAR EXPEDIENTE..."
                className="w-full h-9 bg-bg border border-line text-[10px] pl-9 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredProjects.map(p => (
              <div 
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={cn(
                  "group p-3 cursor-pointer border border-transparent transition-all",
                  activeProjectId === p.id ? "bg-accent/5 border-accent" : "hover:bg-bg"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 flex items-center justify-center shrink-0 border",
                      activeProjectId === p.id ? "border-accent text-accent" : "border-line text-muted"
                    )}>
                      <FileText size={14} />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="overflow-hidden">
                        <div className="text-[11px] font-bold text-navy truncate uppercase tracking-tight">{p.name}</div>
                        <div className="text-[9px] text-muted font-mono">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <button 
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && !isSidebarCollapsed && (
              <div className="p-8 text-center border border-dashed border-line mt-4">
                <Box className="mx-auto text-line mb-2" size={24} />
                <span className="text-[10px] text-muted uppercase font-bold tracking-widest leading-tight block">
                  No se encontraron expedientes.
                </span>
              </div>
            )}
          </div>
        </ScrollArea>

        {!isSidebarCollapsed && (
          <div className="mt-auto border-t border-line p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-muted uppercase tracking-widest">Memoria Local</span>
              <span className="text-[9px] font-mono text-accent">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="xs" 
                className="text-[8px] h-6 rounded-none border-line hover:bg-bg"
                onClick={async () => {
                  const data = await storageService.exportBackup();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `arkhe_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  toast.success('Backup generado con éxito.');
                }}
              >
                EXPORTAR
              </Button>
              <Button 
                variant="outline" 
                size="xs" 
                className="text-[8px] h-6 rounded-none border-line hover:bg-bg relative"
                onClick={() => document.getElementById('import-memory-input')?.click()}
              >
                IMPORTAR
                <input
                  type="file"
                  id="import-memory-input"
                  className="hidden"
                  accept=".json"
                  onChange={handleImportBackup}
                />
              </Button>
              <Button 
                variant="outline" 
                size="xs" 
                className="text-[8px] h-6 rounded-none border-line hover:text-destructive hover:bg-destructive/5 col-span-2"
                onClick={async () => {
                  if (window.confirm('¿PURGAR TODA LA MEMORIA? Esta acción es irreversible.')) {
                    await storageService.clearAll();
                    setProjects([]);
                    setActiveProjectId(null);
                    toast.success('Memoria purgada totalmente.');
                  }
                }}
              >
                PURGAR TODA LA MEMORIA LOCAL
              </Button>
            </div>
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-line text-[9px] font-mono text-muted uppercase flex justify-between">
            <span>v2.4 (AAA)</span>
            <span className="text-accent animate-pulse">● SYS_READY</span>
          </div>
        )}
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* HEADER: ENGINE STATUS */}
        <header className="h-16 border-b border-line px-6 flex items-center justify-between bg-surface/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-accent" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black text-navy uppercase tracking-widest">Motor Lógico</span>
                <span className="text-[8px] font-mono text-muted">AISTUDIO_GEMINI_PRO</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-line" />
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-accent text-accent bg-accent/5 rounded-none text-[9px] py-0 px-1.5 h-5 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                AR-TRACE: ACTIVE
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Profile removed - awaiting OAuth integration */}
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {activeProject ? (
              <ProjectView key={activeProject.id} project={activeProject} />
            ) : (
              <EmptyState onStart={() => setIsCreating(true)} />
            )}
          </AnimatePresence>
        </div>

        {/* PROGRESS BAR (Simulated / Real during analysis) */}
        {isAnalyzing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg z-50">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 15, ease: "linear" }}
              className="h-full bg-accent animate-beam shadow-[0_0_10px_var(--color-accent)]"
            />
          </div>
        )}
      </main>

      {/* NEW PROJECT MODAL (INGESTA) */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-4xl p-0 h-[600px] border-line rounded-none gap-0 overflow-hidden flex flex-col">
          <div className="h-1 bg-accent/20">
             <div className="h-full bg-accent w-1/3 animate-pulse" />
          </div>
          
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Form */}
            <div className="w-7/12 p-8 border-r border-line bg-surface overflow-y-auto scrollbar-hide">
              <div className="mb-8">
                <h2 className="text-2xl font-serif italic text-navy">Nueva Ingesta ARKHÉ</h2>
                <p className="technical-label mt-1">Gobernanza de Proyectos Sistémicos</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">01. Identificador del Proyecto</label>
                  <Input 
                    placeholder="Nombre del Proyecto..." 
                    className="rounded-none border-line h-12 text-lg font-bold text-navy focus-visible:ring-accent"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">02. Brief Arquitectónico</label>
                  <textarea 
                    placeholder="Describe las necesidades, el usuario y la visión del proyecto..." 
                    className="w-full min-h-[140px] p-4 bg-bg border border-line focus:outline-none focus:ring-1 focus:ring-accent text-sm font-sans"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                  <div className="text-[9px] text-muted flex justify-between">
                    <span>SE RECOMIENDA MÍN. 50 CARACTERES</span>
                    <span>{newDesc.length} CHARS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">03. Parámetro Económico (Opcional)</label>
                  <div className="flex">
                    <div className="h-11 px-4 bg-bg border border-r-0 border-line flex items-center text-[10px] font-mono text-muted">MXN/m2</div>
                    <Input 
                      type="number"
                      placeholder="Ej. 15000" 
                      className="rounded-none border-line h-11 border-l-0 text-navy font-mono"
                      value={newBudget || ''}
                      onChange={(e) => setNewBudget(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Files & Agent Status */}
            <div className="w-5/12 p-8 bg-bg flex flex-col gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">04. Carga Multimodal</label>
                <div className="dropzone">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="file-upload" 
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                    <div className="w-12 h-12 border-2 border-dashed border-line flex items-center justify-center text-muted mb-4 group-hover:border-accent">
                       <Upload size={20} />
                    </div>
                    <span className="text-[11px] font-bold text-navy uppercase">PDF / Imágenes</span>
                    <span className="text-[10px] text-muted mt-1 underline">Seleccionar archivos</span>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <ScrollArea className="h-32 border border-line bg-surface p-2">
                    <div className="space-y-1">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-bg border border-line text-[10px] font-mono">
                          <span className="truncate max-w-[150px]">{f.name}</span>
                          <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                            <Trash2 size={12} className="text-muted hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="mt-auto space-y-4">
                <div className="p-4 bg-navy/[0.03] border border-line space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-bold uppercase tracking-tighter text-muted">Satus de Agentes</span>
                     <span className="text-[9px] font-mono text-accent">STANDBY</span>
                   </div>
                   <div className="space-y-2">
                     <AgentStatus label="STRATOS" status="READY" />
                     <AgentStatus label="AXON" status="READY" />
                     <AgentStatus label="MORPHO" status="READY" />
                   </div>
                </div>

                <Button 
                  disabled={isAnalyzing || !newName || !newDesc}
                  className="w-full h-14 rounded-none bg-accent hover:bg-[#007070] text-white font-black tracking-[0.2em] relative overflow-hidden group"
                  onClick={handleStartAnalysis}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <Cpu className="animate-spin" size={16} />
                      ANALIZANDO...
                    </span>
                  ) : (
                    "INICIAR MOTOR ARKHÉ"
                  )}
                  <motion.div 
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-white/30"
                    animate={isAnalyzing ? { left: ["-100%", "100%"] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectView({ project }: { project: Project; key?: any }) {
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCanvasFullscreen) {
        setIsCanvasFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCanvasFullscreen]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex-1 flex gap-6 overflow-hidden"
    >
      {/* Panel 1: Synthesis (Left/Main) */}
      <div className="flex-[3] tech-panel">
        <div className="tech-header">
          <div className="flex gap-4">
            <span className="tech-title">01. Síntesis Sistémica</span>
            <div className="h-4 w-[1px] bg-line" />
            <span className="tech-title text-muted font-normal underline decoration-accent/30 lowercase italic">Stratos & Axon Logic</span>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="text-[9px] rounded-none py-0 h-4 uppercase tracking-tighter">Valid: 80%</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 border-b border-line shrink-0">
            <TabsList className="h-12 bg-transparent w-full justify-start gap-8">
              <TabTrigger value="overview" label="D0. Sociograma" sub="Causa-Efecto" />
              <TabTrigger value="sintesis" label="D1. Síntesis" sub="Árbol Técnico" />
              <TabTrigger value="medios" label="D2. Medios" sub="Diagnóstico" />
              <TabTrigger value="files" label="D3. Documentos" sub="Ingesta" />
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <TabsContent value="overview" className="mt-0 h-full flex flex-col">
               <div className="flex-1 flex flex-col min-h-0 space-y-8">
                 <div className="grid grid-cols-3 gap-6 shrink-0">
                   <MetricBox label="Causa" value={project.analysis.sociograma.causa} />
                   <MetricBox label="Efecto" value={project.analysis.sociograma.efecto} />
                   <MetricBox label="Objetivo" value={project.analysis.sociograma.objetivo} />
                 </div>
                 
                 <div className={cn(
                   "relative border-2 border-line rounded-2xl bg-slate-50 transition-all duration-500 shadow-inner group/socio",
                   isCanvasFullscreen ? "fixed inset-0 z-[1000] rounded-none h-screen w-screen bg-bg" : "w-full h-[70vh] min-h-[500px] overflow-hidden"
                 )}>
                   {/* Fullscreen Toggle Controls */}
                   <div className="absolute top-4 right-4 flex items-center gap-3 z-30">
                     <button 
                       onClick={() => setIsCanvasFullscreen(!isCanvasFullscreen)}
                       className="p-3 bg-white/90 backdrop-blur-md border border-line shadow-2xl hover:bg-navy hover:text-white transition-all group/expand active:scale-95"
                       title={isCanvasFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                     >
                       {isCanvasFullscreen ? (
                         <Minimize2 size={20} className="group-hover/expand:rotate-180 transition-transform duration-500" />
                       ) : (
                         <Maximize2 size={20} className="group-hover/expand:scale-110 transition-transform" />
                       )}
                     </button>
                   </div>

                   <div className="absolute top-4 left-4 text-[8px] font-mono text-muted uppercase z-10 transition-opacity group-hover/socio:opacity-100 opacity-50">
                     SPEKTR_TRACE_ENGINE // {isCanvasFullscreen ? 'FULL_IMMERSION_MODE' : 'Canvas Mode v2.0'}
                   </div>
                   
                   <ScrollArea className="h-full w-full touch-pan-x touch-pan-y overscroll-none">
                     <div 
                       className="p-10 md:p-32 flex flex-col items-center relative"
                       style={{ 
                         minWidth: '1440px', 
                         minHeight: '1200px',
                         backgroundImage: 'radial-gradient(var(--navy) 0.5px, transparent 0.5px)',
                         backgroundSize: '32px 32px',
                         backgroundColor: 'rgba(248, 250, 252, 0.8)'
                       }}
                     >
                        {/* Logic Map Header */}
                        <div className="mb-24 text-center">
                          <Badge variant="outline" className="mb-4 border-navy text-navy bg-white uppercase tracking-[0.4em] text-[10px] px-4 py-1.5 font-black shrink-0">
                            System Intelligence // SPEKTR_TRACE
                          </Badge>
                          <h2 className="text-4xl font-black text-navy uppercase tracking-tighter">
                            LOGIC TRACE MAP <span className="text-navy/20">v3.0</span>
                          </h2>
                          <div className="mt-4 h-1.5 w-16 bg-accent mx-auto" />
                        </div>

                        <div className="relative flex flex-col items-center gap-32">
                          {/* Core Strategic Node: Forced Width 1:1 Scale */}
                          <div className="relative group/core">
                             <div className="absolute -inset-4 bg-accent/10 rounded-none blur-2xl opacity-0 group-hover/core:opacity-100 transition-opacity duration-700"></div>
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               whileHover={{ scale: 1.02, rotateY: 1 }}
                               className="relative w-[450px] p-12 bg-white border-4 border-navy shadow-[20px_20px_0px_0px_rgba(0,47,86,0.1)] text-center cursor-pointer perspective-1000"
                             >
                                <span className="absolute -top-4 left-8 bg-navy text-[11px] px-4 py-1.5 text-white font-black tracking-[0.3em] uppercase shadow-xl">
                                  CORE_OBJECTIVE
                                </span>
                                <p className="text-lg font-black leading-tight text-navy uppercase">
                                  {project.analysis.sociograma.objetivo}
                                </p>
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-accent/20 border-r-4 border-b-4 border-navy/10" />
                             </motion.div>
                          </div>
                          
                          {/* Structural Connector (Engineered visualization) */}
                          <div className="h-32 w-[3px] bg-navy/10 relative flex flex-col items-center">
                             <div className="absolute top-0 w-12 h-[1px] bg-navy/10" />
                             <div className="absolute top-1/2 -translate-y-1/2 flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                             </div>
                             <ChevronDown className="absolute -bottom-4 text-navy/20" size={40} />
                          </div>
                          
                          {/* Primary Stakeholders Interaction Tier: Forced Layout */}
                          <div className="grid grid-cols-2 gap-40 w-full max-w-7xl pb-24 items-start">
                             <motion.div 
                               initial={{ opacity: 0, x: -60 }}
                               animate={{ opacity: 1, x: 0 }}
                               whileHover={{ y: -15, borderColor: 'var(--accent)' }}
                               className="w-[520px] p-12 border-2 border-line bg-surface flex flex-col gap-8 group transition-all hover:shadow-[0_50px_100px_rgba(0,112,112,0.12)] cursor-help justify-self-end relative"
                             >
                                <div className="absolute -left-1.5 top-6 w-1.5 h-16 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between border-b border-line/60 pb-6">
                                  <div className="flex flex-col">
                                    <span className="text-[14px] font-black text-accent uppercase tracking-widest mb-1">Input // Raíz Sistémica</span>
                                    <span className="text-[10px] font-mono text-muted uppercase">Logic Origin Agent</span>
                                  </div>
                                  <Activity size={24} className="text-accent/30 group-hover:text-accent transition-colors" />
                                </div>
                                <p className="text-lg text-navy font-bold leading-relaxed italic serif-italic opacity-95">
                                  "{project.analysis.sociograma.causa}"
                                </p>
                                <div className="mt-10 pt-6 border-t border-line/40 flex justify-between items-center text-[12px] font-mono text-muted uppercase tracking-[0.3em]">
                                  <span className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-accent/30 rounded-full" />
                                    STRATOS // ENGINE
                                  </span>
                                  <span className="text-accent font-black">Verified</span>
                                </div>
                             </motion.div>

                             <motion.div 
                               initial={{ opacity: 0, x: 60 }}
                               animate={{ opacity: 1, x: 0 }}
                               whileHover={{ y: -15, borderColor: 'var(--navy)' }}
                               className="w-[520px] p-12 border-2 border-line bg-surface flex flex-col gap-8 group transition-all hover:shadow-[0_50px_100px_rgba(0,65,106,0.12)] cursor-help relative"
                             >
                                <div className="absolute -right-1.5 top-6 w-1.5 h-16 bg-navy opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between border-b border-line/60 pb-6">
                                  <div className="flex flex-col">
                                    <span className="text-[14px] font-black text-navy/40 uppercase tracking-widest mb-1 group-hover:text-navy transition-colors">Output // Impacto Final</span>
                                    <span className="text-[10px] font-mono text-muted uppercase">Logic Destination Axon</span>
                                  </div>
                                  <CheckCircle2 size={24} className="text-navy/10 group-hover:text-navy transition-colors" />
                                </div>
                                <p className="text-lg text-navy font-bold leading-relaxed italic serif-italic opacity-95">
                                  "{project.analysis.sociograma.efecto}"
                                </p>
                                <div className="mt-10 pt-6 border-t border-line/40 flex justify-between items-center text-[12px] font-mono text-muted uppercase tracking-[0.3em]">
                                  <span className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-navy/10 rounded-full" />
                                    AXON // LOGIC
                                  </span>
                                  <span className="text-navy/40 font-black">Calculated</span>
                                </div>
                             </motion.div>
                          </div>

                          {/* Tertiary Co-Stakeholder Tier: Discovery Hub */}
                          <div className="w-full max-w-7xl space-y-16">
                             <div className="flex items-center gap-12">
                                <div className="flex-1 h-[3px] bg-gradient-to-r from-transparent via-line to-transparent" />
                                <span className="text-[12px] font-black text-muted/50 uppercase tracking-[0.6em] shrink-0">Peripheral System Stakeholders</span>
                                <div className="flex-1 h-[3px] bg-gradient-to-r from-transparent via-line to-transparent" />
                             </div>
                             
                             <div className="grid grid-cols-3 gap-12">
                                {[
                                  { l: 'GOBIERNO', s: 'REGULACIÓN JURÍDICA', d: 'Normativa ISO/Local Architectural' },
                                  { l: 'USUARIO', s: 'EXPERIENCIA HUMANA', d: 'Factor Antropométrico & Percepción' },
                                  { l: 'SITIO', s: 'CONDICIONES CLIMÁTICAS', d: 'Impacto Ambiental & Regenerativo' }
                                ].map((item, i) => (
                                  <motion.div 
                                    key={i} 
                                    whileHover={{ y: -12, borderColor: 'var(--accent)', backgroundColor: 'rgba(255,255,255,0.8)' }}
                                    className="p-10 border-2 border-dashed border-line bg-surface/50 text-center transition-all cursor-crosshair shadow-sm hover:shadow-2xl flex flex-col items-center gap-3"
                                  >
                                     <div className="text-[11px] font-black text-accent/60 mb-2 tracking-[0.4em] uppercase">{item.l}</div>
                                     <div className="text-[15px] font-black text-navy tracking-tight">{item.s}</div>
                                     <div className="mt-3 text-[10px] font-mono text-muted uppercase tracking-tighter opacity-70 italic leading-snug">{item.d}</div>
                                  </motion.div>
                                ))}
                             </div>
                          </div>
                        </div>
                     </div>
                     <ScrollBar orientation="horizontal" className="bg-navy/5 h-4" />
                     <ScrollBar orientation="vertical" className="bg-navy/5 w-4" />
                   </ScrollArea>

                   {/* UI OVERLAY: Navigation Indicator */}
                   <div className="absolute bottom-6 right-6 pointer-events-none flex flex-col items-end gap-3 z-20">
                     <div className="bg-white/90 backdrop-blur-xl border-2 border-navy/10 p-4 rounded-xl shadow-2xl flex items-center gap-4">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] font-black text-navy uppercase tracking-widest">MODE: CANVAS_LOCKED</span>
                           <span className="text-[8px] font-mono text-accent">ENGINE_DPI: 1:1 // SCALE: FIXED</span>
                        </div>
                        <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(0,112,112,0.5)]" />
                     </div>
                   </div>
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="sintesis" className="mt-0 h-full flex flex-col overflow-hidden">
               <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
                 <CardHeader className="px-0 pb-4">
                   <CardTitle className="text-navy flex items-center gap-2 text-sm uppercase tracking-widest font-black">
                     <Database className="h-4 w-4 text-accent" />
                     Síntesis Sistémica (D0, D1, D2, D3)
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                    <ScrollArea className="h-[65vh] w-full rounded-md border border-line bg-surface">
                      <div className="min-w-[800px]">
                        <Table>
                          <TableHeader className="bg-bg sticky top-0 z-20 shadow-sm">
                            <TableRow className="hover:bg-transparent border-line">
                              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-muted">Código</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted">Nivel / Local</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted">Subsistema</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted">m² Est.</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted">Requerimientos (R1-R5)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.analysis?.system_tree.map((item, index) => (
                              <TableRow key={item.id} className="border-line hover:bg-navy/[0.02] transition-colors">
                                <TableCell className="font-mono text-[10px] text-accent font-bold">
                                  {item.id.substring(0, 8).toUpperCase()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-none bg-navy text-white border-navy">
                                      D1
                                    </Badge>
                                    <span className="text-[12px] font-bold text-navy">{item.local}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[11px] text-muted font-medium">
                                  {item.subsistema}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-navy text-[11px]">
                                  {item.m2_estimado}m²
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex gap-1">
                                    {Object.entries(item.requerimientos).map(([key, val]) => (
                                      <RequirementBadge key={key} r={key} text={val} />
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {(!project.analysis?.system_tree || project.analysis.system_tree.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                  <div className="flex flex-col items-center justify-center gap-2 text-muted">
                                    <Search size={24} className="opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Sin registros sistémicos</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="medios" className="mt-0">
               <div className="grid grid-cols-2 gap-4">
                 {Object.entries(project.analysis.medios).map(([key, val]) => (
                   <div key={key} className="tech-panel h-full group hover:border-accent transition-all">
                      <div className="tech-header bg-navy text-white border-none py-1 h-8">
                        <span className="tech-title text-white">{key}</span>
                        <Activity size={12} className="text-accent opacity-50" />
                      </div>
                      <ScrollArea className="h-[180px] p-5">
                         <div className="relative">
                           <div className="absolute -left-3 top-0 w-[1px] h-full bg-accent/20" />
                           <p className="text-xs text-navy leading-loose serif-italic opacity-90">{val}</p>
                         </div>
                      </ScrollArea>
                   </div>
                 ))}
               </div>
            </TabsContent>
            
            <TabsContent value="files" className="mt-0">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {project.files.map((f, i) => (
                   <div key={i} className="p-4 border border-line bg-surface flex items-center gap-4 group transition-all hover:border-accent">
                      <div className="w-12 h-12 border border-line flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent/5">
                        <Upload size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-navy truncate uppercase">{f.name}</div>
                        <div className="text-[9px] text-muted font-mono">{f.type}</div>
                      </div>
                      <ExternalLink size={14} className="text-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                   </div>
                 ))}
                 {project.files.length === 0 && (
                   <div className="col-span-2 p-12 text-center border-2 border-dashed border-line">
                      <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Sin archivos adjuntos</p>
                   </div>
                 )}
               </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Panel 2: Validation (Right) */}
      <div className="flex-[2] flex flex-col gap-6 overflow-hidden">
        <div className="flex-1 tech-panel min-h-0">
          <div className="tech-header">
            <span className="tech-title">02. Validación Morpho</span>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-mono text-muted uppercase">Interaction Matrix</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <span className="technical-label">Matriz de proximidad (MUTHER)</span>
                   <div className="flex gap-2">
                      {['A','E','I','O','U','X'].map(v => (
                        <div key={v} className="flex items-center gap-1">
                          <div className={cn(
                            "w-2 h-2",
                            v === 'A' && "bg-accent",
                            v === 'X' && "bg-destructive",
                            v === 'U' && "bg-bg border border-line"
                          )} />
                          <span className="text-[8px] font-bold">{v}</span>
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="matrix-grid">
                  {project.analysis.interaction_matrix.slice(0, 36).map((rel, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "matrix-cell",
                        rel.clase === 'A' && "cell-high",
                        rel.clase === 'X' && "cell-critical",
                        // Fallback for visual variety in empty cells if needed
                        (rel.clase === 'U' || !rel.clase) && "hover:bg-bg"
                      )}
                      title={`${rel.from} → ${rel.to}: ${rel.razon}`}
                    >
                      {rel.clase}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recursivity Alerta */}
              {project.analysis.budget_validation.alert && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-amber/10 border-l-4 border-amber space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber" />
                    <span className="text-[10px] font-black text-amber uppercase tracking-widest">MORPHO ALERT // RECURSIVIDAD</span>
                  </div>
                  <p className="text-[11px] text-navy italic leading-snug">
                    {project.analysis.budget_validation.recommendation}
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono border-t border-amber/20 pt-2 text-amber">
                    <span>Desviación Presupuesto</span>
                    <span className="font-bold">{project.analysis.budget_validation.deviation}%</span>
                  </div>
                </motion.div>
              )}

              {/* Technical Output JSON */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="technical-label">ARKHÉ Technical Output</span>
                    <button 
                      className="text-[9px] font-bold text-accent hover:underline flex items-center gap-1"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(project.analysis, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `arkhe-${project.id}.json`;
                        a.click();
                      }}
                    >
                      EXPORT_JSON <ExternalLink size={10} />
                    </button>
                 </div>
                 <div className="json-viewport h-[180px] relative overflow-hidden">
                    <div className="absolute inset-0 overflow-auto scrollbar-hide p-4">
                       <pre className="text-[10px] leading-tight text-accent opacity-80">
                         {JSON.stringify(project.analysis, null, 2)}
                       </pre>
                    </div>
                 </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="h-14 tech-panel flex-row items-center px-4 justify-between bg-navy shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Expediente Audit-Ready</span>
          </div>
          <Button variant="outline" className="h-8 rounded-none border-white/20 text-white bg-white/5 hover:bg-white/10 text-[9px] font-bold py-0">
             MARCAR COMO AUDITADO
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border border-line bg-surface flex flex-col gap-1 transition-all hover:border-accent group">
      <span className="label-micro text-muted group-hover:text-accent">{label}</span>
      <p className="text-[11px] font-bold text-navy uppercase leading-tight">{value}</p>
    </div>
  );
}

function RequirementBadge({ r, text }: { r: string; text: string; key?: any }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div 
          className="w-5 h-5 flex items-center justify-center text-[9px] font-bold border border-line bg-surface text-muted cursor-help transition-all hover:bg-navy hover:text-white hover:border-navy"
        >
          {r.toUpperCase()}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="w-64 bg-navy p-4 text-white shadow-2xl z-50 animate-in fade-in zoom-in duration-200" 
          sideOffset={8}
          align="start"
        >
          <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
            <span className="font-black text-[9px] uppercase tracking-[0.2em] text-accent">REQUI_TECH_{r.toUpperCase()}</span>
            <Info size={10} className="text-white/40" />
          </div>
          <p className="font-serif italic text-xs leading-relaxed opacity-90">{text}</p>
          <Popover.Arrow className="fill-navy" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AgentStatus({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
         <div className="w-1.5 h-1.5 bg-line" />
         <span className="text-[10px] font-bold text-navy">{label}</span>
      </div>
      <span className="text-[9px] font-mono text-muted">{status}</span>
    </div>
  );
}

function TabTrigger({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="rounded-none h-12 flex flex-col items-start px-0 border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent pb-1"
    >
      <span className="text-[11px] font-mono tracking-tight text-navy">{label}</span>
      <span className="text-[8px] font-black uppercase text-muted tracking-wide">{sub}</span>
    </TabsTrigger>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-line bg-surface/30">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center max-w-sm text-center"
      >
        <div className="w-20 h-20 border border-line flex items-center justify-center text-line mb-6 relative">
           <Layers size={32} />
           <div className="absolute top-0 right-0 w-2 h-2 bg-accent/20" />
           <div className="absolute bottom-0 left-0 w-2 h-2 bg-navy/20" />
        </div>
        <h3 className="text-xl font-serif italic text-navy mb-2">Ingesta Pendiente</h3>
        <p className="text-xs text-muted mb-8 uppercase tracking-widest font-medium">
          El motor lógico ARKHÉ está en reposo. Inicie un nuevo expediente para comenzar el análisis sistémico.
        </p>
        <Button 
          onClick={onStart}
          className="rounded-none bg-navy font-bold text-[10px] px-8 tracking-[.2em] uppercase h-12"
        >
          NUEVA INGESTA
        </Button>
      </motion.div>
    </div>
  );
}
