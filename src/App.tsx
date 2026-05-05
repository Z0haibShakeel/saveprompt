import React, { 
  useState, 
  useEffect,
  ChangeEvent,
  FormEvent
} from 'react';
import { 
  Plus, 
  FolderLock, 
  Image as ImageIcon, 
  MessageSquare, 
  ChevronRight, 
  Trash2, 
  Save, 
  X,
  PlusCircle,
  ExternalLink,
  Code,
  GripVertical,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Edit,
  CloudUpload,
  Timer,
  Download,
  Link,
  AlertCircle,
  Bell,
  Trash,
  RotateCcw,
  History,
  Sparkles,
  Zap,
  ShieldCheck,
  Settings2,
  BrainCircuit,
  Terminal,
  Send,
  Loader2,
  Monitor,
  Smartphone,
  Maximize2,
  Square as SquareIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Config ---
const SUPABASE_URL = 'https://fgpjelfjitfvesizhgid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncGplbGZqaXRmdmVzaXpoZ2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzY5NzIsImV4cCI6MjA5MzU1Mjk3Mn0.o8OLiEPQj44k1taQYh2TnbCTOx8bQ4b9Kqz98_tGijQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Local Storage Keys ---
const STORAGE_KEY = 'forge_os_projects';

// --- Types ---
interface BracketItem {
  title: string;
  value: string;
}

interface ProjectImage {
  id: string;
  url: string;
  bracketContent: BracketItem[];
  order: number;
  chatLink?: string;
}

type ProjectStatus = 'Pending' | 'Uploaded';

interface Project {
  id: string;
  name: string;
  title: string;
  description: string;
  promptInstruction: string;
  masterPrompt: string;
  modelName: string;
  imageChatLink: string;
  images: ProjectImage[];
  status: ProjectStatus;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// --- Helpers ---
const extractBrackets = (text: string): string[] => {
  const regex = /\[([^\]]+)\]/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
};

const getReplacedPrompt = (masterPrompt: string, bracketContent: BracketItem[]): string => {
  let finalPrompt = masterPrompt;
  bracketContent.forEach(item => {
    // Replace all occurrences of [title] with value
    const escapedTitle = item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[${escapedTitle}\\]`, 'g');
    finalPrompt = finalPrompt.replace(regex, item.value || `[${item.title}]`);
  });
  return finalPrompt;
};

function CopyButton({ text, label = "" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-accent hover:text-accent-foreground text-slate-600 rounded-md transition-all active:scale-95 group relative z-10"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-accent-foreground" />}
      {label && <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>}
      {copied && label && <span className="text-[10px] font-bold text-emerald-600 uppercase">Copied!</span>}
    </button>
  );
}

function HighlightedPrompt({ 
  text, 
  variant = 'dark',
  fallback = "No content defined." 
}: { 
  text: string; 
  variant?: 'dark' | 'light';
  fallback?: string;
}) {
  if (!text) return <span className="text-slate-500 italic">{fallback}</span>;
  
  const parts = text.split(/(\[[^\]]+\])/g);
  
  const highlightClass = variant === 'dark' 
    ? "text-accent font-bold bg-accent/20 px-1 rounded shadow-sm" // For dark BG (Master Prompt)
    : "text-amber-500 font-bold"; // For light BG (Instruction), using amber for readability on white

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <span key={i} className={highlightClass}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function StatusBadge({ status, onClick, size = 'md' }: { status: ProjectStatus, onClick?: (e: React.MouseEvent) => void, size?: 'sm' | 'md' | 'lg' }) {
  const isUploaded = status === 'Uploaded';
  
  const baseClasses = "flex items-center gap-1.5 font-bold uppercase tracking-widest transition-all rounded-full border";
  const sizeClasses = {
    sm: "text-[8px] px-2 py-0.5",
    md: "text-[9px] px-3 py-1",
    lg: "text-[11px] px-4 py-1.5"
  };
  
  const themeClasses = isUploaded 
    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" 
    : "bg-accent text-accent-foreground border-slate-900/10 shadow-sm";

  return (
    <button 
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${themeClasses} ${onClick ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
    >
      {isUploaded ? <CloudUpload className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} /> : <Timer className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      {status}
    </button>
  );
}

// --- Components ---

function Toast({ 
  message, 
  type = 'info', 
  onClose 
}: { 
  message: string; 
  type?: 'success' | 'error' | 'info'; 
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-indigo-600'
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-white font-bold shadow-2xl flex items-center gap-3 ${bgClass}`}
    >
      <Bell className="w-5 h-5" />
      <span className="text-sm tracking-tight">{message}</span>
    </motion.div>
  );
}

function DeleteConfirmation({ 
  onConfirm, 
  onCancel,
  projectName,
  isPermanent = false
}: { 
  onConfirm: () => void; 
  onCancel: () => void;
  projectName: string;
  isPermanent?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl border border-slate-100"
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isPermanent ? 'bg-red-50' : 'bg-amber-50'}`}>
          <Trash2 className={`w-8 h-8 ${isPermanent ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <h3 className="text-2xl font-display font-black text-slate-900 mb-2">
          {isPermanent ? 'Delete Permanently?' : 'Move to Trash?'}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
          {isPermanent 
            ? <>Are you sure you want to delete <span className="text-red-500 font-bold">"{projectName}"</span> permanently? All data including images will be lost forever.</>
            : <>Are you sure you want to move <span className="text-amber-600 font-bold">"{projectName}"</span> to the trash bin? You can recover it later if needed.</>
          }
        </p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${
              isPermanent ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
            }`}
          >
            {isPermanent ? 'Delete Now' : 'Move to Trash'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TrashBinView({ 
  projects, 
  onRestore, 
  onPermanentDelete, 
  onBack 
}: { 
  projects: Project[]; 
  onRestore: (id: string) => void; 
  onPermanentDelete: (id: string) => void; 
  onBack: () => void 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95 group"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-3">
              Trash Bin
              <span className="bg-red-50 text-red-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-red-100">
                {projects.length} Items
              </span>
            </h2>
            <p className="text-sm text-slate-500 font-medium">Recover or permanently delete your strategic assets.</p>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50 text-center">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Trash className="text-slate-300 w-10 h-10" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Trash is empty</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-6">Deleted projects will appear here for 1-click recovery.</p>
          <button
            onClick={onBack}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="group bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all relative overflow-hidden grayscale hover:grayscale-0"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-300" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-900 uppercase tracking-tight line-clamp-1">{project.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(project.deletedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => onRestore(project.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                <button 
                  onClick={() => onPermanentDelete(project.id)}
                  className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                  title="Delete Permanently"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AutoExpandingTextarea({ 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  rows = 1 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string; 
  className?: string;
  rows?: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full resize-none overflow-hidden transition-all ${className}`}
    />
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'vault' | 'forge'>('vault');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState<string | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const activeProjects = projects.filter(p => !p.isDeleted);
  const deletedProjects = projects.filter(p => p.isDeleted);

  const moveToTrash = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p));
    setSelectedProject(null);
    notify('Moved to Trash', 'info');
  };

  const restoreFromTrash = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false, deletedAt: undefined } : p));
    notify('Project Restored', 'success');
  };

  const permanentDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    notify('Deleted permanently', 'error');
  };

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('projects_table')
          .select('data')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.data) {
          const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          if (Array.isArray(parsed)) {
            setProjects(parsed);
          }
        }
      } catch (e) {
        console.error("Supabase load error:", e);
        // Fallback to local storage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setProjects(JSON.parse(saved));
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save data to Supabase
  useEffect(() => {
    const saveData = async () => {
      if (!isLoaded) return;

      // Always update local storage for instant feedback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

      try {
        const { error } = await supabase
          .from('projects_table')
          .upsert({ id: 1, data: projects });

        if (error) throw error;
      } catch (e) {
        console.error("Supabase save error:", e);
      }
    };
    saveData();
  }, [projects, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-accent rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-2 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-8">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setSelectedProject(null); setIsAdding(false); setActiveTab('vault'); }}>
              <div className="bg-accent p-1.5 sm:p-2 rounded-xl border border-slate-900/5 group-hover:rotate-6 transition-transform">
                <FolderLock className="text-accent-foreground w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tighter text-slate-900">Forge<span className="text-accent-foreground bg-accent px-1.5 rounded ml-0.5">OS</span></span>
            </div>

            {/* Mobile Actions (Visible only on small screens) */}
            <div className="flex items-center gap-2 sm:hidden">
              {activeTab === 'vault' && (
                <button 
                  onClick={() => setShowTrash(true)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95"
                >
                  <Trash className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Switcher - Optimized for Mobile */}
          <nav className="flex items-center bg-slate-100/80 p-1 rounded-xl sm:rounded-2xl border border-slate-200 w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button
              onClick={() => { setActiveTab('vault'); setSelectedProject(null); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'vault' 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Vault
            </button>
            <button
              onClick={() => { setActiveTab('forge'); setSelectedProject(null); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'forge' 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              AI Forge
            </button>
          </nav>
          
          <div className="hidden sm:flex items-center gap-4">
            {activeTab === 'vault' && (
              <button 
                onClick={() => setShowTrash(true)}
                className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95 group"
                title="Trash Bin"
              >
                <Trash className="w-5 h-5" />
                {deletedProjects.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {deletedProjects.length}
                  </span>
                )}
              </button>
            )}
            <div className="flex flex-col items-end text-sm">
              <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">System Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
        {activeTab === 'forge' ? (
          <AIForgeView notify={notify} />
        ) : showTrash ? (
          <TrashBinView 
            projects={deletedProjects}
            onBack={() => setShowTrash(false)}
            onRestore={restoreFromTrash}
            onPermanentDelete={(id) => setShowPermanentDeleteConfirm(id)}
          />
        ) : isAdding ? (
          <ProjectForm 
            onCancel={() => setIsAdding(false)} 
            notify={notify}
            onSuccess={(newProj) => {
              setProjects(prev => [newProj, ...prev]);
              setIsAdding(false);
              notify('Project created successfully!', 'success');
            }} 
          />
        ) : isEditing && selectedProject ? (
          <ProjectForm 
            initialData={selectedProject} 
            onCancel={() => setIsEditing(false)} 
            notify={notify}
            onSuccess={(updated) => {
              setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
              setIsEditing(false);
              setSelectedProject(updated);
              notify('Project updated!', 'success');
            }} 
          />
        ) : selectedProject ? (
          <ProjectDetailView 
            project={selectedProject} 
            onBack={() => setSelectedProject(null)} 
            onEdit={() => setIsEditing(true)}
            notify={notify}
            onDelete={() => setShowDeleteConfirm(selectedProject.id)}
            onUpdate={(updated) => {
              setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
              setSelectedProject(updated);
            }}
          />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Control Center</h2>
                <p className="text-sm text-slate-500 font-medium font-sans">Manage your strategic AI configurations & asset vault.</p>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-yellow-300 text-accent-foreground font-bold rounded-xl transition-all shadow-lg shadow-yellow-200/50 border border-slate-900/10 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </button>
            </div>

            {activeProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 text-center">
                <div className="bg-amber-50 p-4 rounded-full mb-4">
                  <ImageIcon className="text-amber-600 w-10 h-10 opacity-40" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Your local vault is empty</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-6">Start by creating your first project and saving your prompts locally.</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="text-amber-600 font-semibold hover:underline"
                >
                  Create local project now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onClick={() => setSelectedProject(project)} 
                    onUpdate={(updated) => {
                      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmation 
            projectName={projects.find(p => p.id === showDeleteConfirm)?.name || ''}
            onCancel={() => setShowDeleteConfirm(null)}
            onConfirm={() => {
              moveToTrash(showDeleteConfirm);
              setShowDeleteConfirm(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPermanentDeleteConfirm && (
          <DeleteConfirmation 
            isPermanent
            projectName={projects.find(p => p.id === showPermanentDeleteConfirm)?.name || ''}
            onCancel={() => setShowPermanentDeleteConfirm(null)}
            onConfirm={() => {
              permanentDelete(showPermanentDeleteConfirm);
              setShowPermanentDeleteConfirm(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal removed for inline editing */}
    </div>
  );
}


// --- Sub-components ---

function ProjectCard({ project, onClick, onUpdate }: { project: Project; onClick: () => void; onUpdate: (p: Project) => void; key?: string }) {
  const toggleStatus = (e: React.MouseEvent, proj: Project) => {
    e.stopPropagation();
    const newStatus = proj.status === 'Pending' ? 'Uploaded' : 'Pending';
    const updatedProject: Project = {
      ...proj,
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdate(updatedProject);
  };

  return (
    <motion.div
      whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      onClick={onClick}
      className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all cursor-pointer overflow-hidden relative"
    >
      <div className={`absolute top-0 left-0 w-full h-1 transition-colors ${project.status === 'Uploaded' ? 'bg-emerald-500' : 'bg-accent'}`} />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${project.status === 'Uploaded' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{project.name}</h4>
            <div className="mt-1">
              <StatusBadge status={project.status} onClick={(e) => toggleStatus(e, project)} size="sm" />
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          {project.modelName || 'No Model'}
        </div>
      </div>
      
      <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed italic">
        {project.title || 'No display title set...'}
      </p>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
        <div className="flex -space-x-2">
          {project.images?.slice(0, 3).map((img, i) => (
            <div key={img.id} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
              <img src={img.url} className="w-full h-full object-cover" />
            </div>
          ))}
          {project.images?.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
              +{project.images.length - 3}
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {project.images?.length || 0} assets
        </span>
      </div>
    </motion.div>
  );
}

function SortableImageItem({ 
  img, 
  removeImage, 
  updateBracketValue,
  updateImageLink,
  replaceImage,
  index,
  masterPrompt,
  notify
}: { 
  img: ProjectImage; 
  removeImage: (id: string) => void; 
  updateBracketValue: (imageId: string, index: number, val: string) => void;
  updateImageLink: (imageId: string, link: string) => void;
  replaceImage: (imageId: string, file: File) => void;
  index: number;
  masterPrompt: string;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  key?: React.Key;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 0 : 1,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      replaceImage(img.id, file);
    }
  };

  const handleCopyPrompt = () => {
    const finalPrompt = getReplacedPrompt(masterPrompt, img.bracketContent);
    navigator.clipboard.writeText(finalPrompt);
    notify('Replaced prompt copied to clipboard!', 'success');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'z-0' : 'z-10'}`}
    >
      <div className={`flex flex-col sm:flex-row gap-6 p-6 rounded-2xl border transition-all duration-300 ${
        isDragging 
          ? 'border-dashed border-indigo-300 bg-indigo-50/50 shadow-inner' 
          : 'border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-indigo-100'
      }`}>
        {/* Drag Handle Container */}
        <div 
          {...attributes} 
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-grab active:cursor-grabbing group/handle z-30"
          title="Drag to reorder"
        >
          <div className="w-8 h-12 flex items-center justify-center rounded-lg group-hover/handle:bg-indigo-50 transition-colors">
            <GripVertical className="w-5 h-5 text-slate-300 group-hover/handle:text-indigo-500 transition-colors" />
          </div>
          {/* Order Badge */}
          <div className="absolute top-2 left-2 bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
            {index + 1}
          </div>
        </div>
        
        <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-slate-200 rounded-xl overflow-hidden relative shadow-sm ml-6 group/img-replace">
          <img src={img.url} className="w-full h-full object-cover" />
          
          {/* Replace Image Overlay */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover/img-replace:opacity-100 transition-opacity cursor-pointer text-white gap-2"
          >
            <RefreshCw className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">Replace Image</span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <button 
            type="button"
            onClick={() => removeImage(img.id)}
            className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 shadow-md transition-all active:scale-90 z-20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="space-y-4">
            {/* Chat Link Input - Highlighted for UX */}
            <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <label className="text-[10px] font-bold uppercase text-indigo-600 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Image Chat Link
              </label>
              <input
                type="url"
                value={img.chatLink || ''}
                onChange={e => updateImageLink(img.id, e.target.value)}
                placeholder="https://chat.openai.com/g/..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 outline-none bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Bracket Values</label>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all active:scale-95 shadow-sm"
                  title="Copy prompt with replaced values"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase">Copy Prompt</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {img.bracketContent.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-[8px] font-extrabold text-indigo-600 uppercase tracking-tight">[{item.title}]</label>
                    <input
                      type="text"
                      value={item.value}
                      onChange={e => updateBracketValue(img.id, idx, e.target.value)}
                      placeholder={`Value for ${item.title}`}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                ))}
                {img.bracketContent.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic col-span-2 py-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-100">
                    No [brackets] detected in Master Prompt.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static version for DragOverlay
function StaticImageItem({ 
  img,
  index
}: { 
  img: ProjectImage;
  index: number;
  key?: React.Key;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-2xl border-2 border-indigo-500 bg-white relative shadow-[0_20px_50px_rgba(79,70,229,0.3)] ring-1 ring-indigo-500 cursor-grabbing scale-[1.02] -rotate-1 transition-transform duration-200">
      <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-indigo-500">
        <div className="w-8 h-12 flex items-center justify-center rounded-lg bg-indigo-50">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
          {index + 1}
        </div>
      </div>
      
      <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-slate-200 rounded-xl overflow-hidden relative shadow-md ml-6">
        <img src={img.url} className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-1 space-y-4">
        <div className="space-y-4">
           <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 opacity-50">
              <label className="text-[10px] font-bold uppercase text-indigo-600 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Image Chat Link
              </label>
              <div className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white text-slate-400 font-mono truncate">
                {img.chatLink || 'No link set'}
              </div>
            </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Bracket Values (Moving...)</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-50">
              {img.bracketContent.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[8px] font-extrabold text-indigo-400 uppercase">[{item.title}]</label>
                  <div className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                    {item.value || `Value for ${item.title}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Lifting Indicator */}
      <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg shadow-lg animate-bounce">
        Moving Item
      </div>
    </div>
  );
}

function AIForgeView({ notify }: { notify: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [samples, setSamples] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  useEffect(() => {
    localStorage.setItem('openrouter_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('openrouter_model', model);
  }, [model]);

  const generatePrompt = async () => {
    if (!apiKey) return notify('Please provide an OpenRouter API Key', 'error');
    if (!prompt) return notify('Please enter a description or prompt', 'error');

    setIsGenerating(true);
    setResult('');
    setSamples([]);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ForgeOS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a specialist in creating high-selling, ultra-detailed "Master Prompts" for PromptBase, specifically for ChatGPT (DALL-E 3).
              
              GOAL:
              Transform a simple user idea into a complex, professional-grade cinematic template.
              
              STRICT BRACKETING RULES:
              1. CORE SUBJECT IS FIXED: The user's input (e.g., "Fitness Influencer in Gym") is the MANDATORY SUBJECT. You must NEVER put brackets around the user's input or any part of it.
              2. NO BRACKETS ON MAIN NOUNS: Do not bracket the main character or the main location.
              3. SMART BRACKETS ONLY: Use brackets ONLY for secondary details that a buyer would want to change. These are:
                 - [action] (e.g., doing squats, lifting weights, resting)
                 - [outfit] (e.g., neon yoga set, black compression gear)
                 - [hairstyle] (e.g., high ponytail, messy bun)
                 - [lighting] (e.g., dramatic sunset light, neon glow)
              4. LIMIT: Use exactly 2 to 3 brackets.
              
              PROMPT CONSTRUCTION:
              - Start with a detailed, cinematic description of the FIXED subject.
              - Integrate the [bracketed] variables naturally into the flow.
              - Mention professional camera gear (e.g., 85mm lens) and lighting.
              - Mention the aspect ratio naturally in the text.
              
              Example Input: "Fitness Influencer Gym workouts"
              Example Output: "MASTER_PROMPT: A hyper-realistic cinematic portrait of a muscular fitness influencer performing a series of intense gym workouts, specifically [action]. She is wearing a [outfit] with her hair styled in a [hairstyle]. The state-of-the-art gym is captured with a professional 50mm f/1.2 lens, featuring dramatic volumetric lighting and high-contrast textures. Presented in a vertical 9:16 cinematic format.
              SAMPLES:
              1. [action]: performing heavy deadlifts, [outfit]: sleek charcoal leggings and crop top, [hairstyle]: tight athletic braid
              2. [action]: doing explosive box jumps, [outfit]: vibrant electric blue gym set, [hairstyle]: high sleek ponytail
              ... (up to 9)"`
            },
            {
              role: 'user',
              content: `Create a Master Prompt for this idea: "${prompt}". 
              The required aspect ratio is ${aspectRatio}. 
              Make sure to include 1-3 bracketed variables for customization.`
            }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        const fullText = data.choices[0].message.content;
        
        // Parse the response
        const masterPromptMatch = fullText.match(/MASTER_PROMPT:\s*([\s\S]*?)(?=SAMPLES:|$)/i);
        const samplesMatch = fullText.match(/SAMPLES:\s*([\s\S]*)$/i);
        
        if (masterPromptMatch) {
          setResult(masterPromptMatch[1].trim());
        }
        
        if (samplesMatch) {
          const sampleLines = samplesMatch[1].trim().split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 9);
          setSamples(sampleLines);
        }

        notify('Master Prompt & 9 Samples forged!', 'success');
      } else {
        throw new Error(data.error?.message || 'Failed to generate prompt');
      }
    } catch (err: any) {
      console.error(err);
      notify(err.message || 'Error connecting to OpenRouter', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyFullVariation = (sampleLine: string) => {
    // sampleLine looks like "[outfit]: red dress, [action]: running"
    // We need to extract title and value
    let finalPrompt = result;
    
    const bracketMatches = sampleLine.split(',').map(part => part.trim());
    
    bracketMatches.forEach(match => {
      const [titlePart, valuePart] = match.split(':').map(s => s.trim());
      if (titlePart && valuePart) {
        // Remove brackets from titlePart if they exist
        const title = titlePart.replace(/[\[\]]/g, '');
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\[${escapedTitle}\\]`, 'g');
        finalPrompt = finalPrompt.replace(regex, valuePart);
      }
    });

    navigator.clipboard.writeText(finalPrompt);
    notify('Full variation prompt copied!', 'success');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 flex items-center gap-3">
            AI Forge
            <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg border border-amber-200">
              <Zap className="w-5 h-5 fill-current" />
            </div>
          </h2>
          <p className="text-slate-500 font-medium">Create high-selling PromptBase Master Prompts for ChatGPT.</p>
        </div>

        {/* API Key Config */}
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="OpenRouter API Key"
              className="pl-9 pr-4 py-2 text-xs font-mono rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 w-48 md:w-64"
            />
            <Settings2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <History className={`w-4 h-4 ${showKey ? 'text-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
            {/* Model & Idea */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Source Idea
                </label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-slate-50 border border-slate-100 rounded-full outline-none hover:border-amber-200 transition-all cursor-pointer"
                >
                  <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                  <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                  <option value="mistralai/mistral-7b-instruct">Mistral 7B</option>
                </select>
              </div>
              <AutoExpandingTextarea
                value={prompt}
                onChange={setPrompt}
                placeholder="Describe your prompt concept (e.g., 'vintage travel posters')..."
                className="text-lg font-medium p-0 border-none bg-transparent placeholder:text-slate-300 focus:ring-0"
                rows={2}
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-4 pt-6 border-t border-slate-50">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                DALL-E 3 Aspect Ratio
              </label>
              <div className="flex gap-3">
                {[
                  { id: '1:1', label: 'Square', icon: SquareIcon },
                  { id: '16:9', label: 'Wide', icon: Monitor },
                  { id: '9:16', label: 'Tall', icon: Smartphone }
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                      aspectRatio === ratio.id 
                        ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <ratio.icon className={`w-4 h-4 ${aspectRatio === ratio.id ? 'text-amber-500' : 'text-slate-300'}`} />
                    {ratio.label}
                    <span className="text-[10px] opacity-50 ml-1">{ratio.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={generatePrompt}
                disabled={isGenerating || !prompt}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-[1.5rem] transition-all active:scale-[0.98] shadow-xl shadow-slate-200 group"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-amber-400" />
                    Forge Master Prompt
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/20 p-2 rounded-xl">
                      <BrainCircuit className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-amber-500">Master Prompt Template</span>
                  </div>
                  <CopyButton text={result} label="Copy Master" />
                </div>

                <div className="relative z-10">
                  <pre className="font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-amber-500/30">
                    <HighlightedPrompt text={result} />
                  </pre>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800/50 flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PromptBase Ready</span>
                  <div className="flex gap-2">
                    {extractBrackets(result).map((b, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded-full border border-amber-500/20 uppercase">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {samples.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl">
                      <Terminal className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-400">9 Sample Variations</span>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    FOR VAULT
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {samples.map((sample, idx) => (
                    <div 
                      key={idx} 
                      className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-300 group-hover:text-indigo-300">#{idx + 1}</span>
                        <p className="text-sm font-mono text-slate-600 group-hover:text-slate-900 leading-relaxed">
                          {sample}
                        </p>
                      </div>
                      <button
                        onClick={() => copyFullVariation(sample)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all active:scale-95 group/btn shadow-sm"
                        title="Copy full prompt with these values"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase">Copy Full Prompt</span>
                      </button>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] text-center text-slate-400 font-medium italic">
                  Copy these values directly into your project's bracket fields.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
            <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" />
              PromptBase Standards
            </h4>
            <ul className="space-y-3">
              {[
                'Keep variables between 1-3 for better UX.',
                'Ensure the style is consistent and unique.',
                'DALL-E 3 handles natural language best.',
                'Aspect ratio is crucial for specific use cases.'
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs font-medium text-amber-800/70">
                  <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Quality Assurance
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
              Generated prompts are designed to be "plug-and-play" templates that customers can easily modify and use.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectForm({ 
  initialData, 
  onCancel, 
  onSuccess,
  notify
}: { 
  initialData?: Project; 
  onCancel: () => void; 
  onSuccess: (p: Project) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    promptInstruction: initialData?.promptInstruction || '',
    masterPrompt: initialData?.masterPrompt || '',
    modelName: initialData?.modelName || '',
    imageChatLink: initialData?.imageChatLink || '',
  });

  const [images, setImages] = useState<ProjectImage[]>(initialData?.images || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numPlaceholders, setNumPlaceholders] = useState<number>(1); // New state for placeholder count

  // Base64 encoded 1x1 transparent GIF for placeholder
  const PLACEHOLDER_IMAGE_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImage: ProjectImage = {
        id: crypto.randomUUID(),
        url: reader.result as string,
        bracketContent: extractBrackets(formData.masterPrompt).map(b => ({ title: b, value: '' })),
        order: images.length,
      };
      setImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  };

  const addPlaceholderImages = () => {
    const newPlaceholders: ProjectImage[] = Array.from({ length: numPlaceholders }).map((_, i) => ({
      id: crypto.randomUUID(),
      url: PLACEHOLDER_IMAGE_URL,
      bracketContent: extractBrackets(formData.masterPrompt).map(b => ({ title: b, value: '' })),
      order: images.length + i,
    }));
    setImages(prev => [...prev, ...newPlaceholders]);
    notify(`${numPlaceholders} placeholder(s) added!`, 'info');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  // Sync brackets automatically from master prompt
  useEffect(() => {
    const bracketTitles = extractBrackets(formData.masterPrompt);
    
    setImages(prev => prev.map(img => {
      const existingBracketsMap = new Map(img.bracketContent.map(b => [b.title, b.value]));
      const newBracketContent = bracketTitles.map(title => ({
        title,
        value: existingBracketsMap.get(title) || ''
      }));
      return { ...img, bracketContent: newBracketContent };
    }));
  }, [formData.masterPrompt]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const bracketTitles = extractBrackets(formData.masterPrompt);

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        // Duplicate Prevention Check
        setImages(prev => {
          const isDuplicate = prev.some(img => img.url === base64String);
          if (isDuplicate) {
            notify(`Duplicate image skipped: ${file.name}`, 'info');
            return prev;
          }

          return [
            ...prev, 
            { 
              id: Math.random().toString(36).substring(7), 
              url: base64String, 
              order: prev.length,
              bracketContent: bracketTitles.map(title => ({ title, value: '' }))
            }
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const updateBracketValue = (imageId: string, index: number, val: string) => {
    // Update value only for specific image
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        const newContent = [...img.bracketContent];
        newContent[index] = { ...newContent[index], value: val };
        return { ...img, bracketContent: newContent };
      }
      return img;
    }));
  };

  const updateImageLink = (imageId: string, link: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, chatLink: link } : img
    ));
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const replaceImage = (imageId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      // Duplicate check for replacement as well
      const isDuplicate = images.some(img => img.url === base64String);
      if (isDuplicate) {
        return notify('This image is already in the project', 'info');
      }

      // Update in state
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, url: base64String } : img
      ));
      
      notify('Image replaced successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) return notify('Project name is required', 'error');

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (initialData) {
        const updated: Project = {
          ...initialData,
          ...formData,
          images: images.map((img, idx) => ({ ...img, order: idx })),
          updatedAt: now
        };
        onSuccess(updated);
      } else {
        const newProject: Project = {
          id: Math.random().toString(36).substring(2, 15),
          ...formData,
          images: images.map((img, idx) => ({ ...img, order: idx })),
          status: 'Pending',
          statusUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        onSuccess(newProject);
      }
    } catch (e) {
      console.error("Failed to save project", e);
      notify("Error saving project. Please try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          {initialData ? 'Edit Project' : 'New Project'}
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Logo Concept v2"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Full display title"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Description</label>
          <AutoExpandingTextarea
            value={formData.description}
            onChange={val => setFormData({ ...formData, description: val })}
            placeholder="What is this project about?"
            rows={2}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Model Name</label>
            <select
              value={formData.modelName}
              onChange={e => setFormData({ ...formData, modelName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="">Select a Model</option>
              <option value="ChatGPT Image">ChatGPT Image</option>
              <option value="FLUX">FLUX</option>
              <option value="Gemini Image">Gemini Image</option>
              <option value="Grok Image">Grok Image</option>
              <option value="Hunyuan">Hunyuan</option>
              <option value="Ideogram">Ideogram</option>
              <option value="Imagen">Imagen</option>
              <option value="Leonardo Ai">Leonardo Ai</option>
              <option value="Midjourney">Midjourney</option>
              <option value="Qwen Image">Qwen Image</option>
              <option value="Recraft">Recraft</option>
              <option value="Seedream">Seedream</option>
              <option value="Stable Diffusion">Stable Diffusion</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Prompt Instruction</label>
          <AutoExpandingTextarea
            value={formData.promptInstruction}
            onChange={val => setFormData({ ...formData, promptInstruction: val })}
            placeholder="Enter global prompt instructions..."
            rows={3}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 font-bold flex items-center gap-2">
            Master Prompt 
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">Brackets Auto-detect enabled</span>
          </label>
          <AutoExpandingTextarea
            value={formData.masterPrompt}
            onChange={val => setFormData({ ...formData, masterPrompt: val })}
            placeholder="Use [placeholder] to create bracket categories below..."
            rows={4}
            className="px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm outline-none"
          />
        </div>

        {/* Image Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              Creative Assets
            </h3>
            <div className="flex items-center gap-3">
              {/* Placeholder Image Input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={numPlaceholders}
                  onChange={(e) => setNumPlaceholders(parseInt(e.target.value))}
                  className="w-16 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center"
                />
                <button
                  type="button"
                  onClick={addPlaceholderImages}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Placeholders
                </button>
              </div>
              <label className="cursor-pointer px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4" />
                Add Images
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableContext 
              items={images.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-6">
                {images.map((img, index) => (
                  <SortableImageItem 
                    key={img.id} 
                    img={img} 
                    removeImage={removeImage} 
                    updateBracketValue={updateBracketValue} 
                    updateImageLink={updateImageLink}
                    replaceImage={replaceImage}
                    index={index}
                    masterPrompt={formData.masterPrompt}
                    notify={notify}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}>
              {activeId ? (
                <StaticImageItem 
                  img={images.find(img => img.id === activeId)!} 
                  index={images.findIndex(img => img.id === activeId)}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          {images.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic text-sm">
              No images added yet. Upload references to keep your prompts organized.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-2.5 bg-accent hover:bg-yellow-300 disabled:opacity-50 text-accent-foreground font-bold rounded-2xl transition-all shadow-lg shadow-yellow-200/50 active:scale-95 border border-slate-900/10"
          >
            {isSubmitting ? 'Processing...' : (
              <>
                <Save className="w-5 h-5" />
                {initialData ? 'Update Archive' : 'Forge Project'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectDetailView({ 
  project, 
  onBack, 
  onEdit, 
  onDelete,
  onUpdate,
  notify
}: { 
  project: Project; 
  onBack: () => void; 
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (p: Project) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const toggleStatus = () => {
    const newStatus = project.status === 'Pending' ? 'Uploaded' : 'Pending';
    const updated: Project = {
      ...project,
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onUpdate(updated);
  };

  const handleDownloadAll = async () => {
    if (project.images.length === 0) return;
    
    notify('Preparing your ZIP archive...', 'info');
    
    try {
      const zip = new JSZip();
      project.images.forEach((img, idx) => {
        const base64Data = img.url.split(',')[1];
        const extension = img.url.split(';')[0].split('/')[1] || 'jpg';
        zip.file(`image-${idx + 1}.${extension}`, base64Data, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${project.name.replace(/\s+/g, '_')}_assets.zip`;
      link.click();
      notify('Download started!', 'success');
    } catch (e) {
      console.error(e);
      notify('Failed to generate ZIP.', 'error');
    }
  };

  const isUploaded = project.status === 'Uploaded';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`space-y-8 p-6 sm:p-10 rounded-[3rem] transition-colors duration-700 ${
        isUploaded ? 'bg-emerald-50/50' : 'bg-transparent'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className={`p-3 border rounded-2xl transition-all shadow-sm active:scale-95 group ${
            isUploaded ? 'bg-white border-emerald-100 text-emerald-500' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className={`text-3xl font-display font-extrabold tracking-tight ${
                isUploaded ? 'text-emerald-900' : 'text-slate-900'
              }`}>{project.name}</h2>
              <div className={`flex p-1 rounded-2xl border shadow-inner ${
                isUploaded ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => project.status !== 'Pending' && toggleStatus()}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                    project.status === 'Pending' 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  Draft
                </button>
                <button
                  onClick={() => project.status !== 'Uploaded' && toggleStatus()}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                    project.status === 'Uploaded' 
                      ? 'bg-emerald-500 text-white shadow-sm border border-emerald-600' 
                      : 'text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  Uploaded
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className={`text-sm font-medium ${isUploaded ? 'text-emerald-600/80' : 'text-slate-500'}`}>{project.title || 'No display title'}</p>
              {project.title && <CopyButton text={project.title} label="Title" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={onEdit}
            className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl transition-all shadow-sm ${
              isUploaded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Edit className="w-4 h-4" />
            Modify Vault
          </button>
          <button
            onClick={onDelete}
            className={`p-3 rounded-2xl transition-all border border-transparent ${
              isUploaded ? 'text-emerald-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100' : 'text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100'
            }`}
            title="Purge Entry"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className={`p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6 transition-colors duration-500 ${
            isUploaded ? 'bg-white border-emerald-100' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${
                  isUploaded ? 'text-emerald-400' : 'text-slate-400'
                }`}>Project Context</h3>
                {project.description && <CopyButton text={project.description} label="Info" />}
              </div>
              <p className={`leading-relaxed font-medium whitespace-pre-wrap ${
                isUploaded ? 'text-emerald-800' : 'text-slate-600'
              }`}>
                {project.description || 'No description provided.'}
              </p>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t ${
              isUploaded ? 'border-emerald-50' : 'border-slate-100'
            }`}>
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${
                  isUploaded ? 'text-emerald-400' : 'text-slate-400'
                }`}>Intelligence</h3>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
                  isUploaded ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                }`}>
                  <Code className="w-3.5 h-3.5" />
                  {project.modelName || 'Standard AI'}
                  {project.modelName && <CopyButton text={project.modelName} />}
                </div>
              </div>
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${
                  isUploaded ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {project.status === 'Uploaded' ? 'Last Updated' : 'Created At'}
                </h3>
                <div className={`flex items-center gap-2 text-xs font-medium font-mono ${
                  isUploaded ? 'text-emerald-500' : 'text-slate-500'
                }`}>
                  <Clock className="w-4 h-4" />
                  {project.status === 'Uploaded' 
                    ? (new Date(project.statusUpdatedAt).toLocaleString())
                    : (new Date(project.createdAt).toLocaleString())
                  }
                </div>
              </div>
            </div>
          </section>

          {/* Prompts */}
          <section className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-3xl shadow-xl overflow-hidden relative border-4 transition-all duration-500 ${
              isUploaded ? 'bg-emerald-900 border-emerald-400 text-white' : 'bg-slate-900 border-accent text-white'
            }`}>
              <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] rounded-full -mr-20 -mt-20 ${
                isUploaded ? 'bg-emerald-400/20' : 'bg-accent/10'
              }`} />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-xl font-display font-bold flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isUploaded ? 'bg-emerald-400 text-emerald-900' : 'bg-accent text-accent-foreground'
                  }`}>
                    <Code className="w-5 h-5" />
                  </div>
                  Master Prompt
                </h3>
                <CopyButton text={project.masterPrompt} label="Full Master" />
              </div>
              <pre className={`font-mono text-xs leading-relaxed whitespace-pre-wrap p-6 rounded-2xl border relative z-10 transition-colors ${
                isUploaded ? 'bg-emerald-950/50 border-emerald-800 text-emerald-100' : 'bg-slate-800/80 border-slate-700/50 text-slate-300'
              }`}>
                <HighlightedPrompt text={project.masterPrompt} />
              </pre>
            </div>

            <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm relative overflow-hidden transition-colors duration-500 ${
              isUploaded ? 'bg-white border-emerald-100' : 'bg-white border-slate-200'
            }`}>
               <div className={`absolute top-0 left-0 w-2 h-full ${isUploaded ? 'bg-emerald-400' : 'bg-accent'}`} />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-slate-900 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isUploaded ? 'bg-emerald-400/20 text-emerald-600' : 'bg-accent/20 text-slate-900'
                  }`}>
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  Prompt Instruction
                </h3>
                {project.promptInstruction && <CopyButton text={project.promptInstruction} label="Inst" />}
              </div>
              <div className={`text-sm font-medium leading-relaxed p-6 rounded-2xl border whitespace-pre-wrap transition-colors ${
                isUploaded ? 'bg-emerald-50/30 border-emerald-50 text-emerald-800' : 'bg-[#FAFAFA] border-slate-100 text-slate-600'
              }`}>
                <HighlightedPrompt 
                  text={project.promptInstruction} 
                  variant="light" 
                  fallback="No specific instructions set." 
                />
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <h3 className={`text-xl font-bold ${isUploaded ? 'text-emerald-900' : 'text-slate-900'}`}>Creative Asset Library</h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border transition-colors ${
                  isUploaded ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {project.images.length} {project.images.length === 1 ? 'Asset' : 'Assets'}
                </span>
              </div>
              {project.images.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${
                    isUploaded 
                      ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' 
                      : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...project.images].sort((a, b) => {
                // Priority 1: Chat Link exists
                if (a.chatLink && !b.chatLink) return -1;
                if (!a.chatLink && b.chatLink) return 1;
                
                // Priority 2: Original order
                return (a.order || 0) - (b.order || 0);
              }).map((img) => (
                <div 
                  key={img.id} 
                  className={`bg-white rounded-3xl border transition-all duration-500 overflow-hidden ${
                    img.chatLink 
                      ? 'border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.25)] ring-2 ring-yellow-400/20 hover:shadow-[0_0_45px_rgba(251,191,36,0.45)] hover:border-yellow-500' 
                      : isUploaded ? 'border-emerald-100 shadow-sm hover:shadow-emerald-100' : 'border-slate-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="aspect-video w-full bg-slate-100 relative group/img">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    
                    {/* Top Left Indicators */}
                    <div className="absolute top-2 left-2 flex flex-col gap-2">
                      <span className="bg-slate-900/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm w-fit">
                        #{(img.order || 0) + 1}
                      </span>
                    </div>

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = img.url;
                          link.download = `image-${img.id}.jpg`;
                          link.click();
                        }}
                        className="bg-white text-slate-900 p-2.5 rounded-xl shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex flex-col items-center gap-1"
                        title="Download Asset"
                      >
                        <Download className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase">Save</span>
                      </button>

                      {img.chatLink && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(img.chatLink || '');
                            notify('Chat link copied!', 'success');
                          }}
                          className="bg-yellow-400 text-slate-900 p-2.5 rounded-xl shadow-xl hover:bg-yellow-500 transition-all active:scale-95 flex flex-col items-center gap-1"
                          title="Copy Chat Link"
                        >
                          <Copy className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase">Copy Link</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const finalPrompt = getReplacedPrompt(project.masterPrompt, img.bracketContent);
                          navigator.clipboard.writeText(finalPrompt);
                          notify('Replaced prompt copied!', 'success');
                        }}
                        className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-xl hover:bg-emerald-600 transition-all active:scale-95 flex flex-col items-center gap-1"
                        title="Copy Replaced Prompt"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase">Copy Prompt</span>
                      </button>

                      {img.chatLink && (
                        <a 
                          href={img.chatLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-indigo-500 text-white p-2.5 rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95 flex flex-col items-center gap-1"
                          title="Open Original Chat"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase">Open</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={`p-4 space-y-3 transition-colors ${isUploaded ? 'bg-emerald-50/20' : ''}`}>
                    <div>
                      <span className={`text-[10px] font-bold uppercase block mb-2 tracking-widest ${
                        isUploaded ? 'text-emerald-500/70' : 'text-slate-400'
                      }`}>Bracket Content (Click to Copy)</span>
                      <div className="flex flex-wrap gap-2">
                        {img.bracketContent && img.bracketContent.length > 0 ? (
                          img.bracketContent.map((item, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => {
                                if (item.value) {
                                  navigator.clipboard.writeText(item.value);
                                  notify(`Copied: ${item.title}`, 'success');
                                }
                              }}
                              className={`flex items-center border rounded-lg overflow-hidden shadow-sm group/item transition-all text-left active:scale-95 ${
                                isUploaded 
                                  ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50' 
                                  : 'bg-slate-50 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50'
                              }`}
                            >
                              <span className={`px-2 py-1 text-[10px] font-bold border-r transition-colors ${
                                isUploaded 
                                  ? 'bg-emerald-100/50 text-emerald-600 border-emerald-100 group-hover/item:bg-emerald-200/50 group-hover/item:text-emerald-700' 
                                  : 'bg-slate-200/50 text-slate-500 border-slate-100 group-hover/item:bg-indigo-100/50 group-hover/item:text-indigo-600'
                              }`}>{item.title}</span>
                              <span className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
                                isUploaded ? 'text-emerald-800 group-hover/item:text-emerald-900' : 'text-slate-700 group-hover/item:text-indigo-700'
                              }`}>{item.value || '-'}</span>
                            </button>
                          ))
                        ) : (
                          <span className={`text-[10px] italic ${isUploaded ? 'text-emerald-400' : 'text-slate-400'}`}>None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {project.images.length === 0 && (
              <div className={`text-center py-20 rounded-3xl border border-dashed transition-colors ${
                isUploaded ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <ImageIcon className={`w-10 h-10 mx-auto mb-2 opacity-50 ${isUploaded ? 'text-emerald-300' : 'text-slate-300'}`} />
                <p className={`${isUploaded ? 'text-emerald-500' : 'text-slate-400'} font-medium`}>No images stored in this vault.</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border transition-colors ${
            isUploaded ? 'bg-emerald-100/50 border-emerald-200' : 'bg-amber-50 border-amber-100'
          }`}>
            <h4 className={`font-bold text-sm mb-2 flex items-center gap-2 ${
              isUploaded ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              <FolderLock className="w-4 h-4" />
              Storage Note
            </h4>
            <p className={`text-xs leading-normal ${
              isUploaded ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              Project Vault uses base64 storage for images to ensure your assets are private and self-contained. For large projects, consider linking external high-res assets in the description.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
