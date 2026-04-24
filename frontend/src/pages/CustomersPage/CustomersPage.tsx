import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Mail, Phone, MapPin,
  TrendingUp, Users, Star, UserCheck,
  X, Building2, ChevronDown,
  Edit2, Trash2, Eye, Send, Copy, Check,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import styles from './CustomersPage.module.css';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────
type CustomerStatus = 'active' | 'vip' | 'inactive' | 'prospect';
type SortKey = 'name' | 'totalContracts' | 'totalValue' | 'status';
type SortDir = 'asc' | 'desc';

interface Customer {
  id: string; name: string; company: string; email: string;
  phone: string; location: string; sector: string;
  status: CustomerStatus; totalContracts: number;
  totalValue: number; lastActivity: string; avatar: string;
}

// ── Data ──────────────────────────────────────────────────────
const CUSTOMERS: Customer[] = [
  { id:'CUS-001', name:'Sarah Mitchell',   company:'NSW Department of Finance',     email:'sarah.m@finance.nsw.gov.au',       phone:'+61 2 9228 5555', location:'Sydney, NSW',    sector:'Government',    status:'vip',      totalContracts:14, totalValue:8400000,  lastActivity:'2h ago'  , avatar:'SM' },
  { id:'CUS-002', name:'James Thornton',   company:'Victorian Health Department',   email:'j.thornton@health.vic.gov.au',     phone:'+61 3 9096 0000', location:'Melbourne, VIC', sector:'Healthcare',    status:'active',   totalContracts:9,  totalValue:5200000,  lastActivity:'1d ago'  , avatar:'JT' },
  { id:'CUS-003', name:'Priya Ramanathan', company:'QLD Infrastructure Authority',  email:'p.ramanathan@qld.gov.au',          phone:'+61 7 3227 8111', location:'Brisbane, QLD',  sector:'Construction',  status:'active',   totalContracts:22, totalValue:18700000, lastActivity:'3d ago'  , avatar:'PR' },
  { id:'CUS-004', name:'David Chen',       company:'Defence Housing Australia',     email:'d.chen@dha.gov.au',                phone:'+61 2 6269 1111', location:'Canberra, ACT',  sector:'Facility Mgmt', status:'vip',      totalContracts:31, totalValue:24500000, lastActivity:'5h ago'  , avatar:'DC' },
  { id:'CUS-005', name:'Emma Blackwood',   company:'SA Water Corporation',          email:'e.blackwood@sawater.com.au',       phone:'+61 8 7424 1500', location:'Adelaide, SA',   sector:'Utilities',     status:'active',   totalContracts:6,  totalValue:3100000,  lastActivity:'1w ago'  , avatar:'EB' },
  { id:'CUS-006', name:'Tom Nguyen',       company:'Perth City Council',            email:'t.nguyen@perth.wa.gov.au',         phone:'+61 8 9461 3333', location:'Perth, WA',      sector:'Government',    status:'prospect', totalContracts:0,  totalValue:0,        lastActivity:'2w ago'  , avatar:'TN' },
  { id:'CUS-007', name:'Rachel Forsythe',  company:'Hobart City Council',           email:'r.forsythe@hobartcity.tas.gov.au', phone:'+61 3 6238 2711', location:'Hobart, TAS',    sector:'Government',    status:'inactive', totalContracts:3,  totalValue:980000,   lastActivity:'3w ago'  , avatar:'RF' },
  { id:'CUS-008', name:'Michael Santos',   company:'Ausgrid',                       email:'m.santos@ausgrid.com.au',          phone:'+61 2 9293 9111', location:'Sydney, NSW',    sector:'Utilities',     status:'active',   totalContracts:11, totalValue:7800000,  lastActivity:'6h ago'  , avatar:'MS' },
  { id:'CUS-009', name:'Lena Kowalski',    company:'NT Government Services',        email:'l.kowalski@nt.gov.au',             phone:'+61 8 8999 5511', location:'Darwin, NT',     sector:'Government',    status:'active',   totalContracts:5,  totalValue:2400000,  lastActivity:'4d ago'  , avatar:'LK' },
  { id:'CUS-010', name:'Andrew Walsh',     company:'Transurban Group',              email:'a.walsh@transurban.com',           phone:'+61 3 8656 8900', location:'Melbourne, VIC', sector:'Transportation', status:'vip',      totalContracts:18, totalValue:31200000, lastActivity:'1d ago'  , avatar:'AW' },
  { id:'CUS-011', name:'Chloe Henderson',  company:'ACT Health Directorate',        email:'c.henderson@act.gov.au',           phone:'+61 2 6205 0800', location:'Canberra, ACT',  sector:'Healthcare',    status:'prospect', totalContracts:0,  totalValue:0,        lastActivity:'1d ago'  , avatar:'CH' },
  { id:'CUS-012', name:'Omar Farouk',      company:'Western Sydney Airport Corp',   email:'o.farouk@westernsydney.airport',   phone:'+61 2 8762 1234', location:'Sydney, NSW',    sector:'Transportation', status:'active',   totalContracts:7,  totalValue:6200000,  lastActivity:'2d ago'  , avatar:'OF' },
];

const STATUS_CONFIG: Record<CustomerStatus, { label: string; cls: string }> = {
  vip:      { label:'VIP',      cls: styles.statusVip      },
  active:   { label:'Active',   cls: styles.statusActive   },
  inactive: { label:'Inactive', cls: styles.statusInactive },
  prospect: { label:'Prospect', cls: styles.statusProspect },
};

const AVATAR_COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EC4899','#06B6D4','#8B5CF6','#EF4444'];
const avatarColor = (av: string) =>
  AVATAR_COLORS[(av.charCodeAt(0) + av.charCodeAt(1)) % AVATAR_COLORS.length];

// ── 3-dot context menu ────────────────────────────────────────
function ContextMenu({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const ref    = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const copyEmail = () => {
    navigator.clipboard.writeText(customer.email);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  };

  return (
    <motion.div
      ref={ref}
      className={styles.contextMenu}
      initial={{ opacity:0, scale:0.92, y:-4 }}
      animate={{ opacity:1, scale:1,    y:0  }}
      exit={{   opacity:0, scale:0.92, y:-4  }}
      transition={{ duration:0.12 }}
    >
      <p className={styles.menuHeader}>{customer.name}</p>
      <div className={styles.menuDivider} />
      <button className={styles.menuItem} onClick={() => { /* open detail */ onClose(); }}>
        <Eye size={13} /> View Profile
      </button>
      <button className={styles.menuItem} onClick={onClose}>
        <Edit2 size={13} /> Edit Customer
      </button>
      <button className={styles.menuItem} onClick={() => { window.open(`mailto:${customer.email}`); onClose(); }}>
        <Send size={13} /> Send Email
      </button>
      <button className={styles.menuItem} onClick={copyEmail}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copied!' : 'Copy Email'}
      </button>
      <div className={styles.menuDivider} />
      <button className={clsx(styles.menuItem, styles.menuDanger)} onClick={onClose}>
        <Trash2 size={13} /> Remove Client
      </button>
    </motion.div>
  );
}

// ── Inline row detail — renders directly below the clicked row ─
function InlineDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <motion.div
      className={styles.inlineDetail}
      initial={{ opacity:0, height:0   }}
      animate={{ opacity:1, height:'auto' }}
      exit={{   opacity:0, height:0   }}
      transition={{ duration:0.22, ease:'easeOut' }}
    >
      <div className={styles.inlineInner}>
        {/* Header */}
        <div className={styles.inlineHeader}>
          <div className={styles.inlineAvatarRow}>
            <div className={styles.inlineAvatar} style={{ background: avatarColor(customer.avatar) }}>
              {customer.avatar}
            </div>
            <div>
              <h4 className={styles.inlineName}>{customer.name}</h4>
              <p className={styles.inlineCompany}>{customer.company}</p>
            </div>
          </div>
          <button className={styles.inlineClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Info grid */}
        <div className={styles.inlineGrid}>
          {[
            { icon: Mail,      label:'Email',    value: customer.email    },
            { icon: Phone,     label:'Phone',    value: customer.phone    },
            { icon: MapPin,    label:'Location', value: customer.location },
            { icon: Building2, label:'Sector',   value: customer.sector   },
          ].map(item => (
            <div key={item.label} className={styles.inlineItem}>
              <div className={styles.inlineItemLabel}>
                <item.icon size={11} /> {item.label}
              </div>
              <p className={styles.inlineItemValue}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className={styles.inlineStats}>
          <div className={styles.inlineStat}>
            <p className={styles.inlineStatVal}>{customer.totalContracts}</p>
            <p className={styles.inlineStatLbl}>Contracts</p>
          </div>
          <div className={styles.inlineStatDiv} />
          <div className={styles.inlineStat}>
            <p className={styles.inlineStatVal}>
              {customer.totalValue > 0 ? formatCurrency(customer.totalValue) : '—'}
            </p>
            <p className={styles.inlineStatLbl}>Total Value</p>
          </div>
          <div className={styles.inlineStatDiv} />
          <div className={styles.inlineStat}>
            <span className={clsx(styles.statusBadge, STATUS_CONFIG[customer.status].cls)}>
              {STATUS_CONFIG[customer.status].label}
            </span>
            <p className={styles.inlineStatLbl}>Status</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.inlineActions}>
          <button
            className={styles.inlineGhostBtn}
            onClick={() => window.open(`mailto:${customer.email}`)}
          >
            <Mail size={13} /> Send Email
          </button>
          <button
            className={styles.inlineGhostBtn}
            onClick={() => window.open(`tel:${customer.phone}`)}
          >
            <Phone size={13} /> Call
          </button>
          <button className={styles.inlinePrimaryBtn}>
            <TrendingUp size={13} />
            View Bids
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add Customer Modal ────────────────────────────────────────
function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', location:'', sector:'' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const modal = (
    <motion.div
      className={styles.overlay}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity:0, y:24, scale:0.97 }}
        animate={{ opacity:1, y:0,  scale:1    }}
        exit={{   opacity:0, y:16, scale:0.97  }}
        transition={{ type:'spring', stiffness:320, damping:30 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Add Customer</h3>
            <p className={styles.modalSub}>Add a new client or agency contact</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            {[
              { label:'Full Name', key:'name',     placeholder:'Jane Smith',           type:'text'  },
              { label:'Company',   key:'company',  placeholder:'Dept of Finance',      type:'text'  },
              { label:'Email',     key:'email',    placeholder:'jane@agency.gov.au',   type:'email' },
              { label:'Phone',     key:'phone',    placeholder:'+61 2 1234 5678',      type:'tel'   },
              { label:'Location',  key:'location', placeholder:'Sydney, NSW',          type:'text'  },
              { label:'Sector',    key:'sector',   placeholder:'Government…',          type:'text'  },
            ].map(f => (
              <div key={f.key} className={styles.formField}>
                <label className={styles.formLabel}>{f.label}</label>
                <input
                  type={f.type}
                  className={styles.formInput}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={onClose}>
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== k) return <ChevronDown size={12} className={clsx(styles.sortIcon, styles.sortDim)} />;
  return sortDir === 'asc'
    ? <ChevronDown size={12} className={clsx(styles.sortIcon, styles.sortActive, styles.sortFlip)} />
    : <ChevronDown size={12} className={clsx(styles.sortIcon, styles.sortActive)} />;
}

// ── Main page ─────────────────────────────────────────────────
export default function CustomersPage() {
  const [search,       setSearch]     = useState('');
  const [statusFilter, setStatus]     = useState<string>('all');
  const [sectorFilter, setSector]     = useState<string>('all');
  const [sortKey,      setSortKey]    = useState<SortKey>('totalValue');
  const [sortDir,      setSortDir]    = useState<SortDir>('desc');
  const [showModal,    setShowModal]  = useState(false);
  const [expandedId,   setExpandedId] = useState<string | null>(null);
  const [menuId,       setMenuId]     = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const list = CUSTOMERS.filter(c => {
      const q = search.toLowerCase();
      return (
        (!q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) ||
               c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) &&
        (statusFilter === 'all' || c.status === statusFilter) &&
        (sectorFilter === 'all' || c.sector === sectorFilter)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if      (sortKey === 'name')           cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'totalContracts') cmp = a.totalContracts - b.totalContracts;
      else if (sortKey === 'totalValue')     cmp = a.totalValue - b.totalValue;
      else if (sortKey === 'status')         cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [search, statusFilter, sectorFilter, sortKey, sortDir]);

  const totalValue     = CUSTOMERS.reduce((s, c) => s + c.totalValue, 0);
  const totalContracts = CUSTOMERS.reduce((s, c) => s + c.totalContracts, 0);
  const sectors        = ['all', ...Array.from(new Set(CUSTOMERS.map(c => c.sector)))];

  const statCards = [
    { label:'Total Clients',   value:String(CUSTOMERS.length),                                     sub:'Registered Contacts',         icon:Users,      gradient:'linear-gradient(135deg,#7C3AED,#4F46E5)' },
    { label:'Active Clients',  value:String(CUSTOMERS.filter(c=>c.status==='active').length),      sub:'Engaged This Quarter',        icon:UserCheck,  gradient:'linear-gradient(135deg,#10B981,#059669)' },
    { label:'VIP Clients',     value:String(CUSTOMERS.filter(c=>c.status==='vip').length),         sub:'High-Value Accounts',         icon:Star,       gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { label:'Total Bid Value', value:formatCurrency(totalValue),                                   sub:`${totalContracts} Contracts`, icon:TrendingUp, gradient:'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Customers</h2>
          <p className={styles.headingSub}>Manage Client Relationships and Agency Contacts</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className={styles.statCard}
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0  }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={styles.statIcon} style={{ background: card.gradient }}>
              <card.icon size={16} />
            </div>
            <div>
              <p className={styles.statLabel}>{card.label}</p>
              <p className={styles.statValue}>{card.value}</p>
              <p className={styles.statSub}>{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search name, company, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className={styles.filterGroup}>
          {(['all','active','vip','inactive','prospect'] as const).map(s => (
            <button
              key={s}
              className={clsx(styles.filterChip, statusFilter === s && styles.filterChipActive)}
              onClick={() => setStatus(s)}
            >
              {s === 'all' ? 'All Status' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
        <select
          className={styles.sectorSelect}
          value={sectorFilter}
          onChange={e => setSector(e.target.value)}
        >
          {sectors.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>
          ))}
        </select>
        <span className={styles.resultCount}>{filtered.length} clients</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <button className={styles.thBtn} onClick={() => handleSort('name')}>Customer <SortIcon k="name" sortKey={sortKey} sortDir={sortDir} /></button>
          <span className={styles.th}>Contact</span>
          <span className={styles.th}>Location / Sector</span>
          <button className={styles.thBtn} onClick={() => handleSort('totalContracts')}>Contracts <SortIcon k="totalContracts" sortKey={sortKey} sortDir={sortDir} /></button>
          <button className={styles.thBtn} onClick={() => handleSort('totalValue')}>Total Value <SortIcon k="totalValue" sortKey={sortKey} sortDir={sortDir} /></button>
          <button className={styles.thBtn} onClick={() => handleSort('status')}>Status <SortIcon k="status" sortKey={sortKey} sortDir={sortDir} /></button>
          <span className={styles.th}>Last Activity</span>
          <span className={styles.th} />
        </div>

        <div className={styles.tableBody}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <Users size={32} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No customers found</p>
              <p className={styles.emptySub}>Try adjusting your search or filters</p>
            </div>
          ) : (
            filtered.map((customer, i) => (
              <div key={customer.id} className={styles.rowGroup}>
                {/* ── Table row ── */}
                <motion.div
                  className={clsx(
                    styles.tableRow,
                    expandedId === customer.id && styles.tableRowExpanded
                  )}
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                >
                  {/* Customer */}
                  <div className={styles.customerCell}>
                    <div className={styles.avatar} style={{ background: avatarColor(customer.avatar) }}>
                      {customer.avatar}
                    </div>
                    <div className={styles.customerInfo}>
                      <p className={styles.customerName}>{customer.name}</p>
                      <p className={styles.customerId}>{customer.id}</p>
                    </div>
                    <ChevronDown
                      size={13}
                      className={clsx(styles.expandChevron, expandedId === customer.id && styles.expandChevronOpen)}
                    />
                  </div>

                  {/* Contact */}
                  <div className={styles.contactCell}>
                    <div className={styles.contactRow}>
                      <Mail size={11} className={styles.contactIcon} />
                      <span className={styles.contactText}>{customer.email}</span>
                    </div>
                    <div className={styles.contactRow}>
                      <Phone size={11} className={styles.contactIcon} />
                      <span className={styles.contactText}>{customer.phone}</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className={styles.locationCell}>
                    <div className={styles.contactRow}>
                      <MapPin size={11} className={styles.contactIcon} />
                      <span className={styles.contactText}>{customer.location}</span>
                    </div>
                    <div className={styles.contactRow}>
                      <Building2 size={11} className={styles.contactIcon} />
                      <span className={styles.contactText}>{customer.sector}</span>
                    </div>
                  </div>

                  {/* Contracts */}
                  <div className={styles.numCell}>
                    <span className={styles.numValue}>{customer.totalContracts}</span>
                  </div>

                  {/* Value */}
                  <div className={styles.numCell}>
                    <span className={styles.numValuePrimary}>
                      {customer.totalValue > 0 ? formatCurrency(customer.totalValue) : '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={clsx(styles.statusBadge, STATUS_CONFIG[customer.status].cls)}>
                      {STATUS_CONFIG[customer.status].label}
                    </span>
                  </div>

                  {/* Last activity */}
                  <div className={styles.activityCell}>{customer.lastActivity}</div>

                  {/* 3-dot menu */}
                  <div className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                    <div className={styles.menuWrap}>
                      <button
                        className={clsx(styles.dotsBtn, menuId === customer.id && styles.dotsBtnActive)}
                        onClick={() => setMenuId(menuId === customer.id ? null : customer.id)}
                        title="More options"
                      >
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                      </button>
                      <AnimatePresence>
                        {menuId === customer.id && (
                          <ContextMenu customer={customer} onClose={() => setMenuId(null)} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>

                {/* ── Inline detail panel — directly below clicked row ── */}
                <AnimatePresence>
                  {expandedId === customer.id && (
                    <InlineDetail customer={customer} onClose={() => setExpandedId(null)} />
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add customer modal */}
      <AnimatePresence>
        {showModal && <AddCustomerModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
