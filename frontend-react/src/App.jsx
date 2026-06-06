import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  AlertCircle, ArrowRight, ArrowUp, BookOpen, Bot,
  Building2, Check, CheckCircle2, ChevronDown, ChevronRight,
  Circle, Clock, Cpu, Database, ExternalLink, FileText,
  Globe, HelpCircle, Info, Layers, Loader2, LogOut,
  MessageSquare, Minus, Network, Plus, Search, Settings,
  Share2, ShieldCheck, Sparkles, Trash2, Upload,
  User, UserPlus, Users, X, Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  motion, useMotionValue, useSpring, useTransform,
  useAnimate, stagger,
} from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ── cn helper ──────────────────────────────────────────── */
const cn = (...args) => args.filter(Boolean).join(' ');

/* ══════════════════════════════════════════════════════════
   TextRepel — physics-based letter scatter
   ══════════════════════════════════════════════════════════ */
function RepelLetter({ letter, mouseX, mouseY, radius, strength, mode, stiffness, damping, mass, className }) {
  const ref = useRef(null);
  const oX = useRef(0), oY = useRef(0);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sX = useSpring(x, { stiffness, damping, mass });
  const sY = useSpring(y, { stiffness, damping, mass });
  const rotate = useTransform(sX, v => v * 0.2);

  useEffect(() => {
    const capture = () => {
      if (!ref.current) return;
      const c = ref.current.closest('[data-repel]');
      if (!c) return;
      const cr = c.getBoundingClientRect(), lr = ref.current.getBoundingClientRect();
      oX.current = lr.left - cr.left + lr.width / 2;
      oY.current = lr.top  - cr.top  + lr.height / 2;
    };
    const raf = requestAnimationFrame(capture);
    window.addEventListener('resize', capture);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', capture); };
  }, []);

  useEffect(() => {
    const update = () => {
      const dx = oX.current - mouseX.get(), dy = oY.current - mouseY.get();
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < radius && dist > 0) {
        const force = ((1 - dist/radius)**2) * strength;
        const a = Math.atan2(dy, dx);
        const dir = mode === 'attract' ? -1 : 1;
        x.set(Math.cos(a) * force * dir);
        y.set(Math.sin(a) * force * dir);
      } else { x.set(0); y.set(0); }
    };
    const u1 = mouseX.on('change', update), u2 = mouseY.on('change', update);
    return () => { u1(); u2(); };
  }, [mouseX, mouseY, radius, strength, mode, x, y]);

  if (letter === ' ') return <span className="inline-block whitespace-pre"> </span>;
  return (
    <motion.span ref={ref} className={cn('inline-block whitespace-pre will-change-transform', className)}
      style={{ x: sX, y: sY, rotate }} aria-hidden>{letter}</motion.span>
  );
}

function TextRepel({ text, className, style, radius=100, strength=45, mode='repel', stiffness=200, damping=15, mass=0.4 }) {
  const ref = useRef(null);
  const mX = useMotionValue(-9999), mY = useMotionValue(-9999);
  return (
    <div ref={ref} data-repel className={cn('inline-flex flex-wrap items-center justify-center cursor-default select-none', className)}
      style={style}
      onMouseMove={e => { const r = ref.current?.getBoundingClientRect(); if (!r) return; mX.set(e.clientX - r.left); mY.set(e.clientY - r.top); }}
      onMouseLeave={() => { mX.set(-9999); mY.set(-9999); }}
      aria-label={text}>
      {text.split('').map((l, i) => (
        <RepelLetter key={i} letter={l} mouseX={mX} mouseY={mY} radius={radius} strength={strength}
          mode={mode} stiffness={stiffness} damping={damping} mass={mass} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LetterCascade — 3D split-flap (blur removed to avoid warning)
   ══════════════════════════════════════════════════════════ */
function LetterCascade({ text, className, style, staggerDuration=0.04, staggerFrom='first', stiffness=220, damping=16, triggerOnClick=false, onComplete }) {
  const [scope, animate] = useAnimate();
  const [blocked, setBlocked] = useState(false);

  const trigger = useCallback(() => {
    if (blocked) return;
    setBlocked(true);
    const merge = base => ({ ...base, delay: stagger(staggerDuration, { from: staggerFrom }) });
    const spring = { type: 'spring', stiffness, damping };

    animate('.c-front', { rotateX: 90, opacity: 0, y: -4 }, merge(spring))
      .then(() => {
        animate('.c-front', { rotateX: 0, opacity: 1, y: 0 }, { duration: 0 })
          .then(() => { setBlocked(false); onComplete?.(); });
      });
    animate('.c-echo', { rotateX: 0, opacity: 1, y: 0, scale: 1 }, merge(spring))
      .then(() => { animate('.c-echo', { rotateX: -90, opacity: 0, y: 4, scale: 0.85 }, { duration: 0 }); });
  }, [blocked, animate, staggerDuration, staggerFrom, stiffness, damping, onComplete]);

  return (
    <span ref={scope} className={cn('inline-flex cursor-pointer select-none items-center justify-center', className)}
      style={style}
      {...(triggerOnClick ? { onClick: trigger } : { onMouseEnter: trigger })}
      aria-label={text}>
      {text.split('').map((letter, i) => (
        <span key={i} className="relative inline-flex whitespace-pre" style={{ perspective: '600px' }}>
          <motion.span className="c-front inline-block" style={{ rotateX: 0, y: 0, transformOrigin: 'bottom center', backfaceVisibility: 'hidden' }}>{letter}</motion.span>
          <motion.span className="c-echo absolute inset-0 inline-block" style={{ rotateX: -90, opacity: 0, y: 4, scale: 0.85, transformOrigin: 'top center', backfaceVisibility: 'hidden' }}>{letter}</motion.span>
        </span>
      ))}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   DotNetwork — canvas particle network (landing bg)
   ══════════════════════════════════════════════════════════ */
function DotNetwork({ color = '#2563EB' }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const N = Math.floor((W * H) / 14000);
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const CON_DIST = 110;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < CON_DIST) {
            ctx.globalAlpha = (1 - d / CON_DIST) * 0.12;
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', onResize); };
  }, [color]);

  return <canvas ref={canvasRef} className="hero-canvas" style={{ width: '100%', height: '100%' }} />;
}

/* ══════════════════════════════════════════════════════════
   Knowledge Graph — SVG radial layout
   ══════════════════════════════════════════════════════════ */
function KnowledgeGraphPanel({ docs, concepts, activeDoc, onDocClick, onConceptClick, activeQuery }) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 260, h: 400 });

  useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const cx = w / 2, cy = h / 2;
  const r1 = Math.min(cx, cy) * 0.38; // concept ring
  const r2 = Math.min(cx, cy) * 0.68; // doc ring

  const nodes = useMemo(() => {
    const result = [];
    // Center node
    result.push({ id: '__center__', type: 'center', label: activeQuery ? activeQuery.slice(0, 20) + (activeQuery.length > 20 ? '…' : '') : 'Noesis', x: cx, y: cy });
    // Concepts
    concepts.forEach((c, i) => {
      const angle = (i / Math.max(concepts.length, 1)) * Math.PI * 2 - Math.PI / 2;
      result.push({ id: `c_${i}`, type: 'concept', label: c, x: cx + Math.cos(angle) * r1, y: cy + Math.sin(angle) * r1 });
    });
    // Docs
    docs.forEach((d, i) => {
      const angle = (i / Math.max(docs.length, 1)) * Math.PI * 2 - Math.PI / 4;
      const fn = d.filename || d;
      result.push({ id: `d_${i}`, type: 'doc', label: fn.replace(/\.(pdf|docx)$/i, '').slice(0, 16), fullname: fn, x: cx + Math.cos(angle) * r2, y: cy + Math.sin(angle) * r2 });
    });
    return result;
  }, [concepts, docs, cx, cy, r1, r2, activeQuery]);

  const edges = useMemo(() => {
    const result = [];
    const center = nodes.find(n => n.type === 'center');
    if (!center) return result;
    nodes.filter(n => n.type !== 'center').forEach(n => {
      result.push({ from: center, to: n, type: n.type });
    });
    return result;
  }, [nodes]);

  const hasContent = docs.length > 0 || concepts.length > 0;

  return (
    <div className="graph-panel">
      <div className="panel-header">
        <span className="panel-title">Knowledge Graph</span>
      </div>
      <div className="graph-canvas-wrap" ref={svgRef} style={{ position: 'relative' }}>
        {!hasContent ? (
          <div className="graph-empty">
            <Network size={28} />
            <p><strong>Graph will appear here</strong>Upload documents and ask a question to see your knowledge network form.</p>
          </div>
        ) : (
          <svg className="graph-svg" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
            {/* Edges */}
            {edges.map((e, i) => (
              <line key={i}
                x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
                stroke={e.type === 'concept' ? '#2563EB' : '#C8C8BF'}
                strokeWidth={e.type === 'concept' ? 0.8 : 0.6}
                strokeOpacity={e.type === 'concept' ? 0.3 : 0.2}
                strokeDasharray={e.type === 'doc' ? '3 3' : 'none'}
              />
            ))}

            {/* Concept nodes */}
            {nodes.filter(n => n.type === 'concept').map(n => (
              <g key={n.id} style={{ cursor: 'pointer' }}
                onClick={() => onConceptClick?.(n.label)}>
                <circle cx={n.x} cy={n.y} r={5} fill="#2563EB" fillOpacity={0.12} stroke="#2563EB" strokeWidth={1} strokeOpacity={0.5} />
                <text x={n.x} y={n.y + 14} className="graph-label" fontSize="8" fill="#555555" textAnchor="middle">{n.label}</text>
              </g>
            ))}

            {/* Doc nodes */}
            {nodes.filter(n => n.type === 'doc').map(n => (
              <g key={n.id} style={{ cursor: 'pointer' }}
                onClick={() => onDocClick?.(n.fullname)}>
                <rect x={n.x - 18} y={n.y - 8} width={36} height={16} rx="3"
                  fill={n.fullname === activeDoc ? '#2563EB' : '#FAFAF7'}
                  stroke={n.fullname === activeDoc ? '#2563EB' : '#C8C8BF'}
                  strokeWidth={0.8}
                />
                <text x={n.x} y={n.y + 4} fontSize="7" fill={n.fullname === activeDoc ? '#ffffff' : '#999999'} textAnchor="middle" fontFamily="Inter">{n.label}</text>
              </g>
            ))}

            {/* Center node */}
            {nodes.filter(n => n.type === 'center').map(n => (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={20} fill="#111111" />
                <text x={n.x} y={n.y + 3} fontSize="7" fill="#ffffff" textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic">noesis</text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */
const authHeaders = user => ({ Authorization: `Bearer ${user.token}` });
const adminLogoUrl = code => `${API_URL}/api/administrations/${encodeURIComponent(code)}/logo`;

const THEME_VAR_MAP = {
  primary:'--accent', primary_dark:'--accent-dark', primary_subtle:'--accent-subtle',
};
function applyTheme(themesMap, key) {
  const p = themesMap?.[key]?.palette || themesMap?.[key];
  if (!p) return;
  for (const [k, v] of Object.entries(THEME_VAR_MAP)) {
    if (p[k]) document.documentElement.style.setProperty(v, p[k]);
  }
}

function extractConcepts(text) {
  if (!text) return [];
  const bold = [...text.matchAll(/\*\*([^*]{3,30})\*\*/g)].map(m => m[1].trim());
  const caps = [...text.matchAll(/\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2})\b/g)].map(m => m[1]);
  const all = [...new Set([...bold, ...caps])].filter(c => c.length >= 4 && c.length <= 28 && !/^(The|This|That|These|When|Where|What|Which|While|With|From|Into|Over|Under|Through|During|After|Before|About|Between|Against|Upon|Within|Without|Also|Even|Both|More|Some|Each|Such|Any|All|Per|For|And|But|Not|Its|Are|Was|Has|Had|Can|Will|Would|Should|Could|May|Might|Must|Let|Get|Got|Set|Put|Use|Used|Using|Make|Made|Making|Take|Show|See|Say|Know|Work|Think|Need|Find|Give|Tell|Want|Come|Look|Call|Ask|Try|Turn|Move|Play|Run|Keep|Hand|Back|Part|High|Long|Live|Year|Day|Way|Man|Old|New|Good|Big|Great|Same|Right|Real|Large|Small|Local|Next|Little|Own|Early|Important|Public|Available|Different|International|National|Social|Economic|Political|Environmental|Natural|Historical|Traditional|General|Technical|Professional|Personal|Major|Various|Several|Special|Common|Current|Previous|Recent|Final|Central|Wide|Main|Free|Based|Used|Known|Related|Named|Called|Defined|Located|Considered|Found|Noted)\s*$/i.test(c));
  return all.slice(0, 10);
}

function generateFollowUps(query, concepts) {
  const qs = [];
  if (concepts[0]) qs.push(`What are the key factors affecting ${concepts[0]}?`);
  if (concepts[1]) qs.push(`How does ${concepts[1]} relate to the main findings?`);
  qs.push(`What evidence supports the conclusions about "${query.slice(0, 40)}"?`);
  qs.push(`Are there any contradictions or uncertainties in the sources?`);
  return qs.slice(0, 3);
}

function parseReport(text) {
  if (!text) return { summary: '', evidence: '' };
  const paras = text.trim().split(/\n\n+/);
  if (paras.length <= 1) return { summary: paras[0] || '', evidence: '' };
  return { summary: paras[0], evidence: paras.slice(1).join('\n\n') };
}

let _toastId = 0;

/* ══════════════════════════════════════════════════════════
   Noesis logo mark
   ══════════════════════════════════════════════════════════ */
function NoesisIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#111111" />
      <path d="M5 6v12h3.4L15 9.4V18H19V6h-3.4L9 14.6V6H5z" fill="white" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   Toast Container
   ══════════════════════════════════════════════════════════ */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? <CheckCircle2 size={13} /> : t.type === 'error' ? <AlertCircle size={13} /> : <Loader2 size={13} className="spin" />}
          </span>
          <div className="toast-body">
            <strong className="toast-title">{t.title}</strong>
            {t.msg && <span className="toast-msg">{t.msg}</span>}
          </div>
          <button className="toast-close" onClick={() => onRemove(t.id)}><X size={10} /></button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Admin Switcher
   ══════════════════════════════════════════════════════════ */
function AdminSwitcher({ user, administrations, activeAdmin, onSwitch, onManage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (user?.role !== 'admin' || !administrations?.length) return null;
  const cur = administrations.find(a => a.code === activeAdmin);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="topbar-btn" onClick={() => setOpen(v => !v)}>
        <Building2 size={12} />
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur?.name || activeAdmin}</span>
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.18s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', boxShadow: 'var(--sh-md)', padding: 4, zIndex: 300, animation: 'popIn 0.12s ease' }}>
          {administrations.map(a => (
            <div key={a.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '0.8rem', color: a.code === activeAdmin ? 'var(--accent)' : 'var(--text-2)', fontWeight: a.code === activeAdmin ? 600 : 400 }}
              onClick={() => { onSwitch(a.code); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span>{a.name || a.code}</span>
              {a.code === activeAdmin && <Check size={12} />}
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 10px', borderRadius: 'var(--r-sm)', fontSize: '0.78rem', color: 'var(--text-3)' }}
            onClick={() => { setOpen(false); onManage(); }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Settings size={12} />Manage Workspaces
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Research Report (one Q+A as an intelligence report)
   ══════════════════════════════════════════════════════════ */
function ResearchReport({ query, answer, documents, user, onFollowUp, onConceptClick }) {
  const [shared, setShared] = useState(false);
  const concepts = useMemo(() => extractConcepts(answer?.content || ''), [answer?.content]);
  const followUps = useMemo(() => generateFollowUps(query.content, concepts), [query.content, concepts]);
  const { summary, evidence } = useMemo(() => parseReport(answer?.content || ''), [answer?.content]);

  const handleShare = async () => {
    if (!answer || shared) return;
    try {
      const r = await fetch(`${API_URL}/api/community`, {
        method: 'POST',
        headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.content, answer: answer.content, sources: answer.sources || [] }),
      });
      if (r.ok) setShared(true);
    } catch {}
  };

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Query */}
      <div className="report-query-row">
        <div className="report-query-label">Query</div>
        <div className="report-query-text">{query.content}</div>
      </div>

      {answer ? (
        <div className="report-card">
          {/* Summary */}
          <div className="report-section">
            <div className="report-section-label"><Sparkles size={11} />Executive Summary</div>
            <div className="report-summary">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </div>

          {/* Evidence */}
          {evidence && (
            <div className="report-section">
              <div className="report-section-label"><BookOpen size={11} />Evidence</div>
              <div className="report-evidence">
                <ReactMarkdown>{evidence}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Sources */}
          {answer.sources?.length > 0 && (
            <div className="report-section">
              <div className="report-section-label"><Database size={11} />Source Documents</div>
              <div className="report-sources-row">
                {answer.sources.map(s => (
                  <button key={s} className="source-cite" title={s}
                    onClick={() => window.open(`${API_URL}/api/documents/${encodeURIComponent(s)}/view?token=${user.token}`, '_blank')}>
                    <FileText size={10} />{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Concepts */}
          {concepts.length > 0 && (
            <div className="report-section">
              <div className="report-section-label"><Network size={11} />Related Concepts</div>
              <div className="concepts-row">
                {concepts.map(c => (
                  <button key={c} className="concept-tag" onClick={() => onConceptClick?.(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up questions */}
          <div className="report-section">
            <div className="report-section-label"><ArrowRight size={11} />Suggested Investigations</div>
            <div className="followup-list">
              {followUps.map(q => (
                <button key={q} className="followup-item" onClick={() => onFollowUp?.(q)}>
                  <ChevronRight size={12} />{q}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="report-actions-row">
            <button className={`report-action-btn${shared ? ' shared' : ''}`} onClick={handleShare} disabled={shared}>
              {shared ? <Check size={11} /> : <Share2 size={11} />}
              {shared ? 'Shared' : 'Share to Community'}
            </button>
          </div>
        </div>
      ) : (
        <div className="thinking-row">
          <div className="thinking-dots"><span/><span/><span/></div>
          Assembling intelligence report…
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Upload Modal
   ══════════════════════════════════════════════════════════ */
function UploadModal({ onClose, user, pendingJobFiles, onJobStarted, loadDocuments, documents }) {
  const [file, setFile]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef(null);

  const isValid = f => f && ['.pdf', '.docx'].some(e => f.name.toLowerCase().endsWith(e));
  const pickFile = f => {
    setError('');
    if (!isValid(f)) { setError('Only PDF and DOCX files are supported.'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File size exceeds the 10MB limit.'); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers: authHeaders(user), body: fd });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'Upload failed.'); return; }
      onJobStarted(d.job_id, d.filename);
      setFile(null); loadDocuments();
    } catch { setError('Network error. Please try again.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async filename => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    await fetch(`${API_URL}/api/documents/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: authHeaders(user) });
    loadDocuments();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="login-modal upload-modal" style={{ maxWidth: 520 }}>
        <div className="upload-modal-header">
          <div className="upload-modal-title">Knowledge Base</div>
          <button className="modal-close-btn" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="upload-modal-body">
          <div className={`dropzone${file ? ' has-file' : ''}${dragging ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />
            <div className="dropzone-icon">{file ? <FileText size={20} /> : <Upload size={20} />}</div>
            <h3>{file ? file.name : 'Drop a file or click to browse'}</h3>
            <p>{file ? `${(file.size/1024/1024).toFixed(2)} MB` : 'PDF and DOCX supported'}</p>
          </div>

          <div className="upload-notice">
            <Info size={13} />
            Files are indexed in the background. You can keep working while processing runs — we'll notify you when complete.
          </div>

          {error && <div className="upload-error">{error}</div>}

          {file && (
            <div className="upload-actions" style={{ marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : 'Upload & Index'}
              </button>
              <button className="btn-secondary" onClick={() => { setFile(null); setError(''); }}>
                <X size={13} />Clear
              </button>
            </div>
          )}

          {documents.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="admin-sect-title">Indexed Documents</div>
              <div className="doc-list-upload">
                {documents.map(doc => {
                  const fn = doc.filename || doc;
                  const processing = pendingJobFiles.has(fn) || !doc.ingested;
                  return (
                    <div key={fn} className="doc-list-item">
                      <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span className="doc-list-name">{fn}</span>
                      {processing
                        ? <span className="doc-processing-pill"><Loader2 size={8} className="spin" />Indexing</span>
                        : <span className="doc-ready-pill"><Check size={8} />Ready</span>}
                      <button className="doc-list-del" onClick={() => handleDelete(fn)}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Admin Panel
   ══════════════════════════════════════════════════════════ */
function AdminPanel({ user, administrations, setAdministrations, themes, activeTheme, onThemeChange, onClose }) {
  const [tab, setTab]         = useState('workspaces');
  const [users, setUsers]     = useState([]);
  const [ldUsers, setLdUsers] = useState(true);
  const [newWs, setNewWs]     = useState({ code: '', name: '' });
  const [wsMsg, setWsMsg]     = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'demo', admin: administrations[0]?.code || '' });
  const [userMsg, setUserMsg] = useState('');

  useEffect(() => {
    if (tab !== 'users') return;
    setLdUsers(true);
    fetch(`${API_URL}/api/users`, { headers: authHeaders(user) })
      .then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
      .finally(() => setLdUsers(false));
  }, [tab]);

  const createWs = async e => {
    e.preventDefault(); setWsMsg('');
    const r = await fetch(`${API_URL}/api/administrations`, {
      method: 'POST', headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
      body: JSON.stringify(newWs),
    });
    const d = await r.json();
    if (r.ok) { setAdministrations(prev => [...prev, d]); setNewWs({ code:'', name:'' }); setWsMsg('Created!'); }
    else setWsMsg(d.detail || 'Error');
  };

  const deleteWs = async code => {
    if (!window.confirm(`Delete workspace "${code}"?`)) return;
    const r = await fetch(`${API_URL}/api/administrations/${code}`, { method: 'DELETE', headers: authHeaders(user) });
    if (r.ok) setAdministrations(prev => prev.filter(a => a.code !== code));
  };

  const createUser = async e => {
    e.preventDefault(); setUserMsg('');
    const r = await fetch(`${API_URL}/api/users`, {
      method: 'POST', headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newUser, administration: newUser.admin }),
    });
    const d = await r.json();
    if (r.ok) { setUsers(prev => [...prev, d]); setNewUser({ username:'', password:'', role:'demo', admin: administrations[0]?.code||'' }); setUserMsg('Created!'); }
    else setUserMsg(d.detail || 'Error');
  };

  const deleteUser = async username => {
    if (!window.confirm(`Delete "${username}"?`)) return;
    await fetch(`${API_URL}/api/users/${username}`, { method: 'DELETE', headers: authHeaders(user) });
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  return (
    <div className="workspace-admin">
      <div className="workspace-admin-header">
        <div className="workspace-admin-title">Administration</div>
        <button className="btn-secondary" onClick={onClose}><X size={13} />Close</button>
      </div>
      <div className="admin-panel">
        <div className="admin-tabs">
          {[['workspaces','Workspaces'],['users','Users'],['themes','Themes']].map(([k,l]) => (
            <button key={k} className={`admin-tab-btn${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'workspaces' && (
          <>
            <div className="admin-sect">
              <div className="admin-sect-title">Active Workspaces</div>
              <div className="admin-list">
                {administrations.map(a => (
                  <div key={a.code} className="admin-item">
                    <Building2 size={14} style={{ color:'var(--accent)', flexShrink:0 }} />
                    <div className="admin-item-info">
                      <div className="admin-item-name">{a.name || a.code}</div>
                      <div className="admin-item-sub">{a.code}</div>
                    </div>
                    {a.code !== 'DEFAULT' && (
                      <button className="admin-btn danger" onClick={() => deleteWs(a.code)}><Trash2 size={11} />Delete</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-sect">
              <div className="admin-sect-title">New Workspace</div>
              <form onSubmit={createWs} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="field-row">
                  <div className="field-col"><label className="field-label">Code</label><input className="field-input" placeholder="e.g. 001" value={newWs.code} onChange={e => setNewWs(p=>({...p,code:e.target.value}))} required /></div>
                  <div className="field-col"><label className="field-label">Name</label><input className="field-input" placeholder="Workspace name" value={newWs.name} onChange={e => setNewWs(p=>({...p,name:e.target.value}))} required /></div>
                </div>
                {wsMsg && <div style={{ fontSize:'0.76rem', color: wsMsg.includes('!') ? 'var(--green)' : 'var(--danger)' }}>{wsMsg}</div>}
                <button type="submit" className="btn-secondary" style={{ alignSelf:'flex-start' }}><Plus size={12} />Create</button>
              </form>
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="admin-sect">
              <div className="admin-sect-title">All Users</div>
              {ldUsers ? <div style={{color:'var(--text-3)',fontSize:'0.8rem'}}>Loading…</div> : (
                <div className="admin-list">
                  {users.map(u => (
                    <div key={u.username} className="admin-item">
                      <User size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                      <div className="admin-item-info">
                        <div className="admin-item-name">{u.username}</div>
                        <div className="admin-item-sub">{(u.administrations||[]).join(', ')}</div>
                      </div>
                      <span className={`role-pill ${u.role}`}>{u.role}</span>
                      {u.username !== user.username && (
                        <button className="admin-btn danger" onClick={() => deleteUser(u.username)}><Trash2 size={11} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="admin-sect">
              <div className="admin-sect-title">Add User</div>
              <form onSubmit={createUser} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="field-row">
                  <div className="field-col"><label className="field-label">Username</label><input className="field-input" value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} required /></div>
                  <div className="field-col"><label className="field-label">Password</label><input type="password" className="field-input" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} required /></div>
                </div>
                <div className="field-row">
                  <div className="field-col"><label className="field-label">Role</label>
                    <select className="field-select" value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                      <option value="demo">Demo</option><option value="user">User</option><option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="field-col"><label className="field-label">Workspace</label>
                    <select className="field-select" value={newUser.admin} onChange={e=>setNewUser(p=>({...p,admin:e.target.value}))}>
                      {administrations.map(a => <option key={a.code} value={a.code}>{a.name||a.code}</option>)}
                    </select>
                  </div>
                </div>
                {userMsg && <div style={{ fontSize:'0.76rem', color: userMsg.includes('!') ? 'var(--green)' : 'var(--danger)' }}>{userMsg}</div>}
                <button type="submit" className="btn-secondary" style={{ alignSelf:'flex-start' }}><UserPlus size={12} />Add User</button>
              </form>
            </div>
          </>
        )}

        {tab === 'themes' && (
          <div className="admin-sect">
            <div className="admin-sect-title">Interface Theme</div>
            <div className="theme-grid">
              {Object.entries(themes||{}).map(([key,t]) => (
                <button key={key} className={`theme-swatch${activeTheme===key?' active':''}`} onClick={() => onThemeChange(key)}>
                  <div className="theme-dot" style={{ background: t.palette?.primary || t.primary || '#2563EB' }} />
                  <span>{t.label||key}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MARQUEE DATA
   ══════════════════════════════════════════════════════════ */
const MARQUEE_ITEMS = [
  { label: 'Research Papers', icon: BookOpen },
  { label: 'Legal Contracts', icon: FileText },
  { label: 'Technical Manuals', icon: Settings },
  { label: 'Financial Reports', icon: Layers },
  { label: 'Medical Literature', icon: Cpu },
  { label: 'Engineering Specs', icon: Network },
  { label: 'Policy Documents', icon: ShieldCheck },
  { label: 'Product SOPs', icon: Database },
  { label: 'Academic Theses', icon: BookOpen },
  { label: 'Court Filings', icon: FileText },
  { label: 'Audit Reports', icon: Layers },
  { label: 'Clinical Trials', icon: Cpu },
];

/* ══════════════════════════════════════════════════════════
   EMERGENCE STEPS
   ══════════════════════════════════════════════════════════ */
const EMERGENCE_STEPS = [
  { label: 'You upload information.', desc: 'Any PDF or DOCX — manuals, contracts, research papers, reports. Noesis accepts the document as raw knowledge.' },
  { label: 'Noesis extracts concepts.', desc: 'The ingestion pipeline reads every page. Charts and diagrams are interpreted by vision. Text is cleaned and structured.' },
  { label: 'Concepts become relationships.', desc: 'Extracted ideas are embedded and placed in a high-dimensional space where related concepts cluster naturally.' },
  { label: 'Relationships become understanding.', desc: 'MMR retrieval surfaces the most diverse, relevant evidence — not just the most similar text.' },
  { label: 'Understanding answers questions.', desc: 'Every response is a structured intelligence report: summary, evidence, sources, concepts, follow-up investigations.' },
];

/* ══════════════════════════════════════════════════════════
   LANDING SCREEN
   ══════════════════════════════════════════════════════════ */
function LandingScreen({ onEnter }) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginTab, setLoginTab]   = useState('login');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const landingRef = useRef(null);

  // Intersection observer for emergence steps
  const stepRefs = useRef([]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.2 }
    );
    stepRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = landingRef.current;
    if (!el) return;
    const h = () => setScrolled(el.scrollTop > 20);
    el.addEventListener('scroll', h);
    return () => el.removeEventListener('scroll', h);
  }, []);

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/${loginTab === 'login' ? 'api/login' : 'api/register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'Something went wrong.'); return; }
      onEnter(d);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const openLogin = () => { setShowLogin(true); setError(''); };

  return (
    <div className="landing" ref={landingRef}>
      {/* Nav */}
      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="landing-nav-logo">
          <NoesisIcon size={22} />
          <span className="landing-nav-wordmark">Noesis</span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn-ghost-sm" onClick={() => { setLoginTab('register'); openLogin(); }}>Register</button>
          <button className="btn-accent-sm" onClick={() => { setLoginTab('login'); openLogin(); }}>Sign In</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <DotNetwork color="#2563EB" />
        <div className="hero-inner">
          <div className="hero-eyebrow"><Cpu size={10} />Knowledge Intelligence System</div>
          <h1 className="hero-title">
            <TextRepel text="Noesis" radius={120} strength={55} stiffness={220} damping={14} mass={0.35} />
          </h1>
          <p className="hero-subtitle">Understanding hidden within information.</p>
          <div className="hero-cta-wrap">
            <input className="hero-cta-input" placeholder="What are you trying to understand?" onFocus={openLogin} readOnly />
            <button className="hero-cta-btn" onClick={openLogin}>Enter →</button>
          </div>
          <div style={{ display:'flex', gap:24, justifyContent:'center', fontSize:'0.75rem', color:'var(--text-3)' }}>
            <span><strong style={{color:'var(--text-2)'}}>demo / demo</strong> to try instantly</span>
            <span>·</span>
            <span>3 uploads · 10 queries</span>
          </div>
        </div>
        <div className="scroll-hint">
          <ChevronDown size={14} />
          <span>scroll</span>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-section">
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => {
            const Icon = item.icon;
            return (
              <span key={i} className="marquee-item">
                <Icon size={12} />{item.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Emergence narrative */}
      <section className="emergence-section">
        <div className="emergence-label">How understanding emerges</div>
        <div className="emergence-chain">
          {EMERGENCE_STEPS.map((step, i) => (
            <div key={i} ref={el => stepRefs.current[i] = el} className="emergence-step">
              <span className="emergence-num">{String(i+1).padStart(2,'0')}</span>
              <div className="emergence-content">
                <h3>{step.label}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* The arrow between steps */}
      </section>

      {/* Footer / byline */}
      <footer className="landing-footer">
        <div className="byline-prefix">Built by</div>
        <LetterCascade
          text="Astitva Bandil"
          staggerFrom="center"
          staggerDuration={0.04}
          stiffness={260}
          damping={14}
          className="byline-name"
        />
      </footer>

      {/* Login modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLogin(false)}>
          <div className="login-modal" style={{ animation: 'slideUp 0.24s ease' }}>
            <div className="login-modal-header">
              <div className="login-modal-title">
                {loginTab === 'login' ? 'Welcome back.' : 'Create account.'}
              </div>
              <button className="modal-close-btn" onClick={() => setShowLogin(false)}><X size={12} /></button>
            </div>

            <div className="auth-seg">
              <button className={`auth-seg-btn${loginTab==='login'?' active':''}`} onClick={() => { setLoginTab('login'); setError(''); }}>Sign In</button>
              <button className={`auth-seg-btn${loginTab==='register'?' active':''}`} onClick={() => { setLoginTab('register'); setError(''); }}>Register</button>
            </div>

            <form className="login-form" onSubmit={submit}>
              <div className="login-field-group">
                <label className="login-field-label">Username</label>
                <input className="login-input" type="text" placeholder="Enter username" value={username} onChange={e=>setUsername(e.target.value)} required autoFocus />
              </div>
              <div className="login-field-group">
                <label className="login-field-label">Password</label>
                <input className="login-input" type="password" placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)} required />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="btn-primary" disabled={loading}>
                {loading && <Loader2 size={13} className="spin" />}
                {loginTab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="login-hint">
              Demo access: <kbd>demo</kbd> / <kbd>demo</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SOURCE PANEL (left)
   ══════════════════════════════════════════════════════════ */
function SourcePanel({ documents, activeDoc, onDocClick, onUpload, pendingJobFiles, onDeleteDoc }) {
  return (
    <div className="source-panel">
      <div className="panel-header">
        <span className="panel-title">Knowledge Sources</span>
        <button className="panel-action-btn" onClick={onUpload} title="Add document"><Plus size={12} /></button>
      </div>
      <div className="panel-scroll">
        {documents.length === 0 ? (
          <div className="source-empty">
            <div className="source-empty-title">No sources yet</div>
            <div className="source-empty-sub">Upload a PDF or DOCX to build your knowledge base.</div>
          </div>
        ) : documents.map(doc => {
          const fn = doc.filename || doc;
          const processing = pendingJobFiles.has(fn) || (doc.ingested === false);
          return (
            <div key={fn} className={`doc-source-card${fn === activeDoc ? ' active' : ''}`} onClick={() => onDocClick(fn === activeDoc ? null : fn)}>
              <button className="doc-del-btn" onClick={e => { e.stopPropagation(); onDeleteDoc(fn); }} title="Remove"><Trash2 size={10} /></button>
              <div className="doc-source-name" title={fn}>{fn.replace(/\.(pdf|docx)$/i,'')}</div>
              <div className="doc-source-meta">
                {processing
                  ? <span className="doc-processing-pill"><Loader2 size={8} className="spin" />Indexing</span>
                  : <><span className="doc-ready-pill"><Check size={8} />Ready</span>{doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}</>
                }
              </div>
            </div>
          );
        })}
      </div>
      <div className="source-panel-footer">
        <button className="upload-trigger-btn" onClick={onUpload}>
          <Upload size={12} />Add Document
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WORKSPACE PANEL (center)
   ══════════════════════════════════════════════════════════ */
function WorkspacePanel({ user, documents, reports, sending, onSend, activeDoc, setActiveDoc, onUpload, pendingJobFiles }) {
  const [input, setInput]   = useState('');
  const [showScope, setShowScope] = useState(false);
  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);
  const scopeRef   = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [reports, sending]);

  useEffect(() => {
    const h = e => { if (scopeRef.current && !scopeRef.current.contains(e.target)) setShowScope(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const allConcepts = useMemo(() => {
    const all = [];
    reports.forEach(r => { if (r.answer) all.push(...extractConcepts(r.answer.content)); });
    return [...new Set(all)].slice(0, 15);
  }, [reports]);

  const SUGGESTIONS = [
    'What are the key findings across all documents?',
    'Summarize the main procedures described.',
    'What are the critical specifications mentioned?',
    'Identify any safety warnings or constraints.',
  ];

  const handleSend = q => {
    const query = (q || input).trim();
    if (!query || sending) return;
    setInput('');
    onSend(query, activeDoc);
  };

  return (
    <div className="workspace-panel">
      <div className="workspace-scroll">
        {reports.length === 0 && !sending ? (
          <div className="workspace-welcome">
            <h2 className="welcome-big">
              {documents.length === 0
                ? 'Begin by uploading knowledge.'
                : 'What are you trying to understand?'}
            </h2>
            <p className="welcome-sub">
              {documents.length === 0
                ? 'Noesis extracts understanding from your documents — not just text, but structure, relationships, and insight.'
                : `${documents.length} source${documents.length>1?'s':''} indexed. Ask a question to generate your first intelligence report.`}
            </p>
            {documents.length > 0 ? (
              <div className="welcome-suggestions">
                {SUGGESTIONS.map(q => (
                  <button key={q} className="welcome-suggestion" onClick={() => handleSend(q)}>
                    <ChevronRight size={13} />{q}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn-primary" style={{ width:'auto', padding:'0 24px' }} onClick={onUpload}>
                <Upload size={14} />Upload your first document
              </button>
            )}
          </div>
        ) : (
          <>
            {reports.map((r, i) => (
              <ResearchReport
                key={i}
                query={r.query}
                answer={r.answer}
                documents={documents}
                user={user}
                onFollowUp={q => { setInput(q); setTimeout(() => handleSend(q), 50); }}
                onConceptClick={c => setInput(`Tell me more about ${c}`)}
              />
            ))}
            {sending && (
              <div style={{ marginBottom: 40 }}>
                <div className="report-query-label">Query</div>
                <div className="report-query-text" style={{ marginBottom: 16 }}>{input || '…'}</div>
                <div className="thinking-row"><div className="thinking-dots"><span/><span/><span/></div>Assembling intelligence report…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Query bar */}
      <div className="query-bar-wrap">
        <div className="query-bar">
          <div className="query-bar-top">
            <input ref={inputRef} className="query-input"
              placeholder="What are you trying to understand?"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={sending} />
            <button className="query-send-btn" onClick={() => handleSend()} disabled={!input.trim() || sending}>
              {sending ? <Loader2 size={14} className="spin" /> : <ArrowUp size={14} />}
            </button>
          </div>
          <div className="query-bar-bottom">
            <div style={{ position:'relative' }} ref={scopeRef}>
              <button className={`qbar-chip${activeDoc ? ' active' : ''}`} onClick={() => documents.length > 0 && setShowScope(v=>!v)}>
                <Database size={10} />
                {activeDoc ? activeDoc.replace(/\.(pdf|docx)$/i,'').slice(0,20) : 'All Sources'}
                {activeDoc && <button onClick={e => { e.stopPropagation(); setActiveDoc(null); }} style={{color:'var(--text-3)',marginLeft:2,lineHeight:1}}><X size={9}/></button>}
              </button>
              {showScope && (
                <div className="scope-menu">
                  <button className="scope-menu-item" onClick={() => { setActiveDoc(null); setShowScope(false); }}>
                    <Database size={11} />All Sources
                  </button>
                  {documents.map(d => {
                    const fn = d.filename || d;
                    return (
                      <button key={fn} className="scope-menu-item" onClick={() => { setActiveDoc(fn); setShowScope(false); }}>
                        <FileText size={11} />{fn}
                        {pendingJobFiles.has(fn) && <Loader2 size={9} className="spin" style={{color:'var(--warning)',marginLeft:'auto'}}/>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {user?.role === 'demo' && user.remaining >= 0 && (
              <span style={{ fontSize:'0.7rem', color:'var(--text-4)', marginLeft:6 }}>
                {user.remaining} quer{user.remaining===1?'y':'ies'} remaining
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser]           = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reports, setReports]     = useState([]);   // [{query, answer}]
  const [sending, setSending]     = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [chatId, setChatId]       = useState(null);

  // UI state
  const [showUpload, setShowUpload]   = useState(false);
  const [showAdmin, setShowAdmin]     = useState(false);

  // Multi-tenant
  const [administrations, setAdministrations] = useState([]);
  const [activeAdmin, setActiveAdmin]         = useState('DEFAULT');
  const [themes, setThemes]                   = useState({});
  const [activeTheme, setActiveTheme]         = useState('');

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, title, msg='', dur=6000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, {id,type,title,msg}]);
    if (dur > 0) setTimeout(() => setToasts(prev => prev.filter(t=>t.id!==id)), dur);
    return id;
  }, []);
  const removeToast = id => setToasts(prev => prev.filter(t=>t.id!==id));

  // Background ingestion polling
  const [pendingJobs, setPendingJobs] = useState([]);
  const pendingJobFiles = useMemo(() => new Set(pendingJobs.map(j=>j.filename)), [pendingJobs]);
  const handleJobStarted = (job_id, filename) => {
    setPendingJobs(prev => [...prev, {job_id, filename}]);
    addToast('loading', `Indexing ${filename}…`, 'Processing in background', 0);
  };

  useEffect(() => {
    if (!user || pendingJobs.length === 0) return;
    const iv = setInterval(async () => {
      const still = [];
      for (const job of pendingJobs) {
        try {
          const r = await fetch(`${API_URL}/api/ingest-status/${job.job_id}`, { headers: authHeaders(user) });
          const d = await r.json();
          if (d.status === 'done') {
            setToasts(prev => prev.filter(t => t.title !== `Indexing ${job.filename}…`));
            addToast('success', `${job.filename} ready`, `${d.chunk_count||0} chunks indexed`);
            loadDocuments();
          } else if (d.status === 'error') {
            setToasts(prev => prev.filter(t => t.title !== `Indexing ${job.filename}…`));
            addToast('error', `Failed: ${job.filename}`, d.message||'Ingestion error');
          } else still.push(job);
        } catch { still.push(job); }
      }
      setPendingJobs(still);
    }, 2000);
    return () => clearInterval(iv);
  }, [pendingJobs, user]);

  // All concepts across all reports for graph
  const allConcepts = useMemo(() => {
    const all = [];
    reports.forEach(r => { if (r.answer) all.push(...extractConcepts(r.answer.content)); });
    return [...new Set(all)].slice(0, 12);
  }, [reports]);

  const activeQuery = reports.length > 0 ? reports[reports.length-1].query.content : '';

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`${API_URL}/api/documents`, { headers: authHeaders(user) });
      const d = await r.json();
      setDocuments(d.documents || []);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadDocuments();
    fetch(`${API_URL}/api/themes`, { headers: authHeaders(user) })
      .then(r => r.json()).then(d => setThemes(d.themes||{})).catch(()=>{});
    fetch(`${API_URL}/api/administrations`, { headers: authHeaders(user) })
      .then(r => r.json()).then(d => { if(d.administrations) setAdministrations(d.administrations); }).catch(()=>{});
    if (user.administrations) setAdministrations(user.administrations.map(c=>({code:c,name:c})));
    if (user.active_admin) setActiveAdmin(user.active_admin);
  }, [user]);

  const handleLogin = d => {
    setUser(d);
    if (d.remaining === 0) addToast('info', 'Demo limit reached', 'You have used all your queries.');
  };

  const handleLogout = async () => {
    try { await fetch(`${API_URL}/api/logout`, { method:'POST', headers: authHeaders(user) }); } catch {}
    setUser(null); setDocuments([]); setReports([]); setChatId(null); setActiveDoc(null);
  };

  const handleSend = async (query, scopeFile=null) => {
    if (!query.trim() || sending) return;
    if (user.role === 'demo' && user.remaining === 0) {
      addToast('error', 'Query limit reached', 'Demo accounts have 10 queries.'); return;
    }
    setSending(true);
    setReports(prev => [...prev, { query: { content: query }, answer: null }]);

    try {
      const body = { query, source_file: scopeFile };
      if (chatId) body.chat_id = chatId;
      const r = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 402) addToast('error', 'Limit reached', 'Upgrade or clone the repo.');
        setReports(prev => prev.slice(0, -1));
        return;
      }
      if (!chatId && d.chat_id) setChatId(d.chat_id);
      setReports(prev => prev.map((rep, i) =>
        i === prev.length - 1 ? { ...rep, answer: { content: d.answer, sources: d.sources||[] } } : rep
      ));
      if (user.role === 'demo' && d.remaining_queries != null) {
        setUser(prev => ({ ...prev, remaining: d.remaining_queries }));
      }
    } catch { addToast('error', 'Request failed', 'Please try again.'); setReports(prev => prev.slice(0,-1)); }
    finally { setSending(false); }
  };

  const handleDeleteDoc = async filename => {
    if (!window.confirm(`Remove "${filename}" from knowledge base?`)) return;
    await fetch(`${API_URL}/api/documents/${encodeURIComponent(filename)}`, { method:'DELETE', headers: authHeaders(user) });
    loadDocuments();
    if (activeDoc === filename) setActiveDoc(null);
  };

  const handleSwitchAdmin = async code => {
    try {
      await fetch(`${API_URL}/api/users/me/active-admin`, {
        method: 'POST', headers: { ...authHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_code: code }),
      });
    } catch {}
    setActiveAdmin(code);
    setUser(prev => ({ ...prev, active_admin: code, admin_code: code }));
    setReports([]); setChatId(null); setActiveDoc(null); loadDocuments();
  };

  if (!user) return <LandingScreen onEnter={handleLogin} />;

  return (
    <div className="app-shell">
      {/* Topbar */}
      <div className="app-topbar">
        <a className="topbar-logo" href="#" onClick={e => { e.preventDefault(); setReports([]); setChatId(null); }}>
          <NoesisIcon size={20} />
          <span className="topbar-wordmark">Noesis</span>
        </a>
        <div className="topbar-sep" />
        <div className="topbar-middle">
          {activeDoc && (
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.76rem', color:'var(--text-2)' }}>
              <FileText size={11} style={{color:'var(--accent)'}} />
              Scoped to: <strong style={{color:'var(--text)'}}>{activeDoc.replace(/\.(pdf|docx)$/i,'')}</strong>
              <button onClick={() => setActiveDoc(null)} style={{color:'var(--text-3)',display:'grid',placeItems:'center'}}><X size={10}/></button>
            </span>
          )}
        </div>
        <div className="topbar-right">
          {user.role === 'demo' && user.remaining >= 0 && (
            <span style={{ fontSize:'0.71rem', color:'var(--text-3)' }}>{user.remaining} queries left</span>
          )}
          <AdminSwitcher user={user} administrations={administrations} activeAdmin={activeAdmin} onSwitch={handleSwitchAdmin} onManage={() => setShowAdmin(v=>!v)} />
          {user.role === 'admin' && (
            <button className={`topbar-btn${showAdmin?' active':''}`} onClick={() => setShowAdmin(v=>!v)}>
              <Settings size={12} />Admin
            </button>
          )}
          <button className="topbar-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={12} />Sign out
          </button>
          <div className="user-pip" title={user.username}>{user.username[0].toUpperCase()}</div>
        </div>
      </div>

      {/* 3-panel body */}
      <div className="three-panel">
        <SourcePanel
          documents={documents}
          activeDoc={activeDoc}
          onDocClick={setActiveDoc}
          onUpload={() => setShowUpload(true)}
          pendingJobFiles={pendingJobFiles}
          onDeleteDoc={handleDeleteDoc}
        />

        {showAdmin ? (
          <div style={{ gridColumn: '2 / -1', overflow:'hidden', display:'flex' }}>
            <AdminPanel
              user={user}
              administrations={administrations}
              setAdministrations={setAdministrations}
              themes={themes}
              activeTheme={activeTheme}
              onThemeChange={k => { setActiveTheme(k); applyTheme(themes, k); }}
              onClose={() => setShowAdmin(false)}
            />
          </div>
        ) : (
          <>
            <WorkspacePanel
              user={user}
              documents={documents}
              reports={reports}
              sending={sending}
              onSend={handleSend}
              activeDoc={activeDoc}
              setActiveDoc={setActiveDoc}
              onUpload={() => setShowUpload(true)}
              pendingJobFiles={pendingJobFiles}
            />
            <KnowledgeGraphPanel
              docs={documents}
              concepts={allConcepts}
              activeDoc={activeDoc}
              onDocClick={setActiveDoc}
              onConceptClick={c => handleSend(`Tell me more about ${c}`)}
              activeQuery={activeQuery}
            />
          </>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => { setShowUpload(false); loadDocuments(); }}
          user={user}
          pendingJobFiles={pendingJobFiles}
          onJobStarted={handleJobStarted}
          loadDocuments={loadDocuments}
          documents={documents}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
