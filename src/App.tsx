import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronRight, 
  FileText, 
  Plus, 
  Search, 
  Settings2, 
  LayoutDashboard, 
  History,
  Archive,
  ArrowRight,
  AlertCircle,
  Database,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Project, SpektrResult } from './types';
import { Dropzone } from './components/Dropzone';
import { analyzeProject } from './lib/gemini';

// Main Application Component
export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('arkhe_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string, data: string}[]>([]);

  useEffect(() => {
    localStorage.setItem('arkhe_projects', JSON.stringify(projects));
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectDesc) {
      toast.error('Por favor completa el nombre y la descripción.');
      return;
    }

    setIsAnalyzing(true);
    toast.info('SPEKTR: Iniciando motores de agentes STRATOS, AXON y MORPHO...');

    try {
      const result = await analyzeProject(
        newProjectDesc, 
        uploadedFiles.map(f => ({ data: f.data, mimeType: f.type })),
        newProjectBudget
      );

      const newProject: Project = {
        id: uuidv4(),
        name: newProjectName,
        description: newProjectDesc,
        budget_per_m2: newProjectBudget,
        createdAt: new Date().toISOString(),
        files: uploadedFiles,
        analysis: result
      };

      setProjects([newProject, ...projects]);
      setActiveProjectId(newProject.id);
      setIsCreating(false);
      resetNewProjectForm();
      toast.success('Expediente generado con éxito.');
    } catch (error) {
      toast.error('Error en el motor lógico SPEKTR. Inténtalo de nuevo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetNewProjectForm = () => {
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectBudget(0);
    setUploadedFiles([]);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster />
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
      
      {/* Header */}
      <header className="h-[60px] border-b-2 border-line bg-surface sticky top-0 z-50 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-2xl tracking-[0.2em] font-black uppercase text-navy">
            ARKHÉ
          </div>
          <div className="h-4 w-[1px] bg-line hidden sm:block"></div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest hidden sm:block">
            AI Architectural Systems
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 font-mono text-[11px] font-bold uppercase tracking-tight">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span className="opacity-70">Sistémico Activo</span>
            </div>
            <div className="opacity-70">U-Procesor: 84%</div>
            <div className="opacity-70">Hash: #AR-416A</div>
          </div>
          <Button 
            className="rounded-none h-9 bg-accent text-white hover:bg-accent/90 flex gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-mono uppercase">Nuevo Expediente</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Panel 1 (List) */}
        <aside className="w-[280px] border-r border-line bg-surface flex flex-col shrink-0">
          <div className="panel-header p-4">
            <h2 className="panel-title font-serif italic text-[13px] uppercase tracking-wider text-muted">00. Registros / Data</h2>
          </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    className={cn(
                      "w-full text-left p-3 flex flex-col gap-1 transition-all group border border-transparent",
                      activeProjectId === project.id ? "bg-ink text-bg border-line" : "hover:bg-ink/5"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold truncate max-w-[180px]">{project.name}</span>
                      <X 
                        className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive" 
                        onClick={(e) => deleteProject(project.id, e)}
                      />
                    </div>
                    <span className="text-[10px] font-mono opacity-50">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
                {projects.length === 0 && (
                  <div className="p-8 text-center opacity-30">
                    <Building2 className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-[10px] uppercase tracking-wider">No hay expedientes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-bg relative">
          <AnimatePresence mode="wait">
            {!activeProjectId && !isCreating ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-12 text-center"
              >
                <div className="max-w-md space-y-6">
                  <div className="w-24 h-24 bg-navy/5 border-2 border-navy flex items-center justify-center mx-auto mb-8 animate-pulse relative">
                    <Building2 className="w-12 h-12 text-navy/40" />
                    <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></div>
                  </div>
                  <h2 className="text-4xl italic font-serif tracking-tight text-navy">Selecciona un expediente o inicia una nueva ingesta sistémica.</h2>
                  <p className="text-sm text-muted max-w-sm mx-auto">
                    El Motor de Arquitectura ARKHÉ procesará tus documentos para generar el Árbol del Sistema y la Matriz de Interacción basado en el método Álvaro Sánchez.
                  </p>
                  <Button 
                    size="lg" 
                    className="rounded-none bg-navy text-surface px-8 hover:bg-navy/90"
                    onClick={() => setIsCreating(true)}
                  >
                    NUEVA INGESTA
                  </Button>
                </div>
              </motion.div>
            ) : isCreating ? (
              <motion.div 
                key="new"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full overflow-y-auto p-12 bg-bg flex justify-center"
              >
                <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex justify-between items-center border-b-2 border-line pb-4">
                      <div>
                        <h2 className="text-3xl font-serif italic text-navy">Nueva Ingesta ARKHÉ</h2>
                        <p className="text-[10px] uppercase font-bold text-accent tracking-widest mt-1">Gobernanza de Proyectos AI Architectural Systems</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-surface border border-line space-y-4 shadow-sm">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-accent uppercase tracking-widest">01. Identificador de Proyecto</label>
                          <Input 
                            placeholder="Nombre del expediente..." 
                            className="rounded-none border-line h-12 text-lg font-serif italic"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-accent uppercase tracking-widest">02. Contexto & Brief Multimodal</label>
                          <textarea 
                            placeholder="Describe necesidades, usuarios y visión..." 
                            className="w-full min-h-[160px] p-4 rounded-none border border-line bg-bg focus:outline-none focus:ring-1 focus:ring-accent transition-all text-sm font-sans"
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-accent uppercase tracking-widest">03. Parámetro Económico (MXN / m2)</label>
                          <Input 
                            type="number"
                            placeholder="Ej. 15000" 
                            className="rounded-none border-line h-12 font-mono text-accent"
                            value={newProjectBudget}
                            onChange={(e) => setNewProjectBudget(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="panel-header p-4 border border-line">
                      <h3 className="panel-title">Archivos de Ingesta</h3>
                    </div>
                    <div className="p-4 bg-surface border border-line shadow-sm">
                      <Dropzone files={uploadedFiles} onFilesChange={setUploadedFiles} />
                    </div>

                    <div className="agent-card p-6 bg-navy/5 border-navy space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                        <span className="text-[10px] font-black text-navy uppercase tracking-widest">Stratos AI Analyst Ready</span>
                      </div>
                      <p className="text-[11px] leading-relaxed italic text-navy/70">
                        "El sistema ARKHÉ extraerá automáticamente los 6 medios y generará el sociograma sistémico basado en el método Álvaro Sánchez."
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Button 
                        className="w-full h-14 rounded-none bg-accent text-white font-bold text-base hover:bg-accent/90 shadow-md transition-all active:scale-[0.98]"
                        disabled={isAnalyzing}
                        onClick={handleCreateProject}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ANALIZANDO...
                          </>
                        ) : (
                          'INICIAR MOTOR SPEKTR'
                        )}
                      </Button>
                      <Button 
                        variant="link" 
                        className="w-full text-[10px] uppercase font-bold text-muted" 
                        onClick={() => setIsCreating(false)}
                      >
                        Abortar Misión
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                {activeProject && <ProjectView project={activeProject} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <footer className="h-10 border-t border-line bg-surface px-6 flex items-center justify-between shrink-0 font-mono text-[10px] text-muted uppercase tracking-wider">
        <div>ARKHÉ AI // Logical Architecture Engine // ISO-27001 Traceability Active</div>
        <div>© 2024 ARKHÉ AI Architectural Systems</div>
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase transition-all border-l-2",
      active 
        ? "bg-accent/[0.03] text-accent border-accent" 
        : "text-muted hover:text-ink hover:bg-ink/[0.02] border-transparent"
    )}>
      <span className={cn("transition-colors", active ? "text-accent" : "opacity-50")}>{icon}</span>
      <span className="tracking-tight">{label}</span>
      {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
    </button>
  );
}

// Project View Component
function ProjectView({ project }: { project: Project }) {
  if (!project.analysis) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg">
      {/* View Header */}
      <div className="px-6 py-4 border-b border-line bg-surface shrink-0">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-serif italic text-ink">{project.name}</h2>
              <Badge variant="outline" className="font-mono text-[9px] uppercase px-1.5 py-0 border-line text-muted">AR-Trace: Active</Badge>
            </div>
            <p className="text-[11px] font-medium text-muted uppercase tracking-tight">{project.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-none border-line h-8 text-[10px] font-bold uppercase hover:bg-ink hover:text-bg">Exportar</Button>
            <Button className="rounded-none bg-accent text-white h-8 text-[10px] font-bold uppercase shadow-sm">Audit-Ready</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_340px] overflow-hidden">
        {/* Main Analysis Area - AXON & STRATOS */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-line bg-surface">
          <div className="panel-header px-6 py-3 flex justify-between items-center">
            <h2 className="panel-title font-serif italic text-[13px] uppercase tracking-wider text-muted">01. Axon & Stratos / Synthesis</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-accent font-sans">Tree Mode</span>
              <div className="w-8 h-4 bg-accent/20 rounded-full relative p-0.5">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Sociograma Card */}
              <div className="sociogram-box">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-accent uppercase mb-1 block tracking-wider">Sociograma: Causa</span>
                    <p className="text-[12px] italic text-ink leading-relaxed">{project.analysis.sociograma.causa}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-accent uppercase mb-1 block tracking-wider">Sociograma: Efecto</span>
                    <p className="text-[12px] italic text-ink leading-relaxed">{project.analysis.sociograma.efecto}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-accent uppercase mb-1 block tracking-wider">Sociograma: Objetivo</span>
                    <p className="text-[12px] font-bold italic text-accent leading-relaxed">{project.analysis.sociograma.objetivo}</p>
                  </div>
                </div>
              </div>

              {/* System Table */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block border-b border-line pb-1 mb-4">A.44 // Árbol del Sistema</span>
                <table className="w-full">
                  <thead>
                    <tr className="col-header">
                      <th className="text-[11px] pb-3 text-left font-semibold">Local / Subsistema</th>
                      <th className="text-[11px] pb-3 text-left font-semibold">M2 Est.</th>
                      <th className="text-[11px] pb-3 text-left font-semibold">Norma / Requerimientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.analysis.system_tree.map((node) => (
                      <tr key={node.id} className="data-row hover:bg-accent/[0.03]">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-ink">{node.local}</span>
                            <span className="text-[10px] font-mono text-muted uppercase">{node.subsistema}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="data-value font-mono text-xs text-accent font-bold">{node.m2_estimado.toFixed(2)}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(node.requerimientos).map(([r, text]) => (
                                // @ts-ignore
                                <RequirementBadge key={r} r={r} text={text} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-bg/50">
                      <td className="py-4 text-right pr-4 text-[10px] font-black uppercase text-muted">Total Área Sistémica</td>
                      <td className="py-4 font-mono text-sm text-accent font-black">{project.analysis.budget_validation.total_m2.toFixed(2)} m²</td>
                      <td className="py-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Medios Grid */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block border-b border-line pb-1 mb-4">M.1-M.6 // Diagnóstico de Medios</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(project.analysis.medios).map(([label, value], i) => (
                    <div key={label} className="p-4 rounded-none bg-bg/30 border border-line hover:border-accent transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold text-accent">M.{i+1}</span>
                        <span className="text-[10px] uppercase font-black tracking-tighter text-ink">{label}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted font-sans font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Info Column - MORPHO / VALIDATION */}
        <div className="hidden xl:flex flex-col overflow-hidden bg-surface">
          <div className="panel-header px-4 py-3 border-b border-line">
            <h2 className="panel-title font-serif italic text-[13px] uppercase tracking-wider text-muted">03. Morpho / Validation</h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Interaction Matrix */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block border-b border-line pb-1">Matrices de Interacción</span>
                <div className="matrix-grid">
                  {/* Mock grid visualization matching design HTML style */}
                  {project.analysis.interaction_matrix.slice(0, 18).map((rel, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "matrix-cell",
                        rel.clase === 'A' && "cell-high",
                        rel.clase === 'X' && "bg-destructive text-white border-destructive"
                      )}
                      title={`${rel.from} -> ${rel.to}: ${rel.razon}`}
                    >
                      {rel.clase}
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerta Recursividad */}
              {project.analysis.budget_validation.alert && (
                <div className="p-4 bg-[#FFFBEB] border-l-4 border-[#F59E0B]">
                  <span className="text-[10px] font-black text-[#92400E] uppercase block mb-1">MORPHO ALERT // RECURSIVIDAD</span>
                  <p className="text-[11px] text-navy italic leading-snug">
                    {project.analysis.budget_validation.recommendation}
                    <br />
                    <span className="font-bold">Desviación: {project.analysis.budget_validation.deviation}%</span>
                  </p>
                </div>
              )}

              {/* JSON View */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block border-b border-line pb-1">Technical Output (ARKHÉ JSON)</span>
                <div className="json-viewport h-[380px] overflow-hidden relative">
                  <div className="absolute inset-0 p-4 overflow-auto scrollbar-hide">
                    <pre className="text-[10px] leading-tight">
                      {JSON.stringify(project.analysis, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-line bg-bg/50 shrink-0">
            <div className="flex justify-between items-center text-[10px] font-mono text-muted uppercase tracking-widest">
              <span>SPEKTR v2.4</span>
              <span className="text-emerald-500 font-bold">● TRACE ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabTrigger({ value, label, sub }: { value: string, label: string, sub: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-navy data-[state=active]:bg-transparent h-12 flex flex-col items-start px-0"
    >
      <span className="text-[11px] font-mono p-0 leading-none">{label}</span>
      <span className="text-[9px] uppercase font-bold opacity-30 leading-none">{sub}</span>
    </TabsTrigger>
  );
}

// @ts-ignore
const RequirementBadge = ({ r, text }: { r: string, text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <Badge 
        variant="outline" 
        className="cursor-help font-mono text-[9px] border-line uppercase hover:bg-ink hover:text-bg transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {r}
      </Badge>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-48 p-2 bg-ink text-bg text-[10px] italic shadow-xl">
          <span className="font-bold uppercase block mb-1">R.{r.slice(1)}</span>
          {text}
        </div>
      )}
    </div>
  );
};
