import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Minimize2,
  FolderOpen,
  ArrowRight
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
import { Project, SpektrResult, SystemNode, SpatialBlock } from './types';
import { ArkheLogo } from './components/branding/Logo';
import { ZoningMap } from './components/ZoningMap';
import { MutherGrid } from './components/MutherGrid';
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
import { MermaidDiagram } from './components/MermaidDiagram';
import { EmptyState } from './components/EmptyState';
import { generateMermaidCode } from './lib/utils';

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
            await storageService.importBackup(content);
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
      const { result, updatedHistory } = await analyzeProject(
        newDesc,
        uploadedFiles.map(f => ({ data: f.data, mimeType: f.type })),
        [] // Initial history is empty
      );

      const newProject: Project = {
        id: uuidv4(),
        name: newName,
        description: newDesc,
        budget_per_m2: newBudget,
        createdAt: new Date().toISOString(),
        files: uploadedFiles,
        analysis: result,
        history: updatedHistory
      };

      await storageService.saveProject(newProject);
      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id);
      setIsCreating(false);
      resetForm();
      toast.success('Expediente generado y persistido con éxito.');
    } catch (error) {
      console.error("Error al crear o persistir el proyecto:", error);
      toast.error('Error en el motor lógico ARKHÉ.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReAnalyze = async (projectId: string, adjustments: string, newBudget?: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setIsAnalyzing(true);
    toast.info('ARKHÉ: Re-inyectando contexto y ajustando objetivos (Recursividad)...');

    try {
      const { result, updatedHistory } = await analyzeProject(
        adjustments,
        project.files.map(f => ({ data: f.data, mimeType: f.type })),
        project.history || []
      );

      const updatedProject: Project = {
        ...project,
        budget_per_m2: newBudget !== undefined ? newBudget : project.budget_per_m2,
        analysis: result,
        history: updatedHistory
      };

      await storageService.saveProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, analysis: result, history: updatedHistory, budget_per_m2: newBudget !== undefined ? newBudget : p.budget_per_m2 } : p));
      toast.success('Gobernanza completa: Objetivos ajustados y persistidos.');
    } catch (error) {
      toast.error('Error en el ciclo de recursividad ARKHÉ.');
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
    <div className="flex flex-col lg:flex-row h-screen bg-bg selection:bg-accent selection:text-white">
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
              className="flex-1"
            >
              <ArkheLogo variant="full" size={32} isAnalyzing={isAnalyzing} />
            </motion.div>
          )}
          {isSidebarCollapsed && (
            <div className="flex-1 flex justify-center">
              <ArkheLogo variant="icon" size={28} isAnalyzing={isAnalyzing} />
            </div>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative lg:h-screen">
        {/* HEADER: ENGINE STATUS */}
        <header className="h-16 border-b border-line px-6 flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-12">
            <ArkheLogo variant="full" size={36} isAnalyzing={isAnalyzing} className="hidden lg:flex" />
            
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
          </div>

          <div className="flex items-center gap-4">
             {/* Profile removed - awaiting OAuth integration */}
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {activeProject ? (
              <ProjectView 
                key={activeProject.id} 
                project={activeProject} 
                onReAnalyze={handleReAnalyze}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <EmptyState onStart={() => setIsCreating(true)} isAnalyzing={isAnalyzing} />
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

function ProjectView({ 
  project, 
  onReAnalyze, 
  isAnalyzing 
}: { 
  project: Project; 
  onReAnalyze: (id: string, adj: string, budget?: number) => Promise<void>; 
  isAnalyzing: boolean;
  key?: any;
}) {
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjText, setAdjText] = useState('');
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();
  const [showReasons, setShowReasons] = useState(true);

  // Mermaid Logic Synthesis
  const mermaidCode = useMemo(() => {
    if (!project.analysis) return '';
    return generateMermaidCode(project.analysis.system_tree, project.analysis.interaction_matrix, showReasons);
  }, [project.analysis, showReasons]);

  // SÍNTESIS INTEGRAL: Fallback para spatial_layout si la IA falla
  const processedLayout = useMemo(() => {
    if (!project.analysis) return [];
    if (project.analysis.spatial_layout && project.analysis.spatial_layout.length > 0) {
      return project.analysis.spatial_layout;
    }

    // Generador de Topología Predeterminado (Frontend-side synthesis)
    const flatLocals: SystemNode[] = [];
    const extract = (nodes: SystemNode[]) => {
      nodes.forEach(n => {
        if (n.type === 'Local') flatLocals.push(n);
        if (n.children) extract(n.children);
      });
    };
    extract(project.analysis.system_tree);

    return flatLocals.map((node, i) => {
      const area = node.calculated_m2 || 10;
      const size = Math.sqrt(area);
      return {
        id: node.id,
        name: node.name,
        zone: (node.name.toLowerCase().includes('baño') || node.name.toLowerCase().includes('dormitorio')) ? 'Privado' : 
              (node.name.toLowerCase().includes('cocina') || node.name.toLowerCase().includes('lavado')) ? 'Servicio' : 'Social',
        w: Math.sqrt(area) * 1.5,
        h: Math.sqrt(area) * 1.5,
        x: 40 + (Math.random() * 20),
        y: 40 + (Math.random() * 20)
      } as SpatialBlock;
    });
  }, [project.analysis]);

  const selectedBlock = processedLayout.find(b => b.id === selectedBlockId);
  
  const blockDetails = (() => {
    if (!selectedBlock || !project.analysis) return null;
    let found: SystemNode | null = null;
    const search = (nodes: SystemNode[]) => {
      for (const n of nodes) {
        // Universal Link: Estricto por ID para evitar colisiones de nombres
        if (n.id === selectedBlock.id) { 
          found = n; break; 
        }
        if (n.children) search(n.children);
      }
    };
    search(project.analysis.system_tree);
    return found;
  })();

  const isEstimationMode = !project.budget_per_m2 || project.budget_per_m2 === 0;

  const boundingBox = (() => {
    const fisico = project.analysis?.medios.Físico?.description || "";
    const match = fisico.match(/(\d+)\s*x\s*(\d+)/i);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 100, height: 100 };
  })();

  const handleFixBudget = async () => {
    if (!project.analysis?.budget_validation.estimated_investment) return;
    const avg = project.analysis.budget_validation.estimated_investment.avg_per_m2;
    await onReAnalyze(project.id, `FIJAR PRESUPUESTO SUGERIDO POR AXON-FIN: $${avg} MXN/m2. Proceder con validación técnica MORPHO.`, avg);
  };

  const downloadCSV = () => {
    if (!project.analysis) return;
    
    // Flatten logic for recursive tree
    const flatRows: any[] = [];
    const flatten = (nodes: SystemNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'Local') {
          flatRows.push({
            code: node.code,
            name: node.name,
            m2: node.calculated_m2,
            r1: node.requirements?.r1_funcional,
            r2: node.requirements?.r2_espacial,
            r3: node.requirements?.r3_tecnico,
            r4: node.requirements?.r4_psicologico,
            r5: node.requirements?.r5_flexibilidad
          });
        }
        if (node.children) flatten(node.children);
      });
    };
    
    flatten(project.analysis.system_tree);

    const headers = "Code,Name,Calculated_m2,R1_Funcional,R2_Espacial,R3_Tecnico,R4_Psicologico,R5_Flexibilidad\n";
    const rows = flatRows.map(item => {
      return `${item.code},"${item.name}",${item.m2},"${item.r1}","${item.r2}","${item.r3}","${item.r4}","${item.r5}"`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arkhe-v3.5-sintesis-${project.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    toast.success("CSV Jerárquico Revit-Ready generado.");
  };

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
        className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden"
    >
      {/* Panel 1: Synthesis (Left/Main) */}
      <div className="flex-[3] tech-panel flex flex-col overflow-hidden">
        <div className="tech-header">
          <div className="flex gap-4">
            <span className="tech-title">01. Síntesis Sistémica</span>
            <div className="h-4 w-[1px] bg-line" />
            <span className="tech-title text-muted font-normal underline decoration-accent/30 lowercase italic">Stratos & Axon Logic</span>
          </div>
          <div className="flex items-center gap-2">
             <Button 
               variant="outline" 
               size="xs" 
               className={cn(
                 "h-7 text-[9px] rounded-none border-line gap-2 uppercase tracking-widest font-black transition-all",
                 isReferenceOpen ? "bg-navy text-white" : ""
               )}
               onClick={() => setIsReferenceOpen(!isReferenceOpen)}
             >
               <FolderOpen size={12} />
               {isReferenceOpen ? "Cerrar Referencia" : "Referencia Técnica"}
             </Button>
             <div className="h-4 w-[1px] bg-line mx-2" />
             {project.analysis?.normative_confidence_score !== undefined && (
               <Badge variant="outline" className={cn(
                 "text-[9px] rounded-none py-0 h-4 uppercase tracking-tighter",
                 project.analysis.normative_confidence_score > 0.8 ? "text-emerald-500 border-emerald-500" : "text-amber border-amber"
               )}>
                 Confidence: {(project.analysis.normative_confidence_score * 100).toFixed(0)}%
               </Badge>
             )}
             <Badge variant="outline" className="text-[9px] rounded-none py-0 h-4 uppercase tracking-tighter">Valid: 80%</Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 border-b border-line shrink-0">
            <TabsList className="h-12 bg-transparent w-full justify-start gap-8">
              <TabTrigger value="overview" label="D0. Sociograma" sub="Causa-Efecto" />
              <TabTrigger value="sintesis" label="D1.1 Árbol" sub="Jerarquía" />
              <TabTrigger value="matriz" label="D1.2 Matriz" sub="Muther Grid" />
              <TabTrigger value="medios" label="D2. Medios" sub="Diagnóstico" />
              <TabTrigger value="arquitectura" label="D3. Arquitectura" sub="Zonificación" />
              {isEstimationMode && (
                <div className="flex items-center gap-2 px-4 border-l border-line ml-auto">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                   <span className="text-[9px] font-black text-amber uppercase tracking-widest">Modo Estimación Activo</span>
                </div>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <TabsContent value="overview" className="mt-0 h-full flex flex-col">
               <div className="flex-1 flex flex-col min-h-0 space-y-8">
                 <div className="grid grid-cols-3 gap-6 shrink-0">
                    <MetricBox label="Causa" value={project.analysis.sociograma.causa} isLoading={isAnalyzing} />
                    <MetricBox label="Efecto" value={project.analysis.sociograma.efecto} isLoading={isAnalyzing} />
                    <MetricBox label="Objetivo" value={project.analysis.sociograma.objetivo} isLoading={isAnalyzing} />
                  </div>
                 
                 <div className={cn(
                   "relative border-2 border-line rounded-2xl bg-slate-50 transition-all duration-500 shadow-inner group/socio",
                   isCanvasFullscreen ? "fixed inset-0 z-[1000] rounded-none h-screen w-screen bg-bg" : "w-full min-h-[70vh] overflow-hidden"
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
                       className="p-8 md:p-12 flex flex-col items-center relative w-full"
                       style={{ 
                         backgroundImage: 'radial-gradient(var(--navy) 0.5px, transparent 0.5px)',
                         backgroundSize: '32px 32px',
                         backgroundColor: 'rgba(248, 250, 252, 0.8)'
                       }}
                     >
                        {/* Logic Map Header */}
                        <div className="mb-12 text-center">
                          <Badge variant="outline" className="mb-4 border-navy text-navy bg-white uppercase tracking-[0.4em] text-[10px] px-4 py-1.5 font-black shrink-0">
                            System Intelligence // SPEKTR_TRACE
                          </Badge>
                          <h2 className="text-2xl font-black text-navy uppercase tracking-tighter">
                            LOGIC TRACE MAP <span className="text-navy/20">v3.0</span>
                          </h2>
                          <div className="mt-4 h-1 w-12 bg-accent mx-auto" />
                        </div>

                        <div className="relative flex flex-col items-center gap-4 w-full max-w-5xl">
                          {/* 01. Entrada Sistémica (Causa) */}
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5, borderColor: 'var(--accent)' }}
                            className="max-w-[380px] w-full p-8 border-2 border-line bg-surface flex flex-col gap-4 group transition-all hover:shadow-[0_20px_40px_rgba(0,112,112,0.08)] cursor-help relative"
                          >
                             <div className="absolute -left-1.5 top-6 w-1 h-12 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex items-center justify-between border-b border-line/60 pb-4">
                               <div className="flex flex-col">
                                 <span className="text-[12px] font-black text-accent uppercase tracking-widest mb-1">Input // Raíz Sistémica</span>
                                 <span className="text-[9px] font-mono text-muted uppercase">Origen: Stratos Engine</span>
                               </div>
                               <Activity size={20} className="text-accent/30 group-hover:text-accent transition-colors" />
                             </div>
                             <p className="text-sm text-navy font-bold leading-relaxed italic serif-italic opacity-95 text-center">
                               "{project.analysis.sociograma.causa}"
                             </p>
                          </motion.div>

                          {/* Vector de Trazabilidad Connector */}
                          <div className="h-12 w-[2px] bg-navy/10 relative flex flex-col items-center">
                             <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                                <span className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.3em] text-accent bg-bg px-2">Vector de Trazabilidad</span>
                             </div>
                             <ChevronDown className="absolute -bottom-3 text-navy/20" size={24} />
                          </div>

                          {/* 02. Objetivo Central */}
                          <div className="relative group/core w-full flex justify-center">
                             <div className="absolute -inset-4 bg-accent/10 rounded-none blur-2xl opacity-0 group-hover/core:opacity-100 transition-opacity duration-700"></div>
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               whileHover={{ scale: 1.02 }}
                               className="relative max-w-[320px] w-full p-8 bg-white border-4 border-navy shadow-[10px_10px_0px_0px_rgba(0,47,86,0.1)] text-center cursor-pointer mx-auto"
                             >
                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-navy text-[10px] px-4 py-1 text-white font-black tracking-[0.4em] uppercase shadow-xl whitespace-nowrap">
                                  OBJETIVO_ESTRATÉGICO
                                </span>
                                <p className="text-base font-black leading-tight text-navy uppercase">
                                  {project.analysis.sociograma.objetivo}
                                </p>
                             </motion.div>
                          </div>

                          {/* Resultado Esperado Connector */}
                          <div className="h-12 w-[2px] bg-navy/10 relative flex flex-col items-center">
                             <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-navy/30 animate-pulse" />
                                <span className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.3em] text-muted bg-bg px-2">Resultado Esperado</span>
                             </div>
                             <ChevronDown className="absolute -bottom-3 text-navy/20" size={24} />
                          </div>

                          {/* 03. Impacto Final (Efecto) */}
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: 5, borderColor: 'var(--navy)' }}
                            className="max-w-[380px] w-full p-8 border-2 border-line bg-surface flex flex-col gap-4 group transition-all hover:shadow-[0_20px_40px_rgba(0,65,106,0.08)] cursor-help relative"
                          >
                             <div className="absolute -right-1.5 top-6 w-1 h-12 bg-navy opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex items-center justify-between border-b border-line/60 pb-4">
                               <div className="flex flex-col">
                                 <span className="text-[12px] font-black text-navy/40 uppercase tracking-widest mb-1 group-hover:text-navy transition-colors">Output // Impacto Final</span>
                                 <span className="text-[9px] font-mono text-muted uppercase">Destino: Axon Logic</span>
                               </div>
                               <CheckCircle2 size={20} className="text-navy/10 group-hover:text-navy transition-colors" />
                             </div>
                             <p className="text-sm text-navy font-bold leading-relaxed italic serif-italic opacity-95 text-center">
                               "{project.analysis.sociograma.efecto}"
                             </p>
                          </motion.div>

                          {/* Tertiary Co-Stakeholder Tier: Discovery Hub */}
                          <div className="w-full space-y-12 mt-12">
                             <div className="flex items-center gap-8">
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-line to-transparent" />
                                <span className="text-[10px] font-black text-muted/50 uppercase tracking-[0.4em] shrink-0">Peripheral System Stakeholders</span>
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-line to-transparent" />
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                  { l: 'GOBIERNO', s: 'REGULACIÓN JURÍDICA', d: 'Normativa ISO/Local Architectural' },
                                  { l: 'USUARIO', s: 'EXPERIENCIA HUMANA', d: 'Factor Antropométrico & Percepción' },
                                  { l: 'SITIO', s: 'CONDICIONES CLIMÁTICAS', d: 'Impacto Ambiental & Regenerativo' }
                                ].map((item, i) => (
                                  <motion.div 
                                    key={i} 
                                    whileHover={{ y: -8, borderColor: 'var(--accent)', backgroundColor: 'rgba(255,255,255,0.8)' }}
                                    className="p-8 border-2 border-dashed border-line bg-surface/50 text-center transition-all cursor-crosshair shadow-sm hover:shadow-xl flex flex-col items-center gap-2"
                                  >
                                     <div className="text-[10px] font-black text-accent/60 mb-1 tracking-[0.3em] uppercase">{item.l}</div>
                                     <div className="text-[14px] font-black text-navy tracking-tight">{item.s}</div>
                                     <div className="mt-2 text-[9px] font-mono text-muted uppercase tracking-tighter opacity-70 italic leading-snug">{item.d}</div>
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
                 <CardHeader className="px-0 pb-4 flex flex-row items-center justify-between">
                   <CardTitle className="text-navy flex items-center gap-2 text-sm uppercase tracking-widest font-black">
                     <Database className="h-4 w-4 text-accent" />
                     Síntesis Sistémica (Jerarquía v3.5)
                   </CardTitle>
                   <Button 
                    variant="outline" 
                    className="h-7 text-[9px] rounded-none border-line gap-2 uppercase tracking-widest font-black"
                    onClick={downloadCSV}
                    disabled={!project.analysis}
                   >
                     <Upload size={12} className="rotate-180" />
                     EXPORTAR CSV (REVIT)
                   </Button>
                 </CardHeader>
                 <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-auto">
                    <ScrollArea className="h-[65vh] w-full rounded-md border border-line bg-surface">
                      <div className="min-w-[800px] p-4">
                        <div className="flex bg-bg border-b border-line py-2 px-4 font-black text-[10px] uppercase tracking-widest text-muted">
                          <div className="w-[120px]">Código</div>
                          <div className="flex-1">Nivel / Entidad</div>
                          <div className="w-[100px] text-right px-4">m²</div>
                          <div className="flex-1 text-left px-4">Requerimientos</div>
                        </div>
                        {project.analysis?.system_tree.map((node) => (
                          <TreeRow key={node.id} node={node} depth={0} />
                        ))}
                      </div>
                    </ScrollArea>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="matriz" className="mt-0 h-full flex flex-col overflow-hidden">
               <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                     <div className="flex flex-col text-navy">
                       <span className="text-[12px] font-black uppercase tracking-widest">D1.2 Matriz de Interacción de Muther</span>
                       <span className="text-[10px] font-mono text-muted uppercase">Análisis de Adyacencias Técnico-Funcionales</span>
                     </div>
                     <div className="flex items-center gap-4 bg-bg p-2 border border-line">
                        {['A', 'E', 'I', 'O', 'U', 'X'].map(c => (
                          <div key={c} className="flex items-center gap-1.5 px-1">
                             <div className={cn("w-3 h-3 flex items-center justify-center text-[7px] font-black border border-navy/10", 
                               c === 'A' ? 'bg-emerald-500 text-white' : 
                               c === 'X' ? 'bg-destructive text-white' : 'bg-slate-50 text-slate-400'
                             )}>{c}</div>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] font-mono text-muted uppercase mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 shrink-0" />
                      <span>A: Absolutamente Necesario</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-50 border border-line shrink-0" />
                      <span>E: Especialmente Importante</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-50 border border-line shrink-0" />
                      <span>I: Importante</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-50 border border-line shrink-0" />
                      <span>O: Ordinario</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-50 border border-line shrink-0" />
                      <span>U: Sin Importancia</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive shrink-0" />
                      <span>X: Indeseable</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 border border-line bg-surface shadow-inner">
                     <MutherGrid nodes={project.analysis.system_tree} interactions={project.analysis.interaction_matrix} />
                  </ScrollArea>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col text-navy">
                        <span className="text-[12px] font-black uppercase tracking-widest">3) Grafo de Interacción (Visualización Sistémica)</span>
                        <span className="text-[10px] font-mono text-muted uppercase">Motor Mermaid: Trazabilidad Inamovible</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="xs" 
                          className="h-7 text-[9px] rounded-none border-line gap-2 uppercase tracking-widest font-black"
                          onClick={() => {
                            navigator.clipboard.writeText(mermaidCode);
                            toast.success("Código Mermaid copiado al portapapeles.");
                          }}
                        >
                          Copiar Código
                        </Button>
                        <Button 
                          variant={showReasons ? "default" : "outline"} 
                          size="xs" 
                          className={cn(
                            "h-7 text-[9px] rounded-none gap-2 uppercase tracking-widest font-black",
                            showReasons ? "bg-navy text-white" : "border-line text-navy"
                          )}
                          onClick={() => setShowReasons(!showReasons)}
                        >
                          {showReasons ? "Ocultar Razones" : "Mostrar Razones"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-[10px] font-mono text-muted uppercase">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 border-t-4 border-navy shrink-0" />
                        <span>Líneas gruesas: Clase "A"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 border-t-2 border-navy shrink-0" />
                        <span>Líneas sólidas: Clase "E"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 border-t-2 border-navy border-dashed shrink-0" />
                        <span>Líneas punteadas: Clase "X"</span>
                      </div>
                    </div>
                    <MermaidDiagram code={mermaidCode} />
                  </div>
                  <div className="bg-amber/5 border-l-4 border-amber p-4 mt-2">
                     <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider leading-relaxed">
                        ANÁLISIS DE MASA: Las relaciones de clase "A" y "E" activan vectores de atracción en el motor MORPHO. 
                        Las relaciones "X" disparan fuerzas de repulsión reactiva.
                     </p>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="medios" className="mt-0 h-full">
               <div className="grid grid-cols-2 gap-6">
                 {/* Investment Consultant Card - Proactive UX */}
                 {isEstimationMode && project.analysis?.budget_validation.estimated_investment && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="col-span-2 tech-panel bg-navy text-white p-6 mb-2 border-accent/40 relative overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />
                     <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] border-accent text-accent uppercase font-black tracking-widest px-2">Axon-Fin Consulting</Badge>
                              <span className="text-[10px] font-mono text-white/60">ESTIMACIÓN PARAMÉTRICA v3.6</span>
                           </div>
                           <h3 className="text-2xl font-black uppercase tracking-tight">Inversión Sugerida: <span className="text-accent">${project.analysis.budget_validation.estimated_investment?.min?.toLocaleString() || 'N/A'} - ${project.analysis.budget_validation.estimated_investment?.max?.toLocaleString() || 'N/A'} MXN</span></h3>
                           <p className="text-[11px] text-white/70 max-w-2xl italic leading-loose">
                              Cálculo basado en <b>{project.analysis.budget_validation.total_m2}m²</b> proyectados y requerimientos técnicos detectados. Grado de confianza: <b>{project.analysis.budget_validation.estimated_investment.confidence}</b>.
                           </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 bg-white/5 p-4 border border-white/10 backdrop-blur-md">
                           <div className="text-center">
                              <div className="text-[9px] font-black uppercase text-accent mb-1 tracking-widest">Promedio Sugerido</div>
                              <div className="text-xl font-mono">${project.analysis.budget_validation.estimated_investment?.avg_per_m2?.toLocaleString() || 'N/A'} <span className="text-[10px] opacity-40">/m²</span></div>
                           </div>
                           <div className="flex gap-2">
                             {['Interés Social', 'Medio', 'Lujo'].map(level => (
                               <button
                                 key={level}
                                 onClick={() => onReAnalyze(project.id, `AJUSTAR ESTIMACIÓN: Cambiar nivel de acabados a "${level}". Recalcular inversión paramétrica.`)}
                                 className="text-[8px] font-black uppercase px-2 py-1 border border-white/20 hover:border-accent hover:bg-accent/20 transition-all"
                               >
                                 {level}
                               </button>
                             ))}
                           </div>
                           <Button 
                             onClick={handleFixBudget}
                             disabled={isAnalyzing}
                             className="bg-accent hover:bg-[#007070] text-white rounded-none h-10 w-full font-black text-[9px] uppercase tracking-[0.2em] shadow-xl"
                           >
                             {isAnalyzing ? "PROCESANDO..." : "FIJAR COMO PRESUPUESTO BASE"}
                           </Button>
                        </div>
                     </div>
                   </motion.div>
                 )}

                 {Object.entries(project.analysis.medios).map(([key, detail], index) => (
                   <div key={key} className="tech-panel h-full group hover:border-accent transition-all relative">
                      <div className="tech-header bg-navy text-white border-none py-1 h-10 px-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">M{index + 1}. {key}</span>
                          <span className="text-[8px] font-mono text-accent uppercase">{detail.importance}</span>
                        </div>
                        <Activity size={14} className="text-accent opacity-50" />
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="relative">
                          <div className="absolute -left-3 top-0 w-[1px] h-full bg-accent/20" />
                          <p className="text-xs text-navy leading-loose serif-italic opacity-90">{detail.description}</p>
                        </div>
                        
                        <div className="pt-4 border-t border-line/50">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-1 h-1 bg-accent" />
                             <span className="text-[9px] font-black text-muted uppercase tracking-tighter">Requerimiento General (RG)</span>
                          </div>
                          <div className="bg-bg text-navy px-3 py-2 border-l-2 border-accent font-mono text-[10px] leading-snug">
                             {detail.rg}
                          </div>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </TabsContent>

            <TabsContent value="arquitectura" className="mt-0 h-full">
               <div className="flex gap-6 h-full min-h-[600px]">
                  <div className="flex-[3] flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black text-navy uppercase tracking-widest">Plano Preliminar MORPHO</span>
                           <span className="text-[10px] font-mono text-muted uppercase">Sintetizador Espacial v3.7</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="xs"
                          className="h-8 rounded-none border-line text-[9px] font-black uppercase tracking-widest gap-2 bg-white"
                          onClick={() => {
                            const svg = document.querySelector('.arquitectura svg');
                            if (svg) {
                              const svgData = new XMLSerializer().serializeToString(svg);
                              const svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
                              const url = URL.createObjectURL(svgBlob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `arkhe-morpho-${project.id}.svg`;
                              link.click();
                            }
                          }}
                        >
                          <Maximize2 size={12} />
                          Exportar SVG
                        </Button>
                     </div>
                     
                     <div className="flex-1 bg-surface border border-line overflow-hidden architecture-canvas arquitectura h-[60vh] relative">
                        <ZoningMap 
                           layout={processedLayout}
                           interactions={project.analysis.interaction_matrix}
                           onSelectBlock={setSelectedBlockId}
                           selectedId={selectedBlockId}
                           isEstimationMode={isEstimationMode}
                           boundingBox={boundingBox}
                        />
                        
                        {/* Engine HUD */}
                        <div className="absolute top-4 left-4 z-20 space-y-2 pointer-events-none">
                           <div className="bg-white/80 backdrop-blur-md border border-line p-2 shadow-sm">
                              <div className="flex items-center gap-2 text-[9px] font-black uppercase text-navy">
                                 <Activity size={12} className="text-accent" />
                                 Live Physics Engine v2.7
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 min-w-[320px]">
                     <div className="tech-panel flex-1 h-full">
                        <div className="tech-header bg-navy text-white border-none py-1 h-10 px-4">
                           <span className="tech-title text-white">Cédula de Requerimientos</span>
                        </div>
                        {selectedBlock && blockDetails ? (
                          <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <Badge className="bg-accent text-white rounded-none text-[8px]">{blockDetails.code}</Badge>
                                     <span className="text-[10px] font-mono text-muted">{blockDetails.type}</span>
                                  </div>
                                  <h3 className="text-lg font-black text-navy uppercase tracking-tighter">{blockDetails.name}</h3>
                               </div>

                               <div className="space-y-4">
                                  <RequirementItem label="R1. Funcional" value={blockDetails.requirements?.r1_funcional} />
                                  <RequirementItem label="R2. Espacial" value={blockDetails.requirements?.r2_espacial} />
                                  <RequirementItem label="R3. Técnico" value={blockDetails.requirements?.r3_tecnico} />
                                  <RequirementItem label="R4. Psicológico" value={blockDetails.requirements?.r4_psicologico} />
                                  <RequirementItem label="R5. Flexibilidad" value={blockDetails.requirements?.r5_flexibilidad} />
                               </div>

                               <div className="pt-6 border-t border-line">
                                  <div className="flex justify-between items-center text-[10px] font-mono mb-4 text-muted">
                                     <span>Área Proyectada</span>
                                     <span className="font-bold text-navy">{blockDetails.calculated_m2} m²</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                     <div className="p-3 bg-bg border border-line text-center">
                                       <div className="text-[8px] font-black text-muted uppercase mb-1">Zona</div>
                                       <div className="text-[10px] font-bold text-navy uppercase">{selectedBlock.zone}</div>
                                     </div>
                                     <div className="p-3 bg-bg border border-line text-center">
                                       <div className="text-[8px] font-black text-muted uppercase mb-1">Status</div>
                                       <div className="text-[10px] font-bold text-emerald-500 uppercase">Validado</div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg/50 h-[300px]">
                             <Info size={24} className="text-muted mb-4 opacity-20" />
                             <p className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] leading-relaxed">
                                Seleccione un bloque de zonificación para auditar sus requerimientos particulares.
                             </p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* SIDEBAR: REFERENCIA TÉCNICA (Drawer Mode) */}
        <AnimatePresence>
          {isReferenceOpen && (
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="absolute top-0 right-0 h-full w-[320px] bg-white border-l border-line z-[60] shadow-[-20px_0_40px_rgba(0,0,0,0.1)] flex flex-col"
            >
              <div className="p-6 border-b border-line flex items-center justify-between bg-surface shrink-0">
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className="text-accent" />
                  <span className="text-[12px] font-black text-navy uppercase tracking-widest">Referencia Técnica</span>
                </div>
                <button onClick={() => setIsReferenceOpen(false)} className="text-muted hover:text-navy">
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                   <div className="space-y-4">
                     <p className="text-[10px] font-mono text-muted uppercase leading-relaxed">Documentos de ingesta vinculados al expediente actual:</p>
                     
                     <div className="space-y-2">
                        {project.files.map((f, i) => (
                          <div key={i} className="p-4 border border-line bg-bg flex items-center gap-4 group transition-all hover:border-accent cursor-pointer">
                            <div className="w-10 h-10 border border-line flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent/5 shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-navy truncate uppercase">{f.name}</div>
                              <div className="text-[8px] text-muted font-mono">{f.type}</div>
                            </div>
                            <ExternalLink size={12} className="text-muted opacity-0 group-hover:opacity-100" />
                          </div>
                        ))}
                        {project.files.length === 0 && (
                          <div className="p-8 text-center border-2 border-dashed border-line">
                            <p className="text-[9px] text-muted uppercase font-bold tracking-widest leading-relaxed">No hay documentos de referencia cargados.</p>
                          </div>
                        )}
                     </div>
                   </div>
                   
                   <div className="pt-6 border-t border-line">
                      <Button className="w-full h-10 rounded-none bg-navy text-white text-[9px] font-black uppercase tracking-widest gap-2">
                        <Upload size={14} />
                        Añadir Documentación
                      </Button>
                   </div>
                </div>
              </ScrollArea>
              
              <div className="p-4 bg-muted/5 border-t border-line mt-auto">
                 <div className="flex items-center gap-2 text-[9px] font-mono text-muted uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    Vault Status: Restricted Access
                 </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>


    </motion.div>
  );
}

function RequirementItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
       <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
       <div className="p-3 bg-bg border-l-2 border-accent font-serif italic text-[11px] leading-relaxed text-navy bg-white shadow-sm">
          {value || 'No definido'}
       </div>
    </div>
  );
}

function TreeRow({ node, depth }: { node: SystemNode; depth: number; key?: any }) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-open first few levels

  return (
    <div className="flex flex-col border-l border-line/30 ml-4 group/row">
      <div 
        className={cn(
          "flex items-center py-2 px-4 hover:bg-navy/[0.02] cursor-pointer group transition-colors relative",
          isOpen && "bg-navy/[0.01]"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-[104px] shrink-0 font-mono text-[9px] text-accent font-bold flex items-center gap-2">
          {node.code || '--'}
          {node.children && node.children.length > 0 && (
            <ChevronDown size={10} className={cn("transition-transform duration-300", !isOpen && "-rotate-90")} />
          )}
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[8px] px-1 py-0 rounded-none font-black uppercase tracking-tighter shrink-0",
              node.type === 'Sistema' ? "bg-navy text-white border-navy" : 
              node.type === 'Subsistema' ? "text-navy border-navy" :
              "text-muted border-line"
            )}
          >
            {node.type}
          </Badge>
          <span className={cn(
            "text-[11px] uppercase tracking-tight",
            node.type === 'Sistema' ? "font-black text-navy" : "font-bold text-navy/80"
          )}>
            {node.name}
          </span>
        </div>

        <div className="w-[100px] text-right font-mono font-bold text-navy text-[10px] px-4">
          {node.calculated_m2 ? `${node.calculated_m2}m²` : '--'}
        </div>

        <div className="flex-1 flex gap-1 px-4 items-center h-full">
          {node.requirements ? (
            <>
              <RequirementBadge r="F" text={node.requirements.r1_funcional} />
              <RequirementBadge r="E" text={node.requirements.r2_espacial} />
              <RequirementBadge r="T" text={node.requirements.r3_tecnico} />
              <RequirementBadge r="P" text={node.requirements.r4_psicologico} />
              <RequirementBadge r="D" text={node.requirements.r5_flexibilidad} />
            </>
          ) : (
             <div className="h-4 w-[1px] bg-line/20 ml-2" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && node.children && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricBox({ label, value, isLoading }: { label: string; value?: string; isLoading?: boolean }) {
  const displayValue = value && value !== "" && value !== "PENDIENTE" ? value : "AUDITORÍA REQUERIDA";
  const isAuditRequired = displayValue === "AUDITORÍA REQUERIDA";

  return (
    <div className="p-4 border border-line bg-surface flex flex-col gap-1 transition-all hover:border-accent group">
      <span className="text-[10px] font-bold text-navy/50 uppercase tracking-tighter mb-1">{label}</span>
      {isLoading ? (
        <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
      ) : (
        <p className={cn(
          "text-[11px] font-bold uppercase leading-tight",
          isAuditRequired ? "text-amber-500" : "text-navy"
        )}>
          {displayValue}
        </p>
      )}
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


