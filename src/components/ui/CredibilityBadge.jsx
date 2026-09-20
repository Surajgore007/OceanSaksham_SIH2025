import React, { useState } from 'react';
import Icon from '../Appicon';

/**
 * Explainable Credibility Badge Component
 * Displays confidence score (High / Moderate / Low) with hover tooltip of top contributing reasons.
 */
const CredibilityBadge = ({ score = 0.5, reasons = [], className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = Math.round(score * 100);
  let colorStyles = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  let badgeLabel = 'Moderate';
  let iconName = 'AlertCircle';

  if (score >= 0.75) {
    colorStyles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    badgeLabel = 'High';
    iconName = 'ShieldCheck';
  } else if (score < 0.45) {
    colorStyles = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    badgeLabel = 'Low';
    iconName = 'AlertTriangle';
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all hover:scale-105 ${colorStyles}`}
      >
        <Icon name={iconName} size={13} />
        <span>{badgeLabel} ({percentage}%)</span>
        <Icon name="Info" size={11} className="opacity-60" />
      </button>

      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-slate-900/95 border border-slate-700 text-slate-200 text-xs rounded-xl shadow-2xl z-50 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Icon name="Cpu" size={14} className="text-cyan-400" />
              Triage Explainability
            </span>
            <span className="font-mono text-cyan-400 font-bold">{percentage}%</span>
          </div>

          <div className="text-[11px] text-slate-400 mb-1.5">
            Key contributing signals from 7 feature groups:
          </div>

          {reasons && reasons.length > 0 ? (
            <ul className="space-y-1.5">
              {reasons.map((reason, idx) => {
                const isPositive = !reason.toLowerCase().includes('low') &&
                                   !reason.toLowerCase().includes('mismatch') &&
                                   !reason.toLowerCase().includes('delayed') &&
                                   !reason.toLowerCase().includes('calm') &&
                                   !reason.toLowerCase().includes('brief') &&
                                   !reason.toLowerCase().includes('duplicate');
                return (
                  <li key={idx} className="flex items-start gap-1.5 text-left leading-tight">
                    <Icon
                      name={isPositive ? "CheckCircle2" : "AlertOctagon"}
                      size={12}
                      className={isPositive ? "text-emerald-400 shrink-0 mt-0.5" : "text-rose-400 shrink-0 mt-0.5"}
                    />
                    <span className={isPositive ? "text-slate-300" : "text-amber-200/90"}>
                      {reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-slate-500 italic">Standard prior baseline assessment</div>
          )}

          <div className="mt-2.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
            <span>Human-in-the-loop triage</span>
            <span className="text-cyan-400/80">INCOIS ML Layer</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredibilityBadge;
