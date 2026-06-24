/**
 * FinancialsTab.tsx
 *
 * Renders Income Statement, Balance Sheet, and Cash Flow for FY2025
 * using the hierarchical detail JSON from the server, matching
 * Financial_Template.xlsx structure exactly.
 *
 * Indent levels:
 *   isHeader → section title row (blue background, caps)
 *   indent=1, isTotal=true  → bold total row
 *   indent=1, isTotal=false → normal top-level row
 *   indent=2                → indented child row (smaller, muted)
 */

import React, { useState } from 'react';
import type { FinancialLineItem, StatementDetail, FinancialDetailData } from '../../types/financials';

// ─── Formatting helpers ──────────────────────────────────────────────────────

function fmt(value: number | null, label?: string): string {
  if (value === null || value === undefined) return '—';

  // Percentage fields — detect by label heuristic
  if (label && (label.includes('%') || label.toLowerCase().includes('margin'))) {
    return `${value.toFixed(1)}%`;
  }

  // EPS and per-share fields
  if (label && (label.toLowerCase().includes('eps') || label.toLowerCase().includes('per share'))) {
    return `$${value.toFixed(2)}`;
  }

  // Shares outstanding (in millions → display as-is with M suffix)
  if (label && label.toLowerCase().includes('shares')) {
    return `${value.toFixed(1)}M`;
  }

  // Default: millions with $
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `$${(value / 1000).toFixed(2)}B`;
  }
  return `$${value.toFixed(1)}M`;
}

// ─── Row renderer ────────────────────────────────────────────────────────────

interface RowProps {
  item: FinancialLineItem;
  year: number;
  key?: string;
}

function LineItemRow({ item, year }: RowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  if (item.isHeader) {
    return (
      <tr className="financials-section-header">
        <td colSpan={2} style={{
          background: '#1a2744',
          color: '#60a5fa',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '10px 16px',
          borderTop: '1px solid #1e3a5f',
        }}>
          {item.label}
        </td>
      </tr>
    );
  }

  const isChild = item.indent >= 2;
  const labelStyle: React.CSSProperties = {
    paddingLeft: `${item.indent * 16}px`,
    fontWeight: item.isTotal ? 700 : 400,
    fontSize: isChild ? '0.8rem' : '0.875rem',
    color: item.isTotal ? '#e2e8f0' : isChild ? '#94a3b8' : '#cbd5e1',
    padding: `6px 16px 6px ${item.indent * 16}px`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: hasChildren ? 'pointer' : 'default',
    userSelect: 'none',
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: item.isTotal ? 700 : 400,
    fontSize: isChild ? '0.8rem' : '0.875rem',
    color: item.value !== null && item.value < 0 ? '#f87171' : item.isTotal ? '#e2e8f0' : '#94a3b8',
    textAlign: 'right',
    padding: '6px 20px 6px 8px',
    fontVariantNumeric: 'tabular-nums',
  };

  const rowStyle: React.CSSProperties = {
    borderBottom: item.isTotal ? '1px solid #1e3a5f' : 'none',
    background: item.isTotal && item.indent === 1 ? 'rgba(30,58,95,0.3)' : 'transparent',
  };

  return (
    <>
      <tr style={rowStyle}>
        <td
          style={labelStyle}
          onClick={hasChildren ? () => setExpanded(e => !e) : undefined}
        >
          {hasChildren && (
            <span style={{ fontSize: '0.6rem', opacity: 0.6, minWidth: '10px' }}>
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {item.label}
        </td>
        <td style={valueStyle}>
          {fmt(item.value, item.label)}
        </td>
      </tr>
      {hasChildren && expanded && item.children!.map((child, i) => (
        <LineItemRow key={`${child.label}-${i}`} item={child} year={year} />
      ))}
    </>
  );
}

// ─── Statement table ─────────────────────────────────────────────────────────

interface StatementTableProps {
  detail: StatementDetail;
  title: string;
}

function StatementTable({ detail, title }: StatementTableProps) {
  return (
    <div style={{
      background: '#0f1e38',
      borderRadius: '12px',
      border: '1px solid #1e3a5f',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      {/* Table header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid #1e3a5f',
        background: '#0d1a30',
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0' }}>{title}</span>
        <span style={{
          fontSize: '0.75rem',
          color: '#64748b',
          background: '#1a2744',
          padding: '3px 10px',
          borderRadius: '20px',
        }}>
          FY{detail.fiscalYear} · {detail.currency} (Millions)
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '70%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>
          {detail.sections.map((item, i) => (
            <LineItemRow key={`${item.label}-${i}`} item={item} year={detail.fiscalYear} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: '#475569',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
      <div style={{ fontSize: '0.9rem' }}>
        No {tab} data available for FY2025.
      </div>
      <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#334155' }}>
        Run the sync script to populate financial data.
      </div>
    </div>
  );
}

// ─── Tab switcher ────────────────────────────────────────────────────────────

type TabKey = 'income' | 'balance' | 'cashflow';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'income',   label: 'Income Statement' },
  { key: 'balance',  label: 'Balance Sheet'    },
  { key: 'cashflow', label: 'Cash Flow'        },
];

// ─── Main component ──────────────────────────────────────────────────────────

interface FinancialsTabProps {
  financials: FinancialDetailData | null | undefined;
}

export default function FinancialsTab({ financials }: FinancialsTabProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('income');

  const tabStyle = (key: TabKey): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '0.825rem',
    fontWeight: activeTab === key ? 600 : 400,
    cursor: 'pointer',
    border: 'none',
    background: activeTab === key ? '#1d4ed8' : 'transparent',
    color: activeTab === key ? '#ffffff' : '#64748b',
    transition: 'all 0.15s',
  });

  if (!financials) {
    return <EmptyState tab="financial" />;
  }

  const { incomeStatementDetail, balanceSheetDetail, cashFlowDetail } = financials;

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: '#0d1a30',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={tabStyle(tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'income' && (
        incomeStatementDetail
          ? <StatementTable detail={incomeStatementDetail} title="Income Statement" />
          : <EmptyState tab="Income Statement" />
      )}
      {activeTab === 'balance' && (
        balanceSheetDetail
          ? <StatementTable detail={balanceSheetDetail} title="Balance Sheet" />
          : <EmptyState tab="Balance Sheet" />
      )}
      {activeTab === 'cashflow' && (
        cashFlowDetail
          ? <StatementTable detail={cashFlowDetail} title="Cash Flow Statement" />
          : <EmptyState tab="Cash Flow" />
      )}
    </div>
  );
}
