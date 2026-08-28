import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldCheck,
  Cloud,
  Database,
  Smartphone,
  Globe,
  Radio,
  FileCode,
  Key,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { syncService, setCustomRoomCode } from '../utils/syncChannel';
import { isSupabaseConfigured, getActiveSupabaseConfig, SUPABASE_SQL_SCHEMA } from '../services/supabase';

interface ProjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectorModal({ isOpen, onClose }: ProjectorModalProps) {
  const [activeTab, setActiveTab] = useState<'connect' | 'supabase_setup'>('connect');
  const [roomCode, setRoomCode] = useState(() => syncService.getRoomCode());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isSupabaseReady = isSupabaseConfigured();
  const supabaseConfig = getActiveSupabaseConfig();

  const getProjectorUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'projector');
    url.searchParams.set('room', roomCode);
    return url.toString();
  };

  const handleOpenWindow = () => {
    soundManager.playClick();
    const url = getProjectorUrl();
    const width = 1280;
    const height = 720;
    const left = window.screen.width ? (window.screen.width - width) / 2 : 100;
    const top = window.screen.height ? (window.screen.height - height) / 2 : 100;

    const win = window.open(
      url,
      'ImagemAcaoProjecao',
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );

    if (win) {
      syncService.registerChildWindow(win);
      win.focus();
    }
  };

  const handleCopyLink = () => {
    soundManager.playClick();
    const url = getProjectorUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleCopyCode = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopySql = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  const handleRoomCodeChange = (newCode: string) => {
    const clean = newCode.toUpperCase().replace(/\s+/g, '-');
    setRoomCode(clean);
    setCustomRoomCode(clean);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-indigo-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-3xl max-h-[90vh] bg-white text-indigo-950 rounded-[32px] shadow-2xl overflow-y-auto border-4 border-yellow-400 p-5 sm:p-7"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-indigo-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center text-indigo-950 shadow-md transform -rotate-3 shrink-0">
                <Tv className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-indigo-950 tracking-tight">
                    Modo Projeção & Multi-Dispositivos
                  </h2>
                  {isSupabaseReady ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Cloud className="w-3 h-3" /> Supabase Conectado
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      <Radio className="w-3 h-3" /> Sincronização Local
                    </span>
                  )}
                </div>
                <p className="text-indigo-900/60 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Transmitir na TV / Smart TV / Celulares com privacidade da palavra
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-indigo-950/60 hover:text-indigo-950 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-5 p-1 bg-indigo-50 rounded-2xl border border-indigo-100">
            <button
              onClick={() => setActiveTab('connect')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'connect'
                  ? 'bg-yellow-400 text-indigo-950 shadow-md'
                  : 'text-indigo-900/70 hover:text-indigo-950'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Conectar TV / 2ª Tela</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase_setup')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'supabase_setup'
                  ? 'bg-yellow-400 text-indigo-950 shadow-md'
                  : 'text-indigo-900/70 hover:text-indigo-950'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Integração Supabase & Vercel</span>
            </button>
          </div>

          {activeTab === 'connect' && (
            <>
              {/* Room Code Banner */}
              <div className="p-4 rounded-2xl bg-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 shadow-lg border border-indigo-800">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-yellow-400 block mb-0.5">
                    Código da Sala (Multi-Dispositivos)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => handleRoomCodeChange(e.target.value)}
                      className="text-2xl sm:text-3xl font-black tracking-widest bg-transparent border-b-2 border-yellow-400 text-yellow-300 uppercase focus:outline-none w-44"
                    />
                  </div>
                  <span className="text-[11px] text-indigo-300">
                    Abra em qualquer Smart TV ou celular com este código
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-indigo-700"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>

              {/* Word Privacy Alert */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 mb-5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <strong className="text-emerald-950 font-black uppercase block mb-0.5">
                    Privacidade Total da Palavra Secreta
                  </strong>
                  <p className="text-emerald-900/80 font-medium leading-relaxed">
                    Na tela de projeção (TV), o público e a equipe adivinhadora veem a categoria sorteada, o dado, o cronômetro e os pontos. <strong>A palavra secreta NUNCA é enviada ou exibida na TV</strong>, ficando visível apenas no computador do operador.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
                <button
                  onClick={handleOpenWindow}
                  id="btn-open-projector-window"
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-yellow-400/30 border-2 border-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-5 h-5 stroke-[2.5]" />
                  <span>ABRIR JANELA DE PROJEÇÃO</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  id="btn-copy-projector-link"
                  className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-black text-xs sm:text-sm uppercase tracking-wider border border-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link da Sala'}</span>
                </button>
              </div>

              {/* 3 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 text-center">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                    1
                  </span>
                  <h4 className="font-black text-xs uppercase text-indigo-950 mb-0.5">
                    No mesmo computador
                  </h4>
                  <p className="text-[11px] text-indigo-900/70">
                    Clique em <strong>Abrir Janela</strong> e arraste para a 2ª tela / HDMI.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 text-center">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                    2
                  </span>
                  <h4 className="font-black text-xs uppercase text-indigo-950 mb-0.5">
                    Em Smart TV ou Celular
                  </h4>
                  <p className="text-[11px] text-indigo-900/70">
                    Copie o link e acesse pelo navegador da Smart TV com o código da sala.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 text-center">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                    3
                  </span>
                  <h4 className="font-black text-xs uppercase text-indigo-950 mb-0.5">
                    Sincronizado na Nuvem
                  </h4>
                  <p className="text-[11px] text-indigo-900/70">
                    Gire o dado e inicie o cronômetro. A TV atualiza em tempo real!
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'supabase_setup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-indigo-950" />
                  <h3 className="text-sm font-black uppercase text-indigo-950">
                    Status da Integração Supabase
                  </h3>
                </div>
                <p className="text-xs text-indigo-900/70 font-semibold mb-3">
                  O Supabase permite persistir suas palavras customizadas na nuvem e sincronizar a TV em qualquer dispositivo pela internet via Realtime.
                </p>

                <div className="flex items-center gap-2">
                  {isSupabaseReady ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black uppercase border border-emerald-300">
                      <Check className="w-4 h-4 text-emerald-600" /> Supabase Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-black uppercase border border-amber-300">
                      <Radio className="w-4 h-4 text-amber-600" /> Configuração Opcional (Modo Local Ativo)
                    </span>
                  )}
                  {supabaseConfig.url && (
                    <span className="text-xs text-indigo-900/60 truncate font-mono">
                      URL: {supabaseConfig.url}
                    </span>
                  )}
                </div>
              </div>

              {/* Vercel & Supabase step by step */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900/60">
                  Como publicar no Vercel e conectar ao Supabase:
                </h4>

                <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <strong className="text-xs font-black uppercase text-indigo-950">
                      Crie um projeto no Supabase (supabase.com)
                    </strong>
                  </div>
                  <p className="text-[12px] text-indigo-900/70 pl-7">
                    Vá no <strong>SQL Editor</strong> do seu projeto Supabase, cole o script abaixo e clique em <strong>Run</strong>.
                  </p>
                  <div className="pl-7">
                    <button
                      onClick={handleCopySql}
                      className="py-2 px-3 rounded-xl bg-indigo-900 text-yellow-300 hover:bg-indigo-800 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <FileCode className="w-4 h-4" />}
                      <span>{copiedSql ? 'Script SQL Copiado!' : 'Copiar Script SQL do Banco'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <strong className="text-xs font-black uppercase text-indigo-950">
                      Configurar Variáveis no Vercel (vercel.com)
                    </strong>
                  </div>
                  <p className="text-[12px] text-indigo-900/70 pl-7">
                    No painel do Vercel em <strong>Settings &gt; Environment Variables</strong>, adicione:
                  </p>
                  <div className="pl-7 font-mono text-[11px] bg-indigo-950 text-indigo-200 p-2.5 rounded-xl space-y-1">
                    <div><span className="text-yellow-400">VITE_SUPABASE_URL</span> = https://seu-projeto.supabase.co</div>
                    <div><span className="text-yellow-400">VITE_SUPABASE_ANON_KEY</span> = eyJhbGci...</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <strong className="text-xs font-black uppercase text-indigo-950">
                      Deploy com 1 Clique
                    </strong>
                  </div>
                  <p className="text-[12px] text-indigo-900/70 pl-7">
                    O arquivo <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono text-indigo-900">vercel.json</code> já está configurado no projeto para suportar o roteamento de Single Page Application (SPA) perfeitamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
