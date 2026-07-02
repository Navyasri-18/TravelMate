import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Receipt, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCategorySpend } from '@/features/overview/useCategorySpend';

const CATEGORY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  food: { label: 'Food', color: '#e07a5f', bg: 'bg-[#e07a5f]' },
  travel: { label: 'Travel', color: '#3d5a80', bg: 'bg-[#3d5a80]' },
  accommodation: { label: 'Accommodation', color: '#81b29a', bg: 'bg-[#81b29a]' },
  activity: { label: 'Activity', color: '#f2cc8f', bg: 'bg-[#f2cc8f]' },
  shopping: { label: 'Shopping', color: '#b56576', bg: 'bg-[#b56576]' },
  settlement: { label: 'Settlement', color: '#4f5d75', bg: 'bg-[#4f5d75]' },
  other: { label: 'Other', color: '#a98467', bg: 'bg-[#a98467]' },
};

const formatAmount = (val: number) => {
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function OverviewDashboard() {
  const { data, isLoading, isError } = useCategorySpend();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AppLayout isFullScreen={true}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm justify-center items-center"
        >
          <div className="h-10 w-10 rounded-full border-2 border-[#a98467]/30 border-t-[#a98467] animate-spin" />
        </motion.div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout isFullScreen={true}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm justify-center items-center px-6 text-center"
        >
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-white">Couldn't load dashboard</h2>
          <p className="text-white/60 text-sm mt-2 max-w-md">
            Something went wrong while loading your overall spending overview.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 px-5 py-2.5 rounded-full bg-[#a98467] hover:bg-[#8c6f55] text-xs font-bold uppercase tracking-widest text-white transition-all cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </motion.div>
      </AppLayout>
    );
  }

  const hasData = data && data.categories.length > 0;

  // Render variables
  const categories = data?.categories || [];
  const grandTotal = data?.grandTotal || 0;
  const hasMultiCurrency = data?.hasMultiCurrency || false;

  // SVG calculations for Donut
  const size = 220;               // viewBox size (px)
  const strokeWidth = 18;         // base ring thickness
  const hoverGrow = 6;
  const maxStroke = strokeWidth + hoverGrow;
  const r = (size - maxStroke) / 2 - 4; // radius leaves room for the stroke + breathing room
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;      // circumference

  // Determine what is currently active in the center of the donut
  const activeLabel = hoveredCategory
    ? (CATEGORY_STYLES[hoveredCategory]?.label || 'Other')
    : 'Total Spend';
  const activeValue = hoveredCategory
    ? formatAmount(categories.find((c) => c.category === hoveredCategory)?.total || 0)
    : formatAmount(grandTotal);

  return (
    <AppLayout isFullScreen={true}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full min-h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-y-auto chat-scrollbar bg-black/10 backdrop-blur-sm p-6"
      >
        <div className="w-full max-w-4xl mx-auto space-y-8 pt-4 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <Receipt className="h-6 w-6 text-[#a98467]" />
                  Overall Spending
                </h1>
                <p className="text-white/50 text-sm mt-0.5">Across all your trips</p>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white/10 backdrop-blur-[15px] border border-white/20 shadow-2xl rounded-[32px] p-6 md:p-8">
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
                  <Receipt className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-white">No spending to show yet</h3>
                <p className="text-sm text-white/50 mt-1 max-w-sm">
                  Once you're added to expenses or settle custom splits in your trips, your spending breakdown will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Donut Chart Container */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-[240px] h-[240px] flex items-center justify-center">
                    <svg
                      viewBox={`0 0 ${size} ${size}`}
                      width={size}
                      height={size}
                      style={{ overflow: 'visible' }}
                    >
                      <g transform={`rotate(-90 ${cx} ${cy})`}>
                        {/* faint background track */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.06)"
                          strokeWidth={strokeWidth}
                        />
                        {(() => {
                          let cumulative = 0;
                          const gap = 3; // 3px gap between slices
                          return categories.map((c, idx) => {
                            const style = CATEGORY_STYLES[c.category] || CATEGORY_STYLES.other;
                            const frac = grandTotal > 0 ? c.total / grandTotal : 0;
                            const segLen = Math.max(0, frac * C - gap);
                            const dashArray = `${segLen} ${C - segLen}`;
                            const dashOffset = -cumulative;
                            cumulative += segLen + gap;

                            return (
                              <motion.circle
                                key={c.category}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke={style.color}
                                initial={{ strokeDasharray: `0 ${C}` }}
                                animate={{ strokeDasharray: dashArray }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.05 }}
                                strokeWidth={hoveredCategory === c.category ? strokeWidth + hoverGrow : strokeWidth}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="butt"
                                onMouseEnter={() => setHoveredCategory(c.category)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                style={{ transition: 'stroke-width 180ms ease, opacity 180ms' }}
                                opacity={hoveredCategory ? (hoveredCategory === c.category ? 1 : 0.4) : 1}
                                className="cursor-pointer"
                              />
                            );
                          });
                        })()}
                      </g>
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold transition-all duration-300">
                        {activeLabel}
                      </span>
                      <span className="text-lg font-bold text-white mt-1 break-all transition-all duration-300">
                        {activeValue}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend list */}
                <div className="md:col-span-7 space-y-4">
                  <div className="text-xs uppercase tracking-wider text-white/40 font-bold px-2">
                    Spending Categories
                  </div>
                  <div className="divide-y divide-white/5 border-t border-b border-white/5">
                    {categories.map((c) => {
                      const style = CATEGORY_STYLES[c.category] || CATEGORY_STYLES.other;
                      const isHovered = hoveredCategory === c.category;

                      return (
                        <div
                          key={c.category}
                          className={`flex items-center justify-between py-3 px-2 rounded-xl transition-all cursor-pointer ${
                            isHovered ? 'bg-white/5 scale-[1.01]' : 'hover:bg-white/5'
                          }`}
                          onMouseEnter={() => setHoveredCategory(c.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${style.bg}`} />
                            <span className="font-semibold text-sm text-white/80">
                              {style.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-white">{formatAmount(c.total)}</div>
                            <div className="text-[10px] text-white/40 mt-0.5">{c.percentage}% of total</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Multi-currency / Caveat alert block */}
          {hasData && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200/80">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300">
                  {hasMultiCurrency
                    ? 'Multi-currency Warning'
                    : 'Currency & Display Information'}
                </p>
                <p className="text-xs mt-1 leading-relaxed text-amber-200/60">
                  {hasMultiCurrency
                    ? 'You have spending across trips with different currencies. Raw totals are aggregated directly as shown.'
                    : 'All totals are currently shown in the base currency (₹).'}
                  {/* TODO: Add multi-currency conversion integration when currency conversion service is available. */}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AppLayout>
  );
}
