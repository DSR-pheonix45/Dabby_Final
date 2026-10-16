/**
 * Helper to compute live or realistic workbench-specific business health metrics.
 * Tailors numbers, currency symbols, and details to the active workbench.
 */

// Simple deterministic pseudo-random hash from string
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getWorkbenchMetrics(workbench) {
  const wbId = workbench?.id || "default";
  const wbName = workbench?.name || "Dabby";
  const seed = hashString(wbId + wbName);

  const isIndia = (workbench?.country || "India").toLowerCase().includes("india") || (workbench?.currency || "INR") === "INR";
  const currencySymbol = isIndia ? "₹" : "$";

  // Multiplier variations for different workbenches
  const factor = 0.7 + ((seed % 70) / 100); // 0.7 to 1.4

  const formatNumber = (num) => {
    return new Intl.NumberFormat(isIndia ? "en-IN" : "en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(num));
  };

  const formatCurrency = (num) => {
    return `${currencySymbol}${formatNumber(num)}`;
  };

  // Base numerical metrics scaled per workbench
  const baseVolume = 284920 * factor;
  const baseRevenue = 1034892 * factor;
  const exceptionsCount = (seed % 3) + 1; // 1 to 3
  const reconciliationRate = 98.2 + ((seed % 16) / 10); // 98.2% to 99.7%
  const payoutHealth = (99.85 + ((seed % 14) / 100)).toFixed(2); // 99.85% to 99.98%
  const runwayMonths = (12 + (seed % 8)).toFixed(1); // 12.0 to 19.0 months
  const operatingMargin = (26 + (seed % 12)).toFixed(1); // 26.0% to 37.0%
  const overdueAmount = 42850 * factor;
  const overdueCount = (seed % 4) + 1;
  const taxReserveAmount = 18200 * factor;
  const queueCount = 12 + (seed % 10); // 12 to 21

  // Sparkline data for payout health
  const sparklineData = [98.5, 99.1, 98.9, 99.4, 99.7, 99.8, parseFloat(payoutHealth)];

  // Revenue curve wave points for chart
  const revenueWave = [
    { label: "Mon", val: Math.round(150000 * factor) },
    { label: "Tue", val: Math.round(180000 * factor) },
    { label: "Wed", val: Math.round(140000 * factor) },
    { label: "Thu", val: Math.round(210000 * factor) },
    { label: "Fri", val: Math.round(290000 * factor) },
    { label: "Sat", val: Math.round(170000 * factor) },
    { label: "Sun", val: Math.round(230000 * factor) },
  ];

  // Counterparty queue items
  const queueItems = [
    { id: 1, name: "ACMP Logistics Inc", amount: formatCurrency(18420 * factor), status: "Compliance hold", color: "amber" },
    { id: 2, name: "NovaPay Global", amount: formatCurrency(6120 * factor), status: "In review", color: "teal" },
    { id: 3, name: "Zetta Digital LLC", amount: formatCurrency(2980 * factor), status: "Queued", color: "blue" },
  ];

  // Rails data
  const railsData = isIndia
    ? [
        { label: "NEFT / RTGS Transfer", amount: formatCurrency(476000 * factor), pct: 65, color: "#38bdf8" },
        { label: "UPI Instant Rail", amount: formatCurrency(289000 * factor), pct: 44, color: "#10b981" },
        { label: "Corporate Netbanking", amount: formatCurrency(176000 * factor), pct: 32, color: "#a855f7" },
        { label: "Commercial Card", amount: formatCurrency(93000 * factor), pct: 21, color: "#f59e0b" },
      ]
    : [
        { label: "ACH Transfer", amount: formatCurrency(476000 * factor), pct: 65, color: "#38bdf8" },
        { label: "Fedwire / Wire", amount: formatCurrency(289000 * factor), pct: 38, color: "#10b981" },
        { label: "SEPA / Swift Instant", amount: formatCurrency(176000 * factor), pct: 33, color: "#a855f7" },
        { label: "Local RTP", amount: formatCurrency(93000 * factor), pct: 24, color: "#f59e0b" },
      ];

  return {
    workbenchName: wbName,
    currencySymbol,
    isIndia,
    metrics: {
      payout_health: {
        primaryValue: `${payoutHealth}%`,
        subtext: "▲ 0.04 pp (vs last 7 days)",
        status: "GOOD",
        sparkline: sparklineData,
        details: "1 automated retry handled cleanly",
      },
      exceptions_compliance: {
        primaryValue: `${exceptionsCount}`,
        subtext: `${exceptionsCount} compliance holds • 0 critical flags`,
        status: "ATTENTION",
        chips: [`${exceptionsCount} Compliance holds`, "0 Sanction flags"],
        details: "Requires review from Ops Lead",
      },
      monthly_volume: {
        primaryValue: formatCurrency(baseVolume),
        subtext: "Total paid today / this cycle",
        status: "GOOD",
        progressPct: 84,
        details: "84% of monthly volume goal reached",
      },
      reconciliation_rate: {
        primaryValue: `${reconciliationRate.toFixed(1)}%`,
        subtext: "Reconciled successfully (24h)",
        status: "GOOD",
        gaugePct: reconciliationRate,
        details: "Open ledger matching 99.8%",
      },
      revenue_analytics: {
        primaryValue: formatCurrency(baseRevenue),
        subtext: "▲ 12.4% vs trailing 30d",
        status: "GROWTH",
        wave: revenueWave,
        details: "Top revenue day: Friday ($290k)",
      },
      realtime_queue: {
        primaryValue: `${queueCount} Waiting`,
        subtext: "Avg clearance time 1.4s",
        status: "LIVE",
        items: queueItems,
        details: "Streaming live pipeline",
      },
      top_rails: {
        primaryValue: `${railsData.length} Active Rails`,
        subtext: `Primary: ${railsData[0].label}`,
        status: "OPTIMAL",
        rails: railsData,
        details: "99.9% uptime across all connections",
      },
      fraud_shield: {
        primaryValue: "78% Coverage",
        subtext: "92% SLA safety rating",
        status: "ACTIVATED",
        autoClearedAmount: formatCurrency(304628 * factor),
        stats: { autoApproved: 14, inReview: 4, holds: exceptionsCount },
        details: "Auto-cleared in 24h",
      },
      runway_burn: {
        primaryValue: `${runwayMonths} Mo`,
        subtext: `Net Burn: ${formatCurrency(24500 * factor)}/mo`,
        status: "HEALTHY",
        runwayMonths: parseFloat(runwayMonths),
        liquidBalance: formatCurrency(348000 * factor),
        details: "Cash reserves in high-yield bank accounts",
      },
      operating_margin: {
        primaryValue: `${operatingMargin}%`,
        subtext: "▲ 3.2 pp above budget model",
        status: "STRONG",
        grossMargin: 64.2,
        netMargin: parseFloat(operatingMargin),
        details: "Gross: 64.2% • Net: " + operatingMargin + "%",
      },
      overdue_receivables: {
        primaryValue: formatCurrency(overdueAmount),
        subtext: `${overdueCount} invoices past 30 days`,
        status: "ATTENTION",
        buckets: [
          { label: "<30d", amount: formatCurrency(28000 * factor) },
          { label: "30-60d", amount: formatCurrency(11000 * factor) },
          { label: ">60d", amount: formatCurrency(3850 * factor) },
        ],
        details: "Automated reminders ready to dispatch",
      },
      budget_variance: {
        primaryValue: "86% Utilized",
        subtext: "Operations +14% over budget",
        status: "WARNING",
        utilizationPct: 86,
        flaggedCategory: "Operations & Cloud Infrastructure",
        details: "2 budget categories nearing 90% threshold",
      },
      tax_compliance: {
        primaryValue: formatCurrency(taxReserveAmount),
        subtext: "Next filing: 10 days remaining",
        status: "ON TRACK",
        fundedPct: 100,
        filingName: isIndia ? "GSTR-1 & TDS Monthly" : "Quarterly Federal & Sales Tax",
        details: "100% tax liability backed by liquid reserve",
      },
      working_capital: {
        primaryValue: "2.1x Ratio",
        subtext: "Current ratio > 1.5x safe benchmark",
        status: "EXCELLENT",
        assets: formatCurrency(520000 * factor),
        liabilities: formatCurrency(247000 * factor),
        details: "Low risk of working capital compression",
      },
    },
  };
}
