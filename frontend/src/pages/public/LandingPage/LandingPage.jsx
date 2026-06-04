import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../../../context/LanguageContext';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './LandingPage.css';

const SITE_URL = 'https://e-report-frontend.vercel.app';
const OG_IMAGE = `${SITE_URL}/og-image.svg`;

/* ── SVG Illustrations ──────────────────────────────────────────────────── */
const IllustrationHero = () => (
  <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--hero" aria-hidden="true">
    {/* Sky background */}
    <rect width="500" height="420" fill="none"/>
    {/* School building */}
    <rect x="60" y="180" width="280" height="200" rx="4" fill="#1E2A78" opacity="0.9"/>
    <rect x="60" y="160" width="280" height="30" rx="4" fill="#0f1a52"/>
    {/* Roof triangle */}
    <polygon points="140,100 200,60 260,100" fill="#FF7A59"/>
    {/* Flag */}
    <line x1="200" y1="60" x2="200" y2="20" stroke="#FFB547" strokeWidth="2.5"/>
    <polygon points="200,20 230,30 200,40" fill="#FFB547"/>
    {/* Windows */}
    {[[90,200],[150,200],[210,200],[270,200],[90,260],[150,260],[210,260],[270,260]].map(([x,y],i) => (
      <rect key={i} x={x} y={y} width="50" height="40" rx="6" fill="#60a5fa" opacity="0.8"/>
    ))}
    {/* Door */}
    <rect x="165" y="310" width="70" height="70" rx="4" fill="#FFB547"/>
    <circle cx="228" cy="348" r="3" fill="#1E2A78"/>
    {/* Decorative sign */}
    <rect x="120" y="185" width="160" height="12" rx="3" fill="#FFB547" opacity="0.7"/>
    <text x="200" y="194.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#0f1a52">ÉCOLE PRIMAIRE</text>
    {/* Trees */}
    <ellipse cx="30" cy="320" rx="22" ry="28" fill="#16a34a" opacity="0.8"/>
    <rect x="27" y="340" width="6" height="40" fill="#78350f"/>
    <ellipse cx="420" cy="310" rx="25" ry="32" fill="#15803d" opacity="0.9"/>
    <rect x="417" y="332" width="6" height="48" fill="#78350f"/>
    <ellipse cx="460" cy="330" rx="18" ry="22" fill="#16a34a"/>
    <rect x="457" y="347" width="6" height="33" fill="#78350f"/>
    {/* Ground */}
    <rect x="0" y="370" width="500" height="50" rx="8" fill="#16a34a" opacity="0.4"/>
    {/* Path */}
    <rect x="165" y="370" width="70" height="50" fill="#d4a96a" opacity="0.5"/>
    {/* Sun */}
    <circle cx="440" cy="70" r="32" fill="#FFB547" opacity="0.9"/>
    {[0,45,90,135,180,225,270,315].map((a,i) => (
      <line key={i} x1={440+Math.cos(a*Math.PI/180)*38} y1={70+Math.sin(a*Math.PI/180)*38} x2={440+Math.cos(a*Math.PI/180)*50} y2={70+Math.sin(a*Math.PI/180)*50} stroke="#FFB547" strokeWidth="3" strokeLinecap="round"/>
    ))}
    {/* Clouds */}
    <g opacity="0.7">
      <ellipse cx="80" cy="80" rx="30" ry="16" fill="white"/>
      <ellipse cx="100" cy="72" rx="22" ry="18" fill="white"/>
      <ellipse cx="60" cy="75" rx="18" ry="14" fill="white"/>
    </g>
    <g opacity="0.6">
      <ellipse cx="310" cy="50" rx="36" ry="18" fill="white"/>
      <ellipse cx="335" cy="42" rx="24" ry="20" fill="white"/>
      <ellipse cx="288" cy="46" rx="20" ry="16" fill="white"/>
    </g>
    {/* Students walking */}
    <g transform="translate(430,340)">
      <circle cx="0" cy="-30" r="10" fill="#fbbf24"/>
      <rect x="-6" y="-20" width="12" height="20" rx="3" fill="#3b82f6"/>
      <line x1="-6" y1="-10" x2="-14" y2="0" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"/>
      <line x1="6" y1="-10" x2="12" y2="-2" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"/>
    </g>
    <g transform="translate(455,345)">
      <circle cx="0" cy="-28" r="9" fill="#f87171"/>
      <rect x="-5" y="-19" width="10" height="18" rx="3" fill="#a855f7"/>
      <line x1="-5" y1="-8" x2="-12" y2="2" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="-8" x2="10" y2="0" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  </svg>
);

const IllustrationWhatsapp = () => (
  <svg viewBox="0 0 280 480" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--phone" aria-hidden="true">
    {/* Phone body */}
    <rect x="20" y="10" width="240" height="460" rx="36" fill="#1f2937" stroke="#374151" strokeWidth="2"/>
    <rect x="30" y="20" width="220" height="440" rx="30" fill="#111827"/>
    {/* Screen */}
    <rect x="30" y="20" width="220" height="440" rx="30" fill="#f0fdf4"/>
    {/* Status bar */}
    <rect x="30" y="20" width="220" height="32" rx="30" fill="#16a34a"/>
    <rect x="30" y="40" width="220" height="12" fill="#16a34a"/>
    <text x="140" y="38" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">WhatsApp</text>
    {/* Notch */}
    <rect x="100" y="20" width="80" height="16" rx="8" fill="#1f2937"/>
    {/* Chat header */}
    <rect x="30" y="52" width="220" height="50" fill="#16a34a"/>
    <circle cx="66" cy="77" r="16" fill="#dcfce7"/>
    <text x="66" y="82" textAnchor="middle" fontSize="14" fontWeight="900" fill="#16a34a">N</text>
    <text x="120" y="72" fontSize="10" fontWeight="700" fill="white">NovaBulletin</text>
    <text x="120" y="85" fontSize="8" fill="#bbf7d0">En ligne ●</text>
    {/* Message bubbles */}
    {/* Bubble 1 */}
    <rect x="50" y="118" width="150" height="52" rx="12" fill="#dcfce7"/>
    <text x="65" y="134" fontSize="8" fontWeight="600" fill="#166534">📄 Bulletin de Kofi Mensah</text>
    <text x="65" y="147" fontSize="7.5" fill="#374151">Trimestre 2 — 2025/2026</text>
    <text x="65" y="159" fontSize="7.5" fill="#374151">Moyenne : 15.4/20 — Rang : 3/28</text>
    <text x="180" y="165" fontSize="6.5" fill="#6b7280">09:32 ✓✓</text>
    {/* Bubble 2 */}
    <rect x="50" y="182" width="140" height="38" rx="12" fill="#dcfce7"/>
    <text x="65" y="196" fontSize="7.5" fill="#374151">📎 Voir le bulletin PDF complet</text>
    <text x="65" y="210" fontSize="7" fill="#3b82f6" textDecoration="underline">Appuyez pour ouvrir →</text>
    <text x="172" y="215" fontSize="6.5" fill="#6b7280">09:32 ✓✓</text>
    {/* Bubble 3 */}
    <rect x="88" y="232" width="162" height="36" rx="12" fill="#fff"/>
    <text x="100" y="246" fontSize="7.5" fill="#374151">Merci ! J'ai reçu le bulletin 🙏</text>
    <text x="100" y="260" fontSize="7.5" fill="#374151">Très bons résultats !</text>
    <text x="234" y="263" fontSize="6.5" fill="#6b7280">09:35</text>
    {/* Bubble 4 */}
    <rect x="50" y="280" width="155" height="50" rx="12" fill="#dcfce7"/>
    <text x="65" y="295" fontSize="8" fontWeight="600" fill="#166534">📌 Rappel frais scolaires</text>
    <text x="65" y="308" fontSize="7.5" fill="#374151">Solde restant : 15 000 FCFA</text>
    <text x="65" y="320" fontSize="7.5" fill="#374151">Trimestre 3 — Échéance : 15/04</text>
    <text x="188" y="326" fontSize="6.5" fill="#6b7280">10:00 ✓✓</text>
    {/* Input bar */}
    <rect x="30" y="410" width="220" height="50" fill="#f0fdf4" rx="0"/>
    <rect x="38" y="418" width="155" height="32" rx="16" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
    <text x="60" y="438" fontSize="8" fill="#9ca3af">Écrire un message…</text>
    <circle cx="218" cy="434" r="14" fill="#16a34a"/>
    <text x="218" y="439" textAnchor="middle" fontSize="12">🎤</text>
    {/* Bottom bar */}
    <rect x="90" y="468" width="100" height="4" rx="2" fill="#374151"/>
  </svg>
);

const IllustrationLMS = () => (
  <svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--lms" aria-hidden="true">
    {/* Laptop body */}
    <rect x="60" y="40" width="400" height="260" rx="12" fill="#1f2937" stroke="#374151" strokeWidth="2"/>
    <rect x="72" y="52" width="376" height="236" rx="6" fill="#0f172a"/>
    {/* Screen content */}
    <rect x="72" y="52" width="376" height="236" rx="6" fill="#1e293b"/>
    {/* Sidebar */}
    <rect x="72" y="52" width="90" height="236" rx="6" fill="#0f172a"/>
    <text x="117" y="82" textAnchor="middle" fontSize="8" fontWeight="800" fill="#60a5fa">COURS</text>
    {[['📚','Mathématiques',72],['📖','Français',90],['🔬','Sciences',108],['🗺️','Histoire',126],['🎨','Arts',144],['📐','Géométrie',162]].map(([ico,lbl,y],i) => (
      <g key={i}>
        <rect x="78" y={y-10} width="78" height="20" rx="4" fill={i===0?'#1E2A78':'transparent'}/>
        <text x="84" y={y+3} fontSize="9">{ico}</text>
        <text x="97" y={y+3} fontSize="7.5" fill={i===0?'#fff':'#94a3b8'}>{lbl}</text>
      </g>
    ))}
    {/* Main content area */}
    <rect x="168" y="60" width="272" height="220" rx="4" fill="#1e293b"/>
    {/* Header */}
    <rect x="168" y="60" width="272" height="32" rx="4" fill="#1E2A78"/>
    <text x="184" y="76" fontSize="9" fontWeight="700" fill="white">📚 Mathématiques — 6ème A</text>
    <rect x="396" y="66" width="36" height="18" rx="4" fill="#FF7A59"/>
    <text x="414" y="78" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="white">+ Ajouter</text>
    {/* Tabs */}
    {[['Cours',168],['Devoirs',210],['Quiz',252],['Résultats',290]].map(([t,x],i) => (
      <g key={i}>
        <rect x={x} y="94" width={i===0?36:i===3?44:38} height="16" rx="4" fill={i===0?'#3b82f6':'transparent'}/>
        <text x={x+(i===0?18:i===3?22:19)} y="105.5" textAnchor="middle" fontSize="7" fontWeight={i===0?'700':'400'} fill={i===0?'#fff':'#64748b'}>{t}</text>
      </g>
    ))}
    {/* Course card */}
    <rect x="174" y="118" width="120" height="80" rx="8" fill="#0f172a" stroke="#1E2A78" strokeWidth="1.5"/>
    <rect x="174" y="118" width="120" height="32" rx="8" fill="#1E2A78"/>
    <text x="234" y="131" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">📐 Chapitre 4</text>
    <text x="234" y="143" textAnchor="middle" fontSize="7" fill="#93c5fd">Les fractions</text>
    <text x="184" y="162" fontSize="7" fill="#94a3b8">PDF · 8 pages · 2.3 MB</text>
    <text x="184" y="175" fontSize="7" fill="#94a3b8">Ajouté le 12 mai 2026</text>
    <rect x="242" y="186" width="45" height="16" rx="4" fill="#16a34a"/>
    <text x="264.5" y="197" textAnchor="middle" fontSize="7" fontWeight="700" fill="white">⬇ Télécharger</text>
    {/* Assignment card */}
    <rect x="302" y="118" width="130" height="80" rx="8" fill="#0f172a" stroke="#d97706" strokeWidth="1.5"/>
    <rect x="302" y="118" width="130" height="32" rx="8" fill="#d97706"/>
    <text x="367" y="131" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">📝 Devoir N°3</text>
    <text x="367" y="143" textAnchor="middle" fontSize="7" fill="#fef3c7">Exercices p.45-46</text>
    <text x="312" y="162" fontSize="7" fill="#94a3b8">⏰ Rendre avant le 20 mai</text>
    <rect x="312" y="168" width="80" height="6" rx="3" fill="#374151"/>
    <rect x="312" y="168" width="48" height="6" rx="3" fill="#d97706"/>
    <text x="312" y="188" fontSize="7" fill="#94a3b8">18/30 rendus ✓</text>
    {/* Quiz card */}
    <rect x="174" y="210" width="120" height="62" rx="8" fill="#0f172a" stroke="#7c3aed" strokeWidth="1.5"/>
    <rect x="174" y="210" width="120" height="24" rx="8" fill="#7c3aed"/>
    <text x="234" y="224" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">🎯 Quiz — Fractions</text>
    <text x="184" y="244" fontSize="7" fill="#94a3b8">10 questions · 20 min</text>
    <text x="184" y="255" fontSize="7" fill="#a78bfa">Moy. classe : 14.2/20</text>
    <rect x="248" y="260" width="38" height="14" rx="4" fill="#7c3aed"/>
    <text x="267" y="270" textAnchor="middle" fontSize="7" fontWeight="700" fill="white">Commencer</text>
    {/* Timetable card */}
    <rect x="302" y="210" width="130" height="62" rx="8" fill="#0f172a" stroke="#0e7490" strokeWidth="1.5"/>
    <rect x="302" y="210" width="130" height="24" rx="8" fill="#0e7490"/>
    <text x="367" y="224" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">📅 Emploi du temps</text>
    {[['Lundi','Math 8h-10h'],['Mardi','Fr. 8h-9h'],['Mercredi','Sci. 10h-12h']].map(([j,c],i) => (
      <text key={i} x="312" y={240+i*11} fontSize="7" fill="#94a3b8">{j}: <tspan fill="#e0f2fe">{c}</tspan></text>
    ))}
    {/* Laptop base */}
    <rect x="20" y="300" width="480" height="20" rx="4" fill="#374151"/>
    <rect x="140" y="300" width="240" height="8" rx="2" fill="#1f2937"/>
    {/* Decorative elements */}
    <circle cx="460" cy="30" r="18" fill="#FFB547" opacity="0.8"/>
    <circle cx="480" cy="15" r="10" fill="#FF7A59" opacity="0.6"/>
    <circle cx="50" cy="20" r="12" fill="#a855f7" opacity="0.5"/>
  </svg>
);

const IllustrationTeacher = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--teacher" aria-hidden="true">
    <circle cx="100" cy="200" r="80" fill="#dbeafe" opacity="0.4"/>
    {/* Body */}
    <rect x="70" y="110" width="60" height="70" rx="10" fill="#1E2A78"/>
    {/* Tie */}
    <polygon points="100,115 95,130 100,140 105,130" fill="#FF7A59"/>
    {/* Head */}
    <circle cx="100" cy="90" r="28" fill="#fbbf24"/>
    {/* Hair */}
    <ellipse cx="100" cy="65" rx="28" ry="12" fill="#78350f"/>
    <rect x="72" y="65" width="56" height="10" fill="#78350f"/>
    {/* Eyes */}
    <circle cx="91" cy="88" r="4" fill="white"/>
    <circle cx="109" cy="88" r="4" fill="white"/>
    <circle cx="92" cy="89" r="2.5" fill="#1f2937"/>
    <circle cx="110" cy="89" r="2.5" fill="#1f2937"/>
    {/* Smile */}
    <path d="M 91 99 Q 100 106 109 99" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Arms */}
    <rect x="40" y="115" width="32" height="12" rx="6" fill="#1E2A78"/>
    <rect x="128" y="115" width="32" height="12" rx="6" fill="#1E2A78"/>
    {/* Tablet in right hand */}
    <rect x="152" y="105" width="28" height="36" rx="4" fill="#0f172a" stroke="#60a5fa" strokeWidth="2"/>
    <rect x="155" y="108" width="22" height="28" rx="2" fill="#1e293b"/>
    {[0,1,2,3].map(i => <rect key={i} x="157" y={111+i*6} width={i===0?18:i===1?14:16} height="3" rx="1" fill="#3b82f6" opacity="0.7"/>)}
    {/* Legs */}
    <rect x="80" y="175" width="16" height="25" rx="4" fill="#374151"/>
    <rect x="104" y="175" width="16" height="25" rx="4" fill="#374151"/>
    {/* Shoes */}
    <ellipse cx="88" cy="200" rx="12" ry="5" fill="#1f2937"/>
    <ellipse cx="112" cy="200" rx="12" ry="5" fill="#1f2937"/>
  </svg>
);

const IllustrationDashboard = () => (
  <svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--dashboard" aria-hidden="true">
    {/* browser frame */}
    <rect width="560" height="380" rx="12" fill="#dde3ee"/>
    {/* title bar */}
    <rect width="560" height="36" rx="12" fill="#c9d1e0"/>
    <rect y="24" width="560" height="12" fill="#c9d1e0"/>
    <circle cx="18" cy="18" r="5" fill="#ef4444" opacity=".8"/>
    <circle cx="33" cy="18" r="5" fill="#fbbf24" opacity=".8"/>
    <circle cx="48" cy="18" r="5" fill="#22c55e" opacity=".8"/>
    <rect x="64" y="8" width="432" height="20" rx="10" fill="white" opacity=".8"/>
    <text x="280" y="22" textAnchor="middle" fontSize="8.5" fill="#6b7280">🔒 novabulletin.app/admin/dashboard</text>
    {/* sidebar */}
    <rect x="0" y="36" width="56" height="344" fill="#080f28"/>
    <rect x="10" y="48" width="36" height="36" rx="8" fill="#1E2A78"/>
    <text x="28" y="72" textAnchor="middle" fontSize="17" fontWeight="900" fill="white">N</text>
    <line x1="10" y1="92" x2="46" y2="92" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
    <rect x="6" y="100" width="44" height="28" rx="7" fill="rgba(59,130,246,.3)"/>
    <text x="28" y="120" textAnchor="middle" fontSize="15">🏠</text>
    {['👥','📊','💰','📋','📅','⚙️'].map((ico, i) => (
      <text key={i} x="28" y={152+i*30} textAnchor="middle" fontSize="13">{ico}</text>
    ))}
    {/* main bg */}
    <rect x="56" y="36" width="504" height="344" fill="#f1f5fb"/>
    {/* top header */}
    <rect x="56" y="36" width="504" height="44" fill="white"/>
    <rect x="56" y="80" width="504" height="1" fill="#e5e7eb"/>
    <text x="72" y="57" fontSize="13" fontWeight="800" fill="#111827">Tableau de bord</text>
    <text x="72" y="73" fontSize="8.5" fill="#9ca3af">Collège Saint-Michel, Lomé · Trim. 2 · 2025–2026</text>
    <circle cx="541" cy="58" r="14" fill="#dbeafe"/>
    <text x="541" y="63" textAnchor="middle" fontSize="9" fontWeight="800" fill="#1E2A78">AD</text>
    {/* stats cards */}
    {[
      {v:'428',l:'Élèves actifs',c:'#1d4ed8',x:66},
      {v:'12',l:'Classes',c:'#16a34a',x:192},
      {v:'96%',l:'Bulletins publiés',c:'#ea580c',x:318},
      {v:'87%',l:'Frais recouvrés',c:'#7c3aed',x:444},
    ].map(({v,l,c,x}) => (
      <g key={x}>
        <rect x={x} y="88" width="118" height="62" rx="10" fill="white" stroke="#eaecf0" strokeWidth="1"/>
        <rect x={x} y="88" width="118" height="3" rx="1" fill={c} opacity=".4"/>
        <text x={x+11} y="108" fontSize="8.5" fill={c}>{l}</text>
        <text x={x+11} y="139" fontSize="22" fontWeight="900" fill={c}>{v}</text>
      </g>
    ))}
    {/* bar chart card */}
    <rect x="66" y="160" width="228" height="132" rx="10" fill="white" stroke="#eaecf0" strokeWidth="1"/>
    <text x="78" y="177" fontSize="9" fontWeight="700" fill="#111827">Moyennes par classe</text>
    <rect x="66" y="182" width="228" height="1" fill="#f3f4f6"/>
    {[{c:'6A',h:64,m:'14.2',col:'#3b82f6'},{c:'6B',h:50,m:'13.1',col:'#6366f1'},{c:'5A',h:78,m:'15.8',col:'#8b5cf6'},{c:'5B',h:42,m:'12.4',col:'#06b6d4'},{c:'4A',h:60,m:'14.0',col:'#10b981'}].map(({c,h,m,col},i) => (
      <g key={i}>
        <rect x={82+i*38} y={280-h} width="24" height={h} rx="3" fill={col} opacity=".82"/>
        <text x={94+i*38} y="289" textAnchor="middle" fontSize="7" fill="#6b7280">{c}</text>
        <text x={94+i*38} y={274-h} textAnchor="middle" fontSize="7" fontWeight="700" fill="#374151">{m}</text>
      </g>
    ))}
    {/* bulletins table card */}
    <rect x="306" y="160" width="250" height="132" rx="10" fill="white" stroke="#eaecf0" strokeWidth="1"/>
    <text x="318" y="177" fontSize="9" fontWeight="700" fill="#111827">Bulletins récents</text>
    <rect x="306" y="182" width="250" height="1" fill="#f3f4f6"/>
    <text x="318" y="196" fontSize="7.5" fill="#9ca3af" fontWeight="600">ÉLÈVE</text>
    <text x="452" y="196" fontSize="7.5" fill="#9ca3af" fontWeight="600">MOY.</text>
    <text x="516" y="196" textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontWeight="600">ÉTAT</text>
    {[{n:'Kofi Mensah — 6A',m:'15.4',ok:true},{n:'Afi Dossou — 5B',m:'12.1',ok:true},{n:'Edem Kodjo — 4A',m:'17.2',ok:true},{n:'Sena Fiatowo — 3A',m:'14.8',ok:true},{n:'Kwame Asante — 6B',m:'9.3',ok:false}].map(({n,m,ok},i) => (
      <g key={i}>
        <rect x="306" y={200+i*20} width="250" height="20" fill={i%2===0?'#f9fafb':'white'}/>
        <text x="318" y={214+i*20} fontSize="7.5" fill="#374151">{n}</text>
        <text x="452" y={214+i*20} fontSize="7.5" fontWeight="800" fill={ok?'#1E2A78':'#dc2626'}>{m}/20</text>
        <circle cx="516" cy={210+i*20} r="5" fill={ok?'#22c55e':'#ef4444'} opacity=".8"/>
      </g>
    ))}
    {/* activity footer */}
    <rect x="56" y="300" width="504" height="80" fill="white"/>
    <rect x="56" y="300" width="504" height="1" fill="#e5e7eb"/>
    <text x="72" y="316" fontSize="9" fontWeight="700" fill="#111827">⚡ Activité récente</text>
    {[{t:'📄 Bulletin de Kofi Mensah publié — envoyé sur WhatsApp à 245 parents',a:'2 min'},{t:'💰 Paiement 25 000 FCFA enregistré — Afi Dossou · TMoney',a:'15 min'},{t:'✏️ Fiche Mathématiques 6A signée numériquement par Prof. Kodjo Agbé',a:'1h'}].map(({t,a},i) => (
      <g key={i}>
        <text x="72" y={332+i*16} fontSize="7.5" fill="#4b5563">{t}</text>
        <text x="548" y={332+i*16} textAnchor="end" fontSize="7" fill="#9ca3af">{a}</text>
      </g>
    ))}
  </svg>
);

const IllustrationMobileApp = () => (
  <svg viewBox="0 0 220 430" xmlns="http://www.w3.org/2000/svg" className="lp-illus lp-illus--mobile" aria-hidden="true">
    {/* phone shell */}
    <rect x="8" y="0" width="204" height="430" rx="30" fill="#1f2937" stroke="#374151" strokeWidth="1.5"/>
    <rect x="14" y="6" width="192" height="418" rx="26" fill="#f8fafc"/>
    {/* notch */}
    <rect x="76" y="6" width="68" height="18" rx="9" fill="#1f2937"/>
    {/* app header */}
    <rect x="14" y="6" width="192" height="62" rx="26" fill="#1E2A78"/>
    <rect x="14" y="44" width="192" height="24" fill="#1E2A78"/>
    <text x="110" y="33" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">📝 Fiche de notes</text>
    <text x="110" y="50" textAnchor="middle" fontSize="8" fill="#93c5fd">6ème A · Mathématiques · Trim. 2</text>
    {/* column headers */}
    <rect x="14" y="68" width="192" height="22" fill="#dde3ee"/>
    <text x="28" y="83" fontSize="7.5" fontWeight="700" fill="#4b5563">Élève</text>
    <text x="115" y="83" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4b5563">Devoir</text>
    <text x="150" y="83" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4b5563">Compo</text>
    <text x="188" y="83" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1d4ed8">Moy.</text>
    {/* student rows */}
    {[{n:'Kofi M.',d:'14',c:'16',m:'15.2',col:'#16a34a'},{n:'Afi D.',d:'12',c:'10',m:'11.2',col:'#d97706'},{n:'Edem K.',d:'18',c:'17',m:'17.6',col:'#16a34a'},{n:'Sena F.',d:'09',c:'11',m:'10.2',col:'#d97706'},{n:'Kwame A.',d:'07',c:'08',m:'7.6',col:'#dc2626'},{n:'Abena T.',d:'15',c:'14',m:'14.6',col:'#16a34a'},{n:'Yao B.',d:'13',c:'12',m:'12.6',col:'#d97706'}].map(({n,d,c,m,col},i) => (
      <g key={i}>
        <rect x="14" y={90+i*27} width="192" height="27" fill={i%2===0?'#fff':'#f8fafb'}/>
        <text x="27" y={108+i*27} fontSize="8" fontWeight="600" fill="#111827">{n}</text>
        <rect x="101" y={93+i*27} width="26" height="16" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/>
        <text x="114" y={105+i*27} textAnchor="middle" fontSize="8" fontWeight="700" fill="#374151">{d}</text>
        <rect x="134" y={93+i*27} width="26" height="16" rx="4" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/>
        <text x="147" y={105+i*27} textAnchor="middle" fontSize="8" fontWeight="700" fill="#374151">{c}</text>
        <rect x="168" y={93+i*27} width="32" height="16" rx="5" fill={col+'22'}/>
        <text x="184" y={105+i*27} textAnchor="middle" fontSize="8.5" fontWeight="900" fill={col}>{m}</text>
      </g>
    ))}
    {/* stats bar */}
    <rect x="14" y="279" width="192" height="30" fill="#eef2ff"/>
    <text x="27" y="292" fontSize="8" fill="#4b5563">Moy. classe :</text>
    <text x="108" y="292" fontSize="9" fontWeight="900" fill="#1E2A78">12.4 / 20</text>
    <text x="27" y="303" fontSize="7" fill="#6b7280">28 élèves · 6 matières saisies</text>
    {/* sign button */}
    <rect x="22" y="317" width="176" height="32" rx="10" fill="#1E2A78"/>
    <text x="110" y="337" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">✍️ Signer et soumettre</text>
    {/* confirmation */}
    <rect x="22" y="357" width="176" height="22" rx="7" fill="#dcfce7" stroke="#86efac" strokeWidth="1"/>
    <text x="110" y="372" textAnchor="middle" fontSize="8" fontWeight="700" fill="#16a34a">✅ Soumis · Visible par l'admin</text>
    {/* bottom nav */}
    <rect x="14" y="384" width="192" height="40" fill="white"/>
    <rect x="14" y="384" width="192" height="1" fill="#e5e7eb"/>
    {[{ico:'🏠',x:44},{ico:'📝',x:86,a:true},{ico:'📊',x:134},{ico:'👤',x:180}].map(({ico,x,a},i) => (
      <g key={i}>
        {a && <rect x={x-14} y="387" width="28" height="28" rx="7" fill="#eff6ff"/>}
        <text x={x} y="408" textAnchor="middle" fontSize="14">{ico}</text>
      </g>
    ))}
    {/* home indicator */}
    <rect x="78" y="422" width="64" height="3" rx="2" fill="#374151" opacity=".4"/>
  </svg>
);

/* ── Data ───────────────────────────────────────────────────────────────── */
const FEATURES_ROW1 = [
  { icon: '🧮', color: '#dbeafe', iconColor: '#1d4ed8', title: 'Calcul automatique', desc: 'Moyennes, coefficients, rangs calculés instantanément. Zéro formule Excel, zéro erreur.' },
  { icon: '📄', color: '#dcfce7', iconColor: '#16a34a', title: 'Bulletins PDF en 1 clic', desc: 'Bulletin professionnel avec logo, couleurs et cachet de votre école. Prêt à imprimer ou partager.' },
  { icon: '📱', color: '#fce7f3', iconColor: '#be185d', title: 'WhatsApp & Email', desc: 'Parents informés instantanément par WhatsApp. Distribution automatique dès la publication.' },
];
const FEATURES_ROW2 = [
  { icon: '📝', color: '#fff7ed', iconColor: '#ea580c', title: 'Fiches de notes numériques', desc: 'Chaque enseignant dispose d\'une fiche numérique sur son téléphone. Saisie mobile, calcul auto et signature électronique. Zéro papier, zéro perte.' },
  { icon: '💰', color: '#fef3c7', iconColor: '#d97706', title: 'Frais scolaires', desc: 'Gestion intégrée des cotisations. Blocage automatique des bulletins si frais impayés.' },
  { icon: '📊', color: '#ede9fe', iconColor: '#7c3aed', title: 'Analytics temps réel', desc: 'Taux de recouvrement, progression par classe, bulletins publiés vs en attente — en direct.' },
];

const LMS_FEATURES = [
  { icon: '📚', title: 'Cours & Documents', desc: 'Les enseignants déposent leurs cours, PDF et ressources pédagogiques. Les élèves y accèdent depuis leur portail, à tout moment.' },
  { icon: '📝', title: 'Devoirs & Exercices', desc: 'Publication des devoirs avec date limite. Suivi en temps réel des rendus. Rappels automatiques aux élèves en retard.' },
  { icon: '🎯', title: 'Quiz Interactifs', desc: 'Créez des quiz avec correction automatique. Les résultats sont disponibles immédiatement après la soumission.' },
  { icon: '📅', title: 'Emploi du Temps', desc: 'Emploi du temps de chaque classe accessible depuis l\'application. Mis à jour en temps réel par l\'administration.' },
  { icon: '📢', title: 'Annonces & Actualités', desc: 'Publiez des annonces ciblées aux parents, enseignants ou élèves. Chaque partie reçoit uniquement ce qui la concerne.' },
  { icon: '🏆', title: 'Examens Blancs', desc: 'Organisez des examens blancs, saisissez les notes et publiez le palmarès complet de l\'établissement.' },
];

const STEPS = [
  { num: '01', icon: '🏫', title: 'Inscrivez votre école', desc: 'Formulaire en 2 minutes. Validation sous 24h. Compte activé gratuitement.', tags: ['Nom école','Type','Niveau','Contact'] },
  { num: '02', icon: '⚙️', title: 'Configurez en 30 min', desc: 'Ajoutez classes, matières, enseignants, élèves. Import CSV disponible.', tags: ['Classes','Matières','Coefficients','Import CSV'] },
  { num: '03', icon: '✏️', title: 'Saisie des notes', desc: 'Les professeurs saisissent les notes sur leur téléphone. Signature numérique.', tags: ['Devoir','Composition','Appréciations','Signature'] },
  { num: '04', icon: '🚀', title: 'Publiez & envoyez', desc: 'L\'admin publie. Chaque parent reçoit le bulletin sur WhatsApp instantanément.', tags: ['PDF auto','WhatsApp','Email','Blocage frais'] },
];

const ROLES = [
  { icon: '🏫', title: 'Administrateur', color: '#1E2A78', desc: 'Vision complète de votre établissement.', features: ['Tableau de bord analytique complet','Gestion classes, matières, enseignants','Bulletins PDF + publication en 1 clic','Paramétrage des frais scolaires','Registre présences, santé, bibliothèque','Inventaire, alumni, examens nationaux','Documents officiels & profils du personnel','Exportation CSV de toutes les données'] },
  { icon: '👨‍🏫', title: 'Enseignant', color: '#0369a1', desc: 'Votre fiche de notes numérique toujours dans votre poche.', features: ['📝 Fiche numérique sur mobile','Saisie des notes en temps réel','Calcul automatique des moyennes','Appréciations par élève','Signature électronique de la fiche','Dépôt de cours et documents','Publication de devoirs et quiz','Correction examens blancs'] },
  { icon: '💼', title: 'Économe', color: '#d97706', desc: 'Gérez les frais sans paperasse.', features: ['Enregistrement paiements (TMoney, Flooz, cash)','Vue impayés en temps réel','Génération de reçus PDF','Suivi par cotisation et période','Rapport financier exportable','Statistiques de recouvrement','Bulletins retenus automatiquement','Accès multi-établissement'] },
  { icon: '👨‍👩‍👧', title: 'Parent', color: '#15803d', desc: 'Suivez la scolarité de vos enfants.', features: ['Bulletins sur WhatsApp & Email','Portail parent 24h/24','Progression trimestre par trimestre','Historique complet des bulletins','Paiement frais en ligne','Consulter cours et devoirs LMS','Annonces de l\'école','Notifications instantanées'] },
];

const TESTIMONIALS = [
  { name: 'Kodjo Agbenyéga', role: 'Directeur', school: 'Collège Sainte-Marie, Lomé', text: 'Avant NovaBulletin, nous passions 5 jours à préparer les bulletins chaque trimestre. Maintenant c\'est 30 minutes. Les parents adorent recevoir les bulletins sur WhatsApp. C\'est une révolution pour notre école.', initials: 'KA', color: '#1E2A78', photo: 'https://i.pravatar.cc/100?img=68' },
  { name: 'Mme Afi Dossou', role: 'Directrice', school: 'École Primaire Les Colibris, Lomé', text: 'Le système de blocage automatique pour frais impayés a transformé notre recouvrement. Nous avons récupéré 40% de créances supplémentaires en un seul trimestre. Je recommande à toutes les écoles.', initials: 'AD', color: '#16a34a', photo: 'https://i.pravatar.cc/100?img=47' },
  { name: 'Prof. Edem Kodjo', role: 'Enseignant de Mathématiques', school: 'Lycée Technique de Kara', text: 'Je saisie mes notes depuis mon téléphone entre deux cours. C\'est rapide, intuitif. La signature numérique des fiches est une fonctionnalité que j\'adore. Je ne reviendrai jamais à Excel.', initials: 'EK', color: '#7c3aed', photo: 'https://i.pravatar.cc/100?img=12' },
  { name: 'Sena Fiatowo', role: 'Parent d\'élève', school: 'Lomé, Togo', text: 'Recevoir le bulletin de ma fille sur WhatsApp le jour même, c\'est fantastique ! Je peux suivre sa progression en temps réel depuis mon téléphone. Merci NovaBulletin.', initials: 'SF', color: '#d97706', photo: 'https://i.pravatar.cc/100?img=44' },
  { name: 'M. Kwame Asante', role: 'Proviseur', school: 'Lycée International de Cotonou', text: 'La gestion des frais scolaires intégrée aux bulletins est exactement ce dont nous avions besoin. Tout est centralisé, l\'économe et l\'admin voient les mêmes informations en temps réel.', initials: 'KW', color: '#be185d', photo: 'https://i.pravatar.cc/100?img=52' },
];

const DATABASE_MODULES = [
  { icon: '📋', color: '#dbeafe', iconColor: '#1d4ed8', title: 'Présences quotidiennes', desc: 'Appel journalier par classe et matière. Suivi des absences, retards et exclusions par élève.' },
  { icon: '🚨', color: '#fee2e2', iconColor: '#dc2626', title: 'Dossiers disciplinaires', desc: 'Avertissements, suspensions, exclusions. Historique complet avec suivi des sanctions.' },
  { icon: '🏥', color: '#f0fdf4', iconColor: '#16a34a', title: 'Infirmerie & Santé', desc: 'Registre des visites, accidents, vaccinations et évacuations — avec compte rendu médical.' },
  { icon: '📖', color: '#fef9c3', iconColor: '#d97706', title: 'Bibliothèque', desc: 'Prêts de livres et matériels. Relances automatiques pour les retours en retard.' },
  { icon: '🏷️', color: '#ede9fe', iconColor: '#7c3aed', title: 'Inventaire scolaire', desc: 'Mobiliers, équipements, matériel informatique et sportif. État, valeur, emplacement.' },
  { icon: '🎓', color: '#ecfdf5', iconColor: '#059669', title: 'Examens nationaux', desc: 'Résultats CEPD, BEPC, BAC, BTS, CAP. Taux de réussite par session, série, année.' },
  { icon: '🏫', color: '#e0f2fe', iconColor: '#0369a1', title: 'Anciens élèves (Alumni)', desc: 'Base des diplômés avec filière choisie, employeur, contacts et numéro de diplôme.' },
  { icon: '🔄', color: '#fce7f3', iconColor: '#be185d', title: 'Transferts d\'élèves', desc: 'Entrées et sorties. Direction, motif, école d\'origine ou de destination, justificatif.' },
  { icon: '📅', color: '#fff7ed', iconColor: '#ea580c', title: 'Calendrier scolaire', desc: 'Vacances, examens, réunions, événements sportifs et culturels. Vue partagée.' },
  { icon: '📁', color: '#f1f5f9', iconColor: '#475569', title: 'Documents officiels', desc: 'Circulaires, contrats, rapports, emplois du temps. Archivage numérique sécurisé.' },
  { icon: '👤', color: '#f5f3ff', iconColor: '#6d28d9', title: 'Profils du personnel', desc: 'Dossiers RH complets : diplômes, contrat, expérience, contacts d\'urgence.' },
];

const TEAM = [
  { name: 'Felix Atoma', role: 'Lead Developer', tags: ['Software Developer', "Professeur d'Anglais"], initials: 'FA', color: '#1E2A78', colorEnd: '#3b82f6', photo: '/team/felix.jpg', email: 'felixatoma2@gmail.com' },
  { name: 'Manzaman Abalossosso', role: 'Project Manager', tags: ['Professeur de Science', 'Data Scientist'], initials: 'AA', color: '#7c3aed', colorEnd: '#a855f7', photo: '/team/manzaman.jpg', email: 'abalossossomanzaman@gmail.com' },
  { name: 'Benjamin Ngbabou', role: 'Software Developer', tags: ['Marketing', 'Professeur de Mathématiques'], initials: 'BN', color: '#16a34a', colorEnd: '#22c55e', photo: '/team/benjamin.jpg', email: 'bawiloussimngbabou1@gmail.com' },
];

const FAQS = [
  { q: 'Est-ce que je dois payer pour essayer ?', a: 'Non. Utilisez NovaBulletin pendant tout un trimestre complet. Si vous êtes satisfait à la fin du trimestre, vous payez. Sinon, vous revenez à votre ancien système. Aucun engagement, aucune carte bancaire requise dès le départ.' },
  { q: 'Comment fonctionnent les fiches numériques des enseignants ?', a: 'Chaque enseignant a accès à sa propre fiche de notes numérique depuis son téléphone. Il saisit les notes (interrogations, devoirs, compositions), les moyennes se calculent automatiquement, et il signe électroniquement la fiche. L\'administration voit tout en temps réel — aucune retranscription manuelle, aucune perte de fiche papier.' },
  { q: 'NovaBulletin remplace-t-il tous les registres papier ?', a: 'Oui. NovaBulletin centralise 11 registres : présences, santé, bibliothèque, inventaire, anciens élèves, transferts, dossiers disciplinaires, examens nationaux, calendrier, documents officiels et profils du personnel. Chaque donnée est sécurisée, consultable instantanément et exportable en CSV.' },
  { q: 'Combien de temps faut-il pour configurer l\'école ?', a: 'Environ 30 minutes pour une école de taille moyenne. Vous pouvez importer vos élèves depuis un fichier Excel ou CSV en quelques clics. Notre équipe vous accompagne à chaque étape via WhatsApp.' },
  { q: 'Les enseignants doivent-ils être formés ?', a: 'L\'interface est conçue pour être intuitive sur mobile. La plupart des enseignants maîtrisent la plateforme en moins de 10 minutes. Nous fournissons un guide de démarrage rapide et un support WhatsApp dédié.' },
  { q: 'Que se passe-t-il si un parent n\'utilise pas WhatsApp ?', a: 'NovaBulletin envoie aussi les bulletins par email. Si le parent n\'a ni WhatsApp ni email, l\'admin peut imprimer le bulletin PDF directement depuis la plateforme, comme avant.' },
  { q: 'Les données de nos élèves sont-elles sécurisées ?', a: 'Oui. Toutes les données sont chiffrées et hébergées sur Supabase (infrastructure cloud de niveau bancaire). Chaque école n\'a accès qu\'à ses propres données. Conformité RGPD assurée.' },
  { q: 'Fonctionne-t-il sur tous les appareils ?', a: 'Oui. NovaBulletin est une application web qui fonctionne sur ordinateur, tablette et smartphone (Android et iOS). Aucune installation requise — ouvrez simplement votre navigateur.' },
];

const COMPARISON = [
  { feature: 'Fiches de notes numériques (mobile)', excel: '❌ Papier + saisie double', autres: '⚠️ PC uniquement', nova: '✅ Mobile + signature élec.' },
  { feature: 'Calcul automatique des moyennes', excel: '❌ Formules manuelles', autres: '⚠️ Partiel', nova: '✅ 100% automatique' },
  { feature: 'Bulletins PDF avec logo école', excel: '❌ Mise en page manuelle', autres: '✅ Oui', nova: '✅ En 1 clic' },
  { feature: 'Envoi WhatsApp aux parents', excel: '❌ Non', autres: '❌ Non', nova: '✅ Automatique' },
  { feature: 'Gestion frais scolaires intégrée', excel: '❌ Fichier séparé', autres: '⚠️ Module payant', nova: '✅ Intégré + blocage auto' },
  { feature: 'Registre des présences numérique', excel: '❌ Cahier papier', autres: '⚠️ Optionnel', nova: '✅ Par classe & matière' },
  { feature: 'Santé, bibliothèque, inventaire', excel: '❌ Non', autres: '❌ Non', nova: '✅ 11 modules intégrés' },
  { feature: 'Anciens élèves & transferts', excel: '❌ Non', autres: '❌ Non', nova: '✅ Inclus' },
  { feature: 'Résultats examens nationaux', excel: '❌ Fichier séparé', autres: '❌ Non', nova: '✅ CEPD, BEPC, BAC, BTS' },
  { feature: 'LMS (cours, devoirs, quiz)', excel: '❌ Non', autres: '⚠️ Option payante', nova: '✅ Inclus' },
  { feature: 'Analytics tableau de bord', excel: '⚠️ Tableaux manuels', autres: '✅ Oui', nova: '✅ Temps réel' },
  { feature: 'Adapté Afrique francophone', excel: '❌ Non', autres: '❌ Non', nova: '✅ Conçu pour Togo+' },
  { feature: 'Prix', excel: '~0 (heures perdues)', autres: '50k–200k FCFA/mois', nova: '✅ Payez si satisfait' },
];

/* ── Flag SVGs ──────────────────────────────────────────────────────────── */
const FLAG_FR = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="lp-lang__flag" aria-hidden="true">
    <rect width="10" height="20" fill="#002395"/>
    <rect x="10" width="10" height="20" fill="#fff"/>
    <rect x="20" width="10" height="20" fill="#ED2939"/>
  </svg>
);
const FLAG_GB = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="lp-lang__flag" aria-hidden="true">
    <clipPath id="lp-gb-clip"><rect width="60" height="30"/></clipPath>
    <rect width="60" height="30" fill="#012169"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#lp-gb-clip)"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#lp-gb-clip)"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
  </svg>
);

/* ── EN data ─────────────────────────────────────────────────────────────── */
const FEATURES_ROW1_EN = [
  { icon: '🧮', color: '#dbeafe', iconColor: '#1d4ed8', title: 'Automatic Calculation', desc: 'Averages, coefficients, rankings calculated instantly. Zero Excel formulas, zero errors.' },
  { icon: '📄', color: '#dcfce7', iconColor: '#16a34a', title: 'PDF Reports in 1 click', desc: 'Professional report card with your school logo, colors and stamp. Ready to print or share.' },
  { icon: '📱', color: '#fce7f3', iconColor: '#be185d', title: 'WhatsApp & Email', desc: 'Parents notified instantly via WhatsApp. Automatic distribution as soon as published.' },
];
const FEATURES_ROW2_EN = [
  { icon: '📝', color: '#fff7ed', iconColor: '#ea580c', title: 'Digital Grade Sheets', desc: 'Every teacher has a digital grade sheet on their phone. Mobile entry, auto-calculation and electronic signature. Zero paper, zero loss.' },
  { icon: '💰', color: '#fef3c7', iconColor: '#d97706', title: 'School Fees', desc: 'Integrated fee management. Automatic blocking of report cards if fees are unpaid.' },
  { icon: '📊', color: '#ede9fe', iconColor: '#7c3aed', title: 'Real-time Analytics', desc: 'Collection rates, class progress, published vs pending reports — live.' },
];
const LMS_FEATURES_EN = [
  { icon: '📚', title: 'Courses & Documents', desc: 'Teachers upload their courses, PDFs and learning resources. Students access them from their portal, at any time.' },
  { icon: '📝', title: 'Homework & Exercises', desc: 'Assignment publication with deadlines. Real-time submission tracking. Automatic reminders for late students.' },
  { icon: '🎯', title: 'Interactive Quizzes', desc: 'Create quizzes with automatic correction. Results are available immediately after submission.' },
  { icon: '📅', title: 'Timetable', desc: 'Each class timetable accessible from the app. Updated in real time by the administration.' },
  { icon: '📢', title: 'Announcements & News', desc: 'Publish targeted announcements to parents, teachers or students. Each party receives only what concerns them.' },
  { icon: '🏆', title: 'Mock Exams', desc: 'Organize mock exams, enter grades and publish the complete school rankings.' },
];
const STEPS_EN = [
  { num: '01', icon: '🏫', title: 'Register your school', desc: '2-minute form. Validated within 24h. Account activated for free.', tags: ['School name','Type','Level','Contact'] },
  { num: '02', icon: '⚙️', title: 'Set up in 30 min', desc: 'Add classes, subjects, teachers, students. CSV import available.', tags: ['Classes','Subjects','Coefficients','CSV Import'] },
  { num: '03', icon: '✏️', title: 'Grade entry', desc: 'Teachers enter grades on their phone. Digital signature.', tags: ['Test','Exam','Comments','Signature'] },
  { num: '04', icon: '🚀', title: 'Publish & send', desc: 'Admin publishes. Every parent receives the report card on WhatsApp instantly.', tags: ['Auto PDF','WhatsApp','Email','Fee gate'] },
];
const ROLES_EN = [
  { icon: '🏫', title: 'Administrator', color: '#1E2A78', desc: 'Complete view of your institution.', features: ['Full analytics dashboard','Manage classes, subjects, teachers','PDF reports + publish in 1 click','School fee configuration','Attendance, health, library registers','Inventory, alumni, national exams','Official documents & staff profiles','CSV export of all data'] },
  { icon: '👨‍🏫', title: 'Teacher', color: '#0369a1', desc: 'Your digital grade sheet always in your pocket.', features: ['📝 Digital grade sheet on mobile','Real-time grade entry','Automatic average calculation','Comments per student','Electronic signature of the sheet','Upload courses and documents','Publish homework and quizzes','Mark mock exams'] },
  { icon: '💼', title: 'Bursar', color: '#d97706', desc: 'Manage fees without paperwork.', features: ['Record payments (TMoney, Flooz, cash)','Real-time unpaid view','Generate PDF receipts','Track by fee type and period','Exportable financial report','Collection statistics','Reports held automatically','Multi-school access'] },
  { icon: '👨‍👩‍👧', title: 'Parent', color: '#15803d', desc: 'Track your children\'s schooling.', features: ['Report cards on WhatsApp & Email','Parent portal 24/7','Term-by-term progress','Full report history','Pay fees online','View LMS courses and homework','School announcements','Instant notifications'] },
];
const DATABASE_MODULES_EN = [
  { icon: '📋', color: '#dbeafe', iconColor: '#1d4ed8', title: 'Daily Attendance', desc: 'Daily roll call by class and subject. Track absences, late arrivals and exclusions per student.' },
  { icon: '🚨', color: '#fee2e2', iconColor: '#dc2626', title: 'Disciplinary Records', desc: 'Warnings, suspensions, exclusions. Full history with sanction tracking.' },
  { icon: '🏥', color: '#f0fdf4', iconColor: '#16a34a', title: 'Health & Infirmary', desc: 'Register of visits, accidents, vaccinations and evacuations — with medical reports.' },
  { icon: '📖', color: '#fef9c3', iconColor: '#d97706', title: 'Library', desc: 'Book and equipment loans. Automatic reminders for late returns.' },
  { icon: '🏷️', color: '#ede9fe', iconColor: '#7c3aed', title: 'School Inventory', desc: 'Furniture, equipment, IT and sports material. Condition, value, location.' },
  { icon: '🎓', color: '#ecfdf5', iconColor: '#059669', title: 'National Exams', desc: 'CEPD, BEPC, BAC, BTS, CAP results. Pass rates by session, stream, year.' },
  { icon: '🏫', color: '#e0f2fe', iconColor: '#0369a1', title: 'Alumni', desc: 'Graduate database with chosen field, employer, contacts and diploma number.' },
  { icon: '🔄', color: '#fce7f3', iconColor: '#be185d', title: 'Student Transfers', desc: 'Arrivals and departures. Direction, reason, origin or destination school, document.' },
  { icon: '📅', color: '#fff7ed', iconColor: '#ea580c', title: 'School Calendar', desc: 'Holidays, exams, meetings, sports and cultural events. Shared view.' },
  { icon: '📁', color: '#f1f5f9', iconColor: '#475569', title: 'Official Documents', desc: 'Circulars, contracts, reports, timetables. Secure digital archiving.' },
  { icon: '👤', color: '#f5f3ff', iconColor: '#6d28d9', title: 'Staff Profiles', desc: 'Complete HR files: qualifications, contract, experience, emergency contacts.' },
];
const FAQS_EN = [
  { q: 'Do I have to pay to try it?', a: 'No. Use NovaBulletin for an entire term. If you are satisfied at the end of the term, you pay. If not, you go back to your old system. No commitment, no credit card required upfront.' },
  { q: 'How do the teachers\' digital grade sheets work?', a: 'Each teacher accesses their own digital grade sheet from their phone. They enter grades (tests, homework, exams), averages calculate automatically, and they electronically sign the sheet. The administration sees everything in real time — no manual re-entry, no lost paper sheets.' },
  { q: 'Does NovaBulletin replace all paper registers?', a: 'Yes. NovaBulletin centralizes 11 registers: attendance, health, library, inventory, alumni, transfers, disciplinary files, national exams, calendar, official documents and staff profiles. Every record is secured, instantly searchable and exportable to CSV.' },
  { q: 'How long does it take to set up the school?', a: 'About 30 minutes for a medium-sized school. You can import your students from an Excel or CSV file in a few clicks. Our team supports you at every step via WhatsApp.' },
  { q: 'Do teachers need training?', a: 'The interface is designed to be intuitive on mobile. Most teachers master the platform in under 10 minutes. We provide a quick-start guide and dedicated WhatsApp support.' },
  { q: 'What if a parent doesn\'t use WhatsApp?', a: 'NovaBulletin also sends report cards by email. If the parent has neither WhatsApp nor email, the admin can print the PDF report card directly from the platform, as before.' },
  { q: 'Is our students\' data secure?', a: 'Yes. All data is encrypted and hosted on Supabase (bank-level cloud infrastructure). Each school only has access to its own data. GDPR compliance ensured.' },
  { q: 'Does it work on all devices?', a: 'Yes. NovaBulletin is a web application that works on computers, tablets and smartphones (Android and iOS). No installation required — just open your browser.' },
];
const COMPARISON_EN = [
  { feature: 'Digital grade sheets (mobile)', excel: '❌ Paper + double entry', autres: '⚠️ PC only', nova: '✅ Mobile + e-signature' },
  { feature: 'Automatic average calculation', excel: '❌ Manual formulas', autres: '⚠️ Partial', nova: '✅ 100% automatic' },
  { feature: 'PDF reports with school logo', excel: '❌ Manual layout', autres: '✅ Yes', nova: '✅ In 1 click' },
  { feature: 'WhatsApp delivery to parents', excel: '❌ No', autres: '❌ No', nova: '✅ Automatic' },
  { feature: 'Integrated school fee management', excel: '❌ Separate file', autres: '⚠️ Paid module', nova: '✅ Built-in + auto block' },
  { feature: 'Digital attendance register', excel: '❌ Paper roll book', autres: '⚠️ Optional', nova: '✅ By class & subject' },
  { feature: 'Health, library, inventory', excel: '❌ No', autres: '❌ No', nova: '✅ 11 built-in modules' },
  { feature: 'Alumni & transfers', excel: '❌ No', autres: '❌ No', nova: '✅ Included' },
  { feature: 'National exam results', excel: '❌ Separate file', autres: '❌ No', nova: '✅ CEPD, BEPC, BAC, BTS' },
  { feature: 'LMS (courses, homework, quizzes)', excel: '❌ No', autres: '⚠️ Paid option', nova: '✅ Included' },
  { feature: 'Dashboard analytics', excel: '⚠️ Manual charts', autres: '✅ Yes', nova: '✅ Real-time' },
  { feature: 'Built for Francophone Africa', excel: '❌ No', autres: '❌ No', nova: '✅ Designed for Togo+' },
  { feature: 'Price', excel: '~0 (hours lost)', autres: '50k–200k FCFA/month', nova: '✅ Pay if satisfied' },
];

/* ── Hooks ──────────────────────────────────────────────────────────────── */
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(targetStr, duration = 1800) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    const num = parseInt(String(targetStr).replace(/[^\d]/g, ''));
    if (!num) return;
    let start = 0; const step = num / (duration / 16);
    const t = setInterval(() => { start += step; if (start >= num) { setCount(num); clearInterval(t); } else setCount(Math.floor(start)); }, 16);
    return () => clearInterval(t);
  }, [inView, targetStr, duration]);
  const display = String(targetStr).replace(/\d+/, count.toString());
  return { display, ref };
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function AnimStat({ value, label, sub }) {
  const { display, ref } = useCountUp(value);
  return (
    <div className="lp-anim-stat" ref={ref}>
      <strong>{display}</strong><span>{label}</span><small>{sub}</small>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${q.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={`lp-faq-item${open ? ' open' : ''}`}>
      <button
        className="lp-faq-q"
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span>{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
        </svg>
      </button>
      <div id={id} role="region" aria-label={q} hidden={!open}>
        {open && <p className="lp-faq-a">{a}</p>}
      </div>
    </div>
  );
}

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setActive(v => (v + 1) % TESTIMONIALS.length), []);
  const prev = useCallback(() => setActive(v => (v - 1 + TESTIMONIALS.length) % TESTIMONIALS.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  const t = TESTIMONIALS[active];
  return (
    <div className="lp-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="lp-carousel__track">
        <div className="lp-carousel__slide" key={active}>
          <div className="lp-carousel__stars">{'★'.repeat(5)}</div>
          <p className="lp-carousel__text">"{t.text}"</p>
          <div className="lp-carousel__author">
            <img src={t.photo} alt={t.name} className="lp-carousel__avatar lp-carousel__avatar--photo" onError={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${t.color},${t.color}99)`;e.currentTarget.alt=t.initials}}/>
            <div>
              <p className="lp-carousel__name">{t.name}</p>
              <p className="lp-carousel__role">{t.role} — {t.school}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-carousel__controls">
        <button type="button" className="lp-carousel__btn" onClick={prev} aria-label="Précédent">‹</button>
        <div className="lp-carousel__dots">
          {TESTIMONIALS.map((_, i) => (
            <button key={i} type="button" className={`lp-carousel__dot${i === active ? ' active' : ''}`} onClick={() => setActive(i)} aria-label={`Témoignage ${i+1}`} />
          ))}
        </div>
        <button type="button" className="lp-carousel__btn" onClick={next} aria-label="Suivant">›</button>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const isFr = !language || language.startsWith('fr');
  const t = (fr, en) => isFr ? fr : en;

  // Language-aware data
  const features1   = isFr ? FEATURES_ROW1        : FEATURES_ROW1_EN;
  const features2   = isFr ? FEATURES_ROW2        : FEATURES_ROW2_EN;
  const lmsFeats    = isFr ? LMS_FEATURES          : LMS_FEATURES_EN;
  const steps       = isFr ? STEPS                 : STEPS_EN;
  const roles       = isFr ? ROLES                 : ROLES_EN;
  const dbModules   = isFr ? DATABASE_MODULES      : DATABASE_MODULES_EN;
  const faqs        = isFr ? FAQS                  : FAQS_EN;
  const comparison  = isFr ? COMPARISON            : COMPARISON_EN;

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeRole, setActiveRole] = useState(0);
  const { ref: featRef, inView: featInView } = useInView();
  const { ref: lmsRef, inView: lmsInView } = useInView();

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      const d = document.documentElement;
      setScrollProgress(Math.min(100, Math.round((y / (d.scrollHeight - d.clientHeight)) * 100)));
    };
    window.addEventListener('scroll', fn, {passive: true});
    return () => window.removeEventListener('scroll', fn);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="lp">
      <div className="lp-progress" aria-hidden="true" style={{width:`${scrollProgress}%`}}/>
      {scrolled && (
        <button type="button" className="lp-back-to-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Retour en haut">↑</button>
      )}
      <Helmet>
        <html lang={isFr ? 'fr' : 'en'} />
        <title>{isFr ? "NovaBulletin — Logiciel de gestion scolaire pour les écoles d'Afrique" : "NovaBulletin — School Management Software for African Schools"}</title>
        <meta name="description" content={isFr ? "NovaBulletin remplace Excel pour la gestion des bulletins scolaires. Calcul automatique des moyennes, bulletins PDF en 1 clic, envoi WhatsApp aux parents. LMS intégré. Conçu pour les écoles du Togo et d'Afrique francophone." : "NovaBulletin replaces Excel for school report card management. Automatic average calculation, PDF reports in 1 click, WhatsApp delivery to parents. Integrated LMS. Built for Togo and Francophone Africa."} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content="NovaBulletin — Logiciel de gestion scolaire pour les écoles d'Afrique" />
        <meta property="og:description" content="Fini Excel. NovaBulletin calcule les moyennes, génère les bulletins PDF et les envoie aux parents sur WhatsApp. LMS inclus. 3 jours → 30 minutes." />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@NovaBulletin" />
        <meta name="twitter:creator" content="@FelixAtoma" />
        <meta name="twitter:image" content={OG_IMAGE} />
        {/* FAQ rich snippet — Google shows these directly in search results */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": FAQS.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a }
          }))
        })}</script>
        {/* SoftwareApplication schema — enables rich results (ratings, pricing) in Google */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": `${SITE_URL}/#software`,
          "name": "NovaBulletin",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web, Android, iOS",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "XOF",
            "description": "Premier trimestre gratuit — payez seulement si satisfait"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "5"
          },
          "url": SITE_URL,
          "image": OG_IMAGE,
          "description": "Logiciel de gestion scolaire pour les écoles d'Afrique francophone. Bulletins PDF, WhatsApp, LMS, gestion des frais.",
          "author": {
            "@type": "Organization",
            "name": "NovaBulletin",
            "@id": `${SITE_URL}/#organization`
          }
        })}</script>
        {/* Organization schema */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          "name": "NovaBulletin",
          "url": SITE_URL,
          "logo": OG_IMAGE,
          "email": "felixatoma2@gmail.com",
          "foundingLocation": { "@type": "Place", "name": "Lomé, Togo" },
          "areaServed": ["TG","BJ","CI","SN","GH","CM"],
          "sameAs": [
            "https://facebook.com/novabulletin",
            "https://tiktok.com/@novabulletin",
            "https://linkedin.com/company/novabulletin",
            "https://x.com/novabulletin"
          ]
        })}</script>
        {/* Team schema — helps Google associate founders' names with NovaBulletin */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "NovaBulletin — Logiciel de gestion scolaire",
          "url": SITE_URL,
          "about": { "@id": `${SITE_URL}/#software` },
          "mentions": [
            { "@id": `${SITE_URL}/#person-felix` },
            { "@id": `${SITE_URL}/#person-manzaman` },
            { "@id": `${SITE_URL}/#person-benjamin` }
          ]
        })}</script>
      </Helmet>

      {/* ─── NAVBAR ──────────────────────────────────────────────────── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        {/* Row 1: brand + language + CTAs */}
        <div className="lp-nav__top">
          <Link to="/" className="lp-nav__brand">
            <img src={logoIcon} alt="NovaBulletin" width="32" height="32" />
            <span>NovaBulletin</span>
          </Link>

          <div className="lp-lang">
            <button
              className={`lp-lang__btn${isFr ? ' lp-lang__btn--active' : ''}`}
              onClick={() => setLanguage('fr')}
              aria-label="Français"
              title="Français"
            >
              {FLAG_FR}<span>FR</span>
            </button>
            <button
              className={`lp-lang__btn${!isFr ? ' lp-lang__btn--active' : ''}`}
              onClick={() => setLanguage('en')}
              aria-label="English"
              title="English"
            >
              {FLAG_GB}<span>EN</span>
            </button>
          </div>

          <div className="lp-nav__ctas">
            <Link to="/login" className="lp-btn lp-btn--ghost">{t('Se connecter','Log in')}</Link>
            <Link to="/register-school" className="lp-btn lp-btn--primary">{t('Commencer gratuitement →','Start for free →')}</Link>
          </div>

          <button className="lp-nav__hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        {/* Row 2: navigation links (+ mobile CTAs when open) */}
        <div className={`lp-nav__bottom${menuOpen ? ' mobile-open' : ''}`}>
          <ul className={`lp-nav__links${menuOpen ? ' lp-nav__links--open' : ''}`}>
            {[
              ['#features', t('Fonctionnalités','Features')],
              ['#lms','LMS'],
              ['#database', t('Base de données','Database')],
              ['#how', t('Démarrage','Get Started')],
              ['#roles', t('Pour qui','Who it\'s for')],
              ['#comparison', t('Comparaison','Comparison')],
              ['#team', t('Équipe','Team')],
              ['#faq','FAQ'],
            ].map(([h,l]) => (
              <li key={h}><a href={h} onClick={() => setMenuOpen(false)}>{l}</a></li>
            ))}
          </ul>
          {menuOpen && (
            <div className="lp-nav__mobile-ctas">
              <Link to="/login" className="lp-btn lp-btn--ghost" onClick={() => setMenuOpen(false)} style={{color:'#1E2A78',borderColor:'#1E2A78'}}>{t('Se connecter','Log in')}</Link>
              <Link to="/register-school" className="lp-btn lp-btn--primary" onClick={() => setMenuOpen(false)}>{t('Commencer gratuitement →','Start for free →')}</Link>
            </div>
          )}
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true">
          <div className="lp-blob lp-blob--1" /><div className="lp-blob lp-blob--2" /><div className="lp-blob lp-blob--3" />
          <div className="lp-grid-overlay" />
        </div>
        <div className="lp-container lp-hero__inner">
          <div className="lp-hero__left">
            <div className="lp-hero__pill"><span className="lp-pill-dot" />{t('🌍 Conçu pour les écoles d\'Afrique francophone','🌍 Built for Francophone African schools')}</div>
            <h1>{t('Fini Excel.','No more Excel.')}<br/><span className="lp-grad-text">{t('Le bulletin scolaire entre dans le 21e siècle.','Report cards enter the 21st century.')}</span></h1>
            <p className="lp-hero__desc">
              {t(
                <>{`NovaBulletin calcule les moyennes `}<strong>automatiquement</strong>{`, génère les bulletins PDF en `}<strong>1 clic</strong>{` et les envoie aux parents sur `}<strong>WhatsApp</strong>{`. LMS intégré pour les cours, devoirs et quiz.`}<br/><br/>{`Et bien plus : présences, santé, bibliothèque, inventaire, examens nationaux, anciens élèves — `}<strong style={{color:'#FFB547'}}>NovaBulletin est la base de données complète de votre école.</strong></>,
                <>{`NovaBulletin calculates averages `}<strong>automatically</strong>{`, generates PDF reports in `}<strong>1 click</strong>{` and sends them to parents on `}<strong>WhatsApp</strong>{`. Integrated LMS for courses, homework and quizzes.`}<br/><br/>{`And much more: attendance, health, library, inventory, national exams, alumni — `}<strong style={{color:'#FFB547'}}>NovaBulletin is your school's complete database.</strong></>
              )}
            </p>
            <div className="lp-hero__btns">
              <Link to="/register-school" className="lp-btn lp-btn--cta">{t('Essayer gratuitement ce trimestre →','Try free this term →')}</Link>
              <a href="#how" className="lp-btn lp-btn--ghost-white">{t('▶ Comment ça marche','▶ How it works')}</a>
            </div>
            <div className="lp-hero__badges">
              <span>{t('✅ 0 engagement','✅ No commitment')}</span><span>{t('🤝 Payez si satisfait','🤝 Pay if satisfied')}</span><span>📱 Mobile first</span><span>{t('📝 Fiches 100% numériques','📝 100% digital grade sheets')}</span>
            </div>
            <div className="lp-store-badges">
              <div className="lp-store-badge">
                <span className="lp-store-badge__soon">{t('Bientôt','Soon')}</span>
                <svg className="lp-store-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 20.5v-17A1.5 1.5 0 0 1 5.14 2.08l13.5 8a1.5 1.5 0 0 1 0 2.84l-13.5 8A1.5 1.5 0 0 1 3 19.5z"/>
                </svg>
                <div>
                  <span className="lp-store-badge__sub">{t('Disponible sur','Available on')}</span>
                  <span className="lp-store-badge__name">Google Play</span>
                </div>
              </div>
              <div className="lp-store-badge">
                <span className="lp-store-badge__soon">{t('Bientôt','Soon')}</span>
                <svg className="lp-store-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <span className="lp-store-badge__sub">{t('Télécharger sur','Download on')}</span>
                  <span className="lp-store-badge__name">App Store</span>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-hero__right">
            <div className="lp-hero__illus-wrap">
              <IllustrationDashboard />
              <div className="lp-float-card lp-float-card--1">
                <span>📱</span>
                <div><strong>WhatsApp envoyé !</strong><p>245 parents notifiés</p></div>
              </div>
              <div className="lp-float-card lp-float-card--2">
                <span>✅</span>
                <div><strong>Bulletins publiés</strong><p>Trimestre 2 — 12 classes</p></div>
              </div>
              <div className="lp-float-card lp-float-card--3">
                <span>💰</span>
                <div><strong>Recouvrement 87%</strong><p>+12% vs trimestre 1</p></div>
              </div>
            </div>
          </div>
        </div>
        <a href="#stats" className="lp-scroll-hint" aria-label="Défiler vers le bas">
          <div className="lp-scroll-dot" />
        </a>
      </section>

      {/* ─── STATS ───────────────────────────────────────────────────── */}
      <section className="lp-stats" id="stats">
        <div className="lp-container lp-stats__grid">
          <AnimStat value="3 jours" label={t('de travail manuel éliminés','of manual work eliminated')} sub={t('chaque trimestre','each term')} />
          <AnimStat value="30 min" label={t('pour préparer un trimestre','to prepare a term')} sub={t('contre 3-5 jours avant','vs 3–5 days before')} />
          <AnimStat value="11" label={t('modules base de données','database modules')} sub={t('présences, santé, alumni, inventaire…','attendance, health, alumni, inventory…')} />
          <AnimStat value="100%" label={t('des parents informés','of parents informed')} sub={t('le jour même de la publication','on the day of publication')} />
        </div>
      </section>

      {/* ─── PROBLEM ─────────────────────────────────────────────────── */}
      <section className="lp-problem">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('😩 Le Problème','😩 The Problem')}</span>
            <h2>{t('Vous en avez assez d\'Excel ?','Tired of Excel?')}</h2>
            <p>{t('Des milliers d\'écoles en Afrique passent encore des nuits entières sur des fichiers Excel à chaque fin de trimestre.','Thousands of schools in Africa still spend entire nights on Excel spreadsheets every end of term.')}</p>
          </div>
          <div className="lp-problem__layout">
            <div className="lp-pain-grid">
              {(isFr ? [
                ['😰','Saisie manuelle pendant 3 à 5 jours','Nuits et week-ends sacrifiés pour préparer les bulletins'],
                ['💥','Erreurs dans les formules','Une formule cassée passe inaperçue jusqu\'à l\'impression'],
                ['📝','Fiches papier perdues ou illisibles','Les fiches de notes des profs égarées, retranscrites à la main, sources d\'erreurs'],
                ['📭','Parents jamais informés à temps','Bulletins papier perdus, distribution tardive'],
                ['💸','Frais non reliés aux bulletins','Impossible de bloquer automatiquement les mauvais payeurs'],
                ['🗂️','Fichiers perdus ou corrompus','Excel local sans sauvegarde — catastrophe en cas de panne'],
                ['📵','Aucun portail pour les parents','Pas de visibilité sur la scolarité de leur enfant'],
                ['🗃️','Registres papier éparpillés','Présences, santé, prêts de livres, inventaire — introuvables en cas de besoin'],
              ] : [
                ['😰','Manual entry for 3 to 5 days','Nights and weekends sacrificed to prepare report cards'],
                ['💥','Formula errors','A broken formula goes unnoticed until printing'],
                ['📝','Lost or illegible grade sheets','Teacher sheets misplaced, recopied by hand, sources of errors'],
                ['📭','Parents never informed on time','Paper reports lost, distribution delayed'],
                ['💸','Fees not linked to reports','Impossible to automatically block non-payers'],
                ['🗂️','Lost or corrupted files','Local Excel with no backup — disaster on hardware failure'],
                ['📵','No portal for parents','No visibility on their child\'s schooling'],
                ['🗃️','Scattered paper registers','Attendance, health, book loans, inventory — impossible to find when needed'],
              ]).map(([icon, title, desc]) => (
                <div className="lp-pain-item" key={title}>
                  <div className="lp-pain-item__icon">{icon}</div>
                  <div><strong>{title}</strong><p>{desc}</p></div>
                </div>
              ))}
            </div>
            <div className="lp-problem__vs">
              <div className="lp-vs-bad">
                <h4>{t('😩 Avec Excel','😩 With Excel')}</h4>
                {(isFr
                  ? ['3–5 jours par trimestre','Fiches papier perdues/illisibles','Erreurs silencieuses','Bulletins papier','Frais séparés','Fichiers locaux perdus','0 info pour les parents','Registres papier éparpillés']
                  : ['3–5 days per term','Lost/illegible paper sheets','Silent errors','Paper reports','Separate fee files','Lost local files','0 info for parents','Scattered paper registers']
                ).map(row => <div key={row} className="lp-vs-row lp-vs-row--bad">❌ {row}</div>)}
              </div>
              <div className="lp-vs-divider"><span>VS</span></div>
              <div className="lp-vs-good">
                <h4>{t('✨ Avec NovaBulletin','✨ With NovaBulletin')}</h4>
                {(isFr
                  ? ['30 minutes automatiques','Fiches numériques sur mobile','0 erreur de calcul','PDF + WhatsApp auto','Frais intégrés + blocage','Cloud sécurisé 24/7','Parents informés instantanément','Base de données : 11 modules']
                  : ['30 automated minutes','Digital sheets on mobile','0 calculation errors','PDF + auto WhatsApp','Integrated fees + block','Secure cloud 24/7','Parents instantly notified','Database: 11 modules']
                ).map(row => <div key={row} className="lp-vs-row lp-vs-row--good">✅ {row}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section className="lp-features" id="features" ref={featRef}>
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('⚡ Fonctionnalités','⚡ Features')}</span>
            <h2>{t('Tout ce dont votre école a besoin','Everything your school needs')}</h2>
            <p>{t('Une plateforme complète qui remplace Excel, les imprimantes et les appels aux parents.','A complete platform that replaces Excel, printers and parent phone calls.')}</p>
          </div>
          <div className={`lp-feat-grid${featInView ? ' animated' : ''}`}>
            {[...features1, ...features2].map((f, i) => (
              <div className="lp-feat-card" key={f.title} style={{'--delay': `${i * 80}ms`, '--accent': f.iconColor, '--accent-bg': f.color}}>
                <div className="lp-feat-icon" style={{background: f.color, color: f.iconColor}}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FICHE CALLOUT ───────────────────────────────────────────── */}
      <section className="lp-fiche">
        <div className="lp-container lp-fiche__inner">
          <div className="lp-fiche__badge">📝</div>
          <div className="lp-fiche__body">
            <h3>{t('Chaque enseignant a sa fiche numérique — sur son téléphone','Every teacher has their digital grade sheet — on their phone')}</h3>
            <p>
              {t(
                <>{`Fini les fiches papier perdues, illisibles ou retranscrites à la main. Sur NovaBulletin, `}<strong>chaque professeur saisit ses notes directement depuis son mobile</strong>{`, les moyennes se calculent seules et il signe électroniquement sa fiche. L'administration voit tout en temps réel.`}</>,
                <>{`No more lost, illegible or manually recopied paper grade sheets. On NovaBulletin, `}<strong>each teacher enters grades directly from their phone</strong>{`, averages calculate themselves and they sign the sheet electronically. The administration sees everything in real time.`}</>
              )}
            </p>
            <div className="lp-fiche__points">
              {(isFr ? [
                ['✏️','Saisie des notes sur mobile, n\'importe où'],
                ['🔢','Calcul automatique des moyennes & coefficients'],
                ['✍️','Signature numérique de la fiche de notes'],
                ['📡','Synchronisation instantanée avec le tableau de bord admin'],
                ['🔒','Chaque prof voit uniquement ses classes et matières'],
              ] : [
                ['✏️','Grade entry on mobile, anywhere'],
                ['🔢','Automatic average & coefficient calculation'],
                ['✍️','Digital signature of the grade sheet'],
                ['📡','Instant sync with the admin dashboard'],
                ['🔒','Each teacher sees only their own classes and subjects'],
              ]).map(([icon, text]) => (
                <span key={text} className="lp-fiche__point"><span>{icon}</span>{text}</span>
              ))}
            </div>
          </div>
          <div className="lp-fiche__visual">
            <IllustrationMobileApp />
          </div>
        </div>
      </section>

      {/* ─── LMS ─────────────────────────────────────────────────────── */}
      <section className="lp-lms" id="lms" ref={lmsRef}>
        <div className="lp-lms__bg" aria-hidden="true"><div className="lp-blob lp-blob--lms1"/><div className="lp-blob lp-blob--lms2"/></div>
        <div className="lp-container lp-lms__inner">
          <div className={`lp-lms__text${lmsInView ? ' animated' : ''}`}>
            <span className="lp-tag lp-tag--light">{t('🎓 Module LMS','🎓 LMS Module')}</span>
            <h2>{t('NovaBulletin, c\'est aussi une plateforme d\'apprentissage complète','NovaBulletin is also a complete learning platform')}</h2>
            <p>{t(
              <>{`Au-delà des bulletins, NovaBulletin embarque un `}<strong>LMS (Learning Management System)</strong>{` complet. Cours en ligne, devoirs, quiz, emplois du temps — tout en un seul outil.`}</>,
              <>{`Beyond report cards, NovaBulletin includes a full `}<strong>LMS (Learning Management System)</strong>{`. Online courses, homework, quizzes, timetables — all in one tool.`}</>
            )}</p>
            <div className="lp-lms__features">
              {lmsFeats.map(f => (
                <div className="lp-lms__feat" key={f.title}>
                  <span className="lp-lms__feat-icon">{f.icon}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/register-school" className="lp-btn lp-btn--cta" style={{marginTop:'2rem',display:'inline-flex'}}>
              {t('Découvrir le LMS gratuitement →','Explore the LMS for free →')}
            </Link>
          </div>
          <div className="lp-lms__visual">
            <IllustrationLMS />
            <div className="lp-lms__teacher">
              <IllustrationTeacher />
            </div>
          </div>
        </div>
      </section>

      {/* ─── DATABASE ────────────────────────────────────────────────── */}
      <section className="lp-database" id="database">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('🗄️ Base de Données Scolaire','🗄️ School Database')}</span>
            <h2>{t('NovaBulletin, c\'est aussi ','NovaBulletin is also ')}<span className="lp-grad-text">{t('la mémoire de votre école','your school\'s memory')}</span></h2>
            <p>{t('Centralisez tous les registres de votre établissement. Fini les cahiers perdus, les classeurs éparpillés et les données inaccessibles.','Centralize all your school\'s registers. No more lost notebooks, scattered binders or inaccessible data.')}</p>
          </div>
          <div className="lp-db-banner">
            <div className="lp-db-banner__icon">🗄️</div>
            <div className="lp-db-banner__text">
              <strong>{t('Pour les écoles qui n\'ont pas de base de données','For schools without a database')}</strong>
              <p>{t('Présences · Santé · Bibliothèque · Inventaire · Examens nationaux · Alumni · Transferts · Dossiers disciplinaires · Calendrier · Documents · Personnel','Attendance · Health · Library · Inventory · National Exams · Alumni · Transfers · Disciplinary · Calendar · Documents · Staff')}</p>
            </div>
            <div className="lp-db-banner__stat">
              <strong>11</strong>
              <span>{t('modules de gestion des données','data management modules')}</span>
            </div>
          </div>
          <div className="lp-db-grid">
            {dbModules.map((m, i) => (
              <div className="lp-db-card" key={m.title} style={{'--delay': `${i * 55}ms`}}>
                <div className="lp-db-card__icon" style={{background: m.color, color: m.iconColor}}>{m.icon}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-db-cta">
            <p>{t(<>{'Toutes ces données sont '}<strong>exportables en CSV</strong>{', consultables instantanément et isolées par école — chaque établissement voit uniquement ses propres données.'}</>,<>{'All this data is '}<strong>exportable to CSV</strong>{', instantly searchable and isolated per school — each institution sees only its own data.'}</>)}</p>
            <Link to="/register-school" className="lp-btn lp-btn--primary">{t('Centraliser les données de mon école →','Centralize my school data →')}</Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="lp-how" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('🚀 Démarrage','🚀 Get Started')}</span>
            <h2>{t('Opérationnel en moins d\'une journée','Up and running in less than a day')}</h2>
            <p>{t('Pas d\'installation, pas de serveur, pas de formation longue. 4 étapes simples.','No installation, no server, no lengthy training. 4 simple steps.')}</p>
          </div>
          <div className="lp-how__steps">
            {steps.map((s, i) => (
              <div className="lp-how__step" key={s.num}>
                <div className="lp-how__step-num"><span>{s.num}</span></div>
                {i < STEPS.length - 1 && <div className="lp-how__connector" />}
                <div className="lp-how__icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="lp-how__tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VIDEO DEMO ──────────────────────────────────────────────── */}
      <section className="lp-video" id="demo">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('▶ Démo','▶ Demo')}</span>
            <h2>{t('Voir NovaBulletin en action','See NovaBulletin in action')}</h2>
            <p>{t('De la saisie des notes à l\'envoi sur WhatsApp — tout en moins de 2 minutes.','From grade entry to WhatsApp delivery — all in under 2 minutes.')}</p>
          </div>
          <div className="lp-video__player">
            <div className="lp-video__frame">
              {/* Replace the src with your YouTube video ID when ready */}
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title={t('Démo NovaBulletin — logiciel de gestion scolaire','NovaBulletin Demo — school management software')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="lp-video__steps">
              {(isFr ? [
                ['01','📝','Saisie des notes','Le prof entre ses notes sur mobile. Calcul automatique.'],
                ['02','✅','Validation admin','L\'admin vérifie et publie en 1 clic.'],
                ['03','📱','Envoi WhatsApp','245 parents reçoivent le bulletin instantanément.'],
              ] : [
                ['01','📝','Grade entry','Teacher enters grades on mobile. Auto-calculation.'],
                ['02','✅','Admin approval','Admin reviews and publishes in 1 click.'],
                ['03','📱','WhatsApp delivery','245 parents receive the report instantly.'],
              ]).map(([num, icon, title, desc]) => (
                <div className="lp-video__step" key={num}>
                  <div className="lp-video__step-num">{num}</div>
                  <div className="lp-video__step-icon">{icon}</div>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHATSAPP SHOWCASE ───────────────────────────────────────── */}
      <section className="lp-whatsapp">
        <div className="lp-container lp-whatsapp__inner">
          <div className="lp-whatsapp__text">
            <span className="lp-tag">📱 WhatsApp</span>
            <h2>{t('Les parents reçoivent les bulletins sur ','Parents receive report cards on ')}<span className="lp-grad-text">WhatsApp</span></h2>
            <p>{t(
              <>{`Dès que vous publiez les bulletins, chaque parent reçoit `}<strong>instantanément</strong>{` le bulletin de son enfant sur WhatsApp. Plus besoin d'imprimer, de distribuer ou d'appeler l'école.`}</>,
              <>{`As soon as you publish reports, every parent `}<strong>instantly</strong>{` receives their child's report card on WhatsApp. No more printing, distributing or calling the school.`}</>
            )}</p>
            <div className="lp-whatsapp__points">
              {(isFr ? [
                ['📤','Envoi automatique dès la publication'],
                ['📎','Lien vers le PDF du bulletin'],
                ['💬','Message personnalisé avec les infos clés'],
                ['🔒','Bloqué automatiquement si frais impayés'],
                ['✉️','Email de secours si pas de WhatsApp'],
              ] : [
                ['📤','Automatic delivery on publication'],
                ['📎','Link to the PDF report card'],
                ['💬','Personalised message with key info'],
                ['🔒','Automatically blocked if fees unpaid'],
                ['✉️','Email fallback if no WhatsApp'],
              ]).map(([icon, text]) => (
                <div className="lp-wa-point" key={text}>
                  <span>{icon}</span><p>{text}</p>
                </div>
              ))}
            </div>
            <Link to="/register-school" className="lp-btn lp-btn--cta" style={{marginTop:'1.5rem',display:'inline-flex'}}>
              {t('Essayer gratuitement →','Try for free →')}
            </Link>
          </div>
          <div className="lp-whatsapp__phone">
            <IllustrationWhatsapp />
            <div className="lp-wa-badge">
              <div className="lp-wa-badge__dot" />
              <span>{t('100% des parents informés','100% of parents informed')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─────────────────────────────────────────────────── */}
      <section className="lp-gallery">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('📸 En action','📸 In Action')}</span>
            <h2>{t('NovaBulletin dans les établissements','NovaBulletin in schools')}</h2>
            <p>{t('Des écoles du Togo, du Bénin et de Côte d\'Ivoire font confiance à NovaBulletin chaque trimestre.','Schools in Togo, Benin and Côte d\'Ivoire trust NovaBulletin every term.')}</p>
          </div>
          <div className="lp-gallery__grid">
            <div className="lp-gallery__item lp-gallery__item--tall lp-gallery__item--svg">
              <div className="lp-gallery__svg-wrap"><IllustrationDashboard /></div>
              <div className="lp-gallery__overlay">
                <div className="lp-gallery__badge">{t('🖥️ Tableau de bord','🖥️ Dashboard')}</div>
                <p className="lp-gallery__label">{t('Vue complète de l\'établissement en temps réel','Complete school overview in real time')}</p>
              </div>
            </div>
            <div className="lp-gallery__col">
              <div className="lp-gallery__item lp-gallery__item--svg">
                <div className="lp-gallery__svg-wrap"><IllustrationMobileApp /></div>
                <div className="lp-gallery__overlay">
                  <div className="lp-gallery__badge">{t('📝 Fiche numérique','📝 Digital sheet')}</div>
                  <p className="lp-gallery__label">{t('Saisie et signature sur mobile','Entry and signature on mobile')}</p>
                </div>
              </div>
              <div className="lp-gallery__item lp-gallery__item--svg">
                <div className="lp-gallery__svg-wrap"><IllustrationWhatsapp /></div>
                <div className="lp-gallery__overlay">
                  <div className="lp-gallery__badge">📱 WhatsApp</div>
                  <p className="lp-gallery__label">{t('Bulletin reçu le jour même','Report received on the same day')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-gallery__strip">
            {(isFr ? [
              {icon:'⚙️',label:'Administration simplifiée'},
              {icon:'📄',label:'Bulletins PDF professionnels'},
              {icon:'✅',label:'Suivi des présences'},
              {icon:'💰',label:'Gestion des frais'},
              {icon:'🗄️',label:'Base de données scolaire'},
            ] : [
              {icon:'⚙️',label:'Simplified administration'},
              {icon:'📄',label:'Professional PDF reports'},
              {icon:'✅',label:'Attendance tracking'},
              {icon:'💰',label:'Fee management'},
              {icon:'🗄️',label:'School database'},
            ]).map(({icon,label}) => (
              <div className="lp-gallery__strip-item lp-gallery__strip-item--icon" key={label}>
                <span className="lp-gallery__strip-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLES ───────────────────────────────────────────────────── */}
      <section className="lp-roles" id="roles">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('👥 Pour qui ?','👥 Who is it for?')}</span>
            <h2>{t('Un espace dédié pour chaque acteur','A dedicated space for every user')}</h2>
            <p>{t('Chaque utilisateur accède uniquement à ce dont il a besoin.','Each user accesses only what they need.')}</p>
          </div>
          <div className="lp-roles__tabs">
            {roles.map((r, i) => (
              <button key={r.title} type="button"
                className={`lp-role-tab${activeRole === i ? ' active' : ''}`}
                style={activeRole === i ? {'--rc': r.color} : {}}
                onClick={() => setActiveRole(i)}>
                {r.icon} {r.title}
              </button>
            ))}
          </div>
          {roles.map((r, i) => activeRole === i && (
            <div className="lp-role-panel" key={r.title} style={{'--rc': r.color}}>
              <div className="lp-role-panel__info">
                <div className="lp-role-panel__icon">{r.icon}</div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <Link to="/register-school" className="lp-btn lp-btn--primary" style={{marginTop:'1.25rem',display:'inline-flex'}}>
                  {t('Commencer gratuitement →','Start for free →')}
                </Link>
              </div>
              <ul className="lp-role-panel__list">
                {r.features.map(f => (
                  <li key={f}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ──────────────────────────────────────────────── */}
      <section className="lp-comparison" id="comparison">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('📊 Comparaison','📊 Comparison')}</span>
            <h2>{t('Pourquoi choisir NovaBulletin ?','Why choose NovaBulletin?')}</h2>
            <p>{t('Comparez par vous-même — aucun autre logiciel ne fait tout ce que NovaBulletin fait pour les écoles africaines.','Compare for yourself — no other software does everything NovaBulletin does for African schools.')}</p>
          </div>
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>{t('Fonctionnalité','Feature')}</th>
                  <th>{t('Excel / Manuel','Excel / Manual')}</th>
                  <th>{t('Autres logiciels','Other Software')}</th>
                  <th className="lp-table__nova-head"><img src={logoIcon} alt="" width="16" height="16"/> NovaBulletin</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(row => (
                  <tr key={row.feature}>
                    <td className="lp-table__feat">{row.feature}</td>
                    <td className="lp-table__bad">{row.excel}</td>
                    <td className="lp-table__other">{row.autres}</td>
                    <td className="lp-table__nova">{row.nova}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────── */}
      <section className="lp-testimonials">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag lp-tag--dark">{t('⭐ Témoignages','⭐ Testimonials')}</span>
            <h2 style={{color:'#fff'}}>{t('Ce que disent les écoles qui utilisent NovaBulletin','What schools using NovaBulletin say')}</h2>
            <p style={{color:'#a5b4fc'}}>{t('De vraies histoires, de vraies écoles, de vrais résultats.','Real stories, real schools, real results.')}</p>
          </div>
          <TestimonialCarousel />
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('💎 Tarif','💎 Pricing')}</span>
            <h2>{t('Simple, transparent, sans risque','Simple, transparent, risk-free')}</h2>
            <p>{t('Un seul modèle : essayez un trimestre entier. Payez seulement si vous êtes satisfait.','One model: try a full term. Pay only if you are satisfied.')}</p>
          </div>
          <div className="lp-price-card">
            <div className="lp-price-card__badge">{t('🤝 Notre engagement unique','🤝 Our unique commitment')}</div>
            <h3>{t('Essai complet — 1 trimestre entier','Full trial — 1 complete term')}</h3>
            <div className="lp-price-amount">
              <strong>{t('Gratuit','Free')}</strong><span>{t('pendant tout votre premier trimestre','for your entire first term')}</span>
            </div>
            <p className="lp-price-promise">
              {t(
                <>{`Utilisez `}<strong>toutes</strong>{` les fonctionnalités pendant un trimestre complet. Si vous êtes satisfait à la fin, vous payez. Sinon, vous revenez à Excel.`}<strong> Aucun frais. Aucune carte bancaire requise.</strong></>,
                <>{`Use `}<strong>all</strong>{` features for a full term. If you are satisfied at the end, you pay. If not, you go back to Excel.`}<strong> No charge. No credit card required.</strong></>
              )}
            </p>
            <div className="lp-price-includes">
              {(isFr ? ['✅ Accès complet à toutes les fonctionnalités','✅ Élèves et classes illimités','✅ Bulletins PDF avec logo de votre école','✅ Envoi WhatsApp & Email automatique','✅ Gestion complète des frais scolaires','✅ LMS complet (cours, devoirs, quiz)','✅ Base de données : 11 modules de registres','✅ Export CSV de toutes vos données','✅ Support WhatsApp prioritaire inclus','✅ Formation et guide de démarrage offerts']
              : ['✅ Full access to all features','✅ Unlimited students and classes','✅ PDF reports with your school logo','✅ Automatic WhatsApp & Email delivery','✅ Complete school fee management','✅ Full LMS (courses, homework, quizzes)','✅ Database: 11 register modules','✅ CSV export of all your data','✅ Priority WhatsApp support included','✅ Onboarding training and guide included']
              ).map(item => (
                <div key={item} className="lp-price-include">{item}</div>
              ))}
            </div>
            <Link to="/register-school" className="lp-btn lp-btn--cta lp-btn--wide" style={{marginTop:'2rem',fontSize:'1.05rem',padding:'1.1rem'}}>
              {t('Commencer maintenant — C\'est gratuit →','Start now — It\'s free →')}
            </Link>
            <div className="lp-price-range">
              <p>{t('💡 Après le trimestre gratuit, le tarif est calculé selon l\'effectif :','💡 After the free term, pricing is based on enrolment:')}</p>
              <div className="lp-price-range__grid">
                <div><strong>{t('Petite école','Small school')}</strong><span>{t('< 200 élèves','< 200 students')}</span><span className="lp-price-range__amount">~15 000 FCFA/trim.</span></div>
                <div><strong>{t('École moyenne','Medium school')}</strong><span>{t('200–500 élèves','200–500 students')}</span><span className="lp-price-range__amount">~30 000 FCFA/trim.</span></div>
                <div><strong>{t('Grande école','Large school')}</strong><span>{t('500+ élèves','500+ students')}</span><span className="lp-price-range__amount">~50 000 FCFA/trim.</span></div>
              </div>
            </div>
            <p className="lp-price-note">{t('Paiement en FCFA · TMoney · Flooz · Virement bancaire','Payment in FCFA · TMoney · Flooz · Bank transfer')}</p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────── */}
      <section className="lp-faq" id="faq">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('❓ FAQ','❓ FAQ')}</span>
            <h2>{t('Questions fréquentes','Frequently Asked Questions')}</h2>
            <p>{t('Tout ce que vous voulez savoir avant de vous lancer.','Everything you want to know before getting started.')}</p>
          </div>
          <div className="lp-faq__list">
            {faqs.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
          <div className="lp-faq__footer">
            <p>{t('Vous avez une autre question ?','Have another question?')}</p>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=felixatoma2@gmail.com&su=NovaBulletin%20-%20Question"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn--primary"
            >
              📧 {t('Nous écrire','Contact us')}
            </a>
          </div>
        </div>
      </section>

      {/* ─── TEAM ────────────────────────────────────────────────────── */}
      <section className="lp-team" id="team">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-tag">{t('👥 L\'Équipe','👥 The Team')}</span>
            <h2>{t('Les personnes derrière NovaBulletin','The people behind NovaBulletin')}</h2>
            <p>{t('Une équipe passionnée, ancrée en Afrique, qui construit les outils que nos écoles méritent.','A passionate team, rooted in Africa, building the tools our schools deserve.')}</p>
          </div>
          <div className="lp-team__grid">
            {TEAM.map(m => (
              <div className="lp-team-card" key={m.name}>
                {m.photo
                  ? <img src={m.photo} alt={m.name} className="lp-team-card__photo" />
                  : <div className="lp-team-card__avatar" style={{background:`linear-gradient(135deg,${m.color},${m.colorEnd})`}}>{m.initials}</div>
                }
                <p className="lp-team-card__name">{m.name}</p>
                <p className="lp-team-card__role">{m.role}</p>
                <div className="lp-team-card__tags">
                  {m.tags.map(t => <span key={t} className="lp-team-card__tag">{t}</span>)}
                </div>
                <a href={`mailto:${m.email}`} className="lp-team-card__email" aria-label={`Email ${m.name}`}>{m.email}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__bg"><div className="lp-blob lp-blob--cta"/></div>
        <div className="lp-container lp-cta__inner">
          <div className="lp-cta__badge">{t('🚀 Rejoignez les écoles qui modernisent leur gestion','🚀 Join schools modernizing their management')}</div>
          <h2>{t('Prêt à dire adieu à Excel ?','Ready to say goodbye to Excel?')}</h2>
          <p>{t('Inscrivez votre école dès aujourd\'hui. Premier trimestre entièrement gratuit.','Register your school today. First term entirely free.')}<br/>{t('Payez seulement si NovaBulletin vous convient.','Pay only if NovaBulletin works for you.')}</p>
          <div className="lp-cta__btns">
            <Link to="/register-school" className="lp-btn lp-btn--cta">{t('Inscrire mon école gratuitement →','Register my school for free →')}</Link>
            <Link to="/login" className="lp-btn lp-btn--ghost-white">{t('Déjà inscrit ? Se connecter','Already registered? Log in')}</Link>
          </div>
          <div className="lp-cta__trust">
            {(isFr ? ['✅ Sans engagement','🔒 Données sécurisées','📱 100% mobile','🌍 Togo · Bénin · CI · Sénégal · Ghana']
                    : ['✅ No commitment','🔒 Secure data','📱 100% mobile','🌍 Togo · Benin · CI · Senegal · Ghana']
            ).map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      {/* ─── FLOATING WHATSAPP ───────────────────────────────────────── */}
      <a
        href="https://wa.me/22890196991"
        target="_blank"
        rel="noopener noreferrer"
        className="lp-wa-float"
        aria-label={t('Nous contacter sur WhatsApp','Contact us on WhatsApp')}
        title={t('Nous contacter sur WhatsApp','Contact us on WhatsApp')}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="lp-wa-float__label">{t('Nous écrire','Chat with us')}</span>
      </a>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__top">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo"><img src={logoIcon} alt="NovaBulletin" width="42" height="42"/><span>NovaBulletin</span></div>
            <p>{t('Le logiciel de gestion scolaire moderne conçu pour les écoles d\'Afrique francophone.','The modern school management software built for Francophone African schools.')}</p>
            <p className="lp-footer__tagline">{t('Fait avec ❤️ au Togo','Made with ❤️ in Togo')}</p>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=felixatoma2@gmail.com" target="_blank" rel="noopener noreferrer" className="lp-footer__email">📧 felixatoma2@gmail.com</a>
            <div className="lp-footer__socials">
              <a href="https://facebook.com/novabulletin" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="lp-footer__social-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </a>
              <a href="https://tiktok.com/@novabulletin" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="lp-footer__social-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z"/></svg>
              </a>
              <a href="https://linkedin.com/company/novabulletin" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="lp-footer__social-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://x.com/novabulletin" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="lp-footer__social-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
              </a>
            </div>
            <div className="lp-store-badges lp-store-badges--footer">
              <div className="lp-store-badge lp-store-badge--sm">
                <span className="lp-store-badge__soon">{t('Bientôt','Soon')}</span>
                <svg className="lp-store-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 20.5v-17A1.5 1.5 0 0 1 5.14 2.08l13.5 8a1.5 1.5 0 0 1 0 2.84l-13.5 8A1.5 1.5 0 0 1 3 19.5z"/>
                </svg>
                <div>
                  <span className="lp-store-badge__sub">{t('Disponible sur','Available on')}</span>
                  <span className="lp-store-badge__name">Google Play</span>
                </div>
              </div>
              <div className="lp-store-badge lp-store-badge--sm">
                <span className="lp-store-badge__soon">{t('Bientôt','Soon')}</span>
                <svg className="lp-store-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <span className="lp-store-badge__sub">{t('Télécharger sur','Download on')}</span>
                  <span className="lp-store-badge__name">App Store</span>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-footer__cols">
            <div>
              <h4>{t('Produit','Product')}</h4>
              {[
                ['#features', t('Fonctionnalités','Features')],
                ['#lms', t('Module LMS','LMS Module')],
                ['#database', t('Base de données','Database')],
                ['#how', t('Comment ça marche','How it works')],
                ['#roles', t('Pour qui','Who it\'s for')],
                ['#comparison', t('Comparaison','Comparison')],
                ['#pricing', t('Tarif','Pricing')],
                ['#team', t('Équipe','Team')],
              ].map(([h,l]) => <a key={h} href={h}>{l}</a>)}
            </div>
            <div>
              <h4>{t('Démarrer','Get Started')}</h4>
              <Link to="/register-school">{t('Inscrire mon école','Register my school')}</Link>
              <Link to="/login">{t('Se connecter','Log in')}</Link>
              <Link to="/legal/tos">{t('Conditions d\'utilisation','Terms of service')}</Link>
              <Link to="/legal/privacy">{t('Confidentialité','Privacy')}</Link>
            </div>
            <div>
              <h4>{t('Nous servons','We serve')}</h4>
              {['🇹🇬 Togo','🇧🇯 Bénin','🇨🇮 Côte d\'Ivoire','🇸🇳 Sénégal','🇬🇭 Ghana','🇨🇲 Cameroun'].map(c => <span key={c}>{c}</span>)}
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <p>© {new Date().getFullYear()} NovaBulletin. {t('Tous droits réservés.','All rights reserved.')}</p>
          <div><Link to="/legal/tos">{t('CGU','Terms')}</Link><Link to="/legal/privacy">{t('Confidentialité','Privacy')}</Link></div>
        </div>
      </footer>
    </div>
  );
}
