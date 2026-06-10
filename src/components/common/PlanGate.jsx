import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowUpRight } from 'lucide-react';

/**
 * Plan hierarchy for comparison.
 */
const PLAN_HIERARCHY = ['free', 'go', 'pro', 'enterprise'];

function isPlanAtLeast(userPlan, requiredPlan) {
  const userIdx = PLAN_HIERARCHY.indexOf(userPlan || 'free');
  const reqIdx = PLAN_HIERARCHY.indexOf(requiredPlan || 'free');
  return userIdx >= reqIdx;
}

/**
 * PlanGate — Reusable component that gates content behind a plan level or feature flag.
 *
 * Usage:
 *   <PlanGate requiredPlan="go">
 *     <WorkbenchDetail />
 *   </PlanGate>
 *
 *   <PlanGate feature="investor_view">
 *     <InvestorDashboard />
 *   </PlanGate>
 *
 * Props:
 *   - requiredPlan: 'go' | 'pro' | 'enterprise' — minimum plan level
 *   - feature: string — specific feature flag key from planLimits (e.g., 'investor_view')
 *   - fallback: optional custom fallback component instead of the default upgrade banner
 *   - inline: if true, renders a compact inline badge instead of a full-screen overlay
 */
export default function PlanGate({ children, requiredPlan, feature, fallback, inline = false }) {
  const { plan, planLimits } = useAuth();

  // Check plan level
  let allowed = true;
  if (requiredPlan && !isPlanAtLeast(plan, requiredPlan)) {
    allowed = false;
  }

  // Check feature flag
  if (feature && !planLimits?.[feature]) {
    allowed = false;
  }

  if (allowed) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredLabel = requiredPlan
    ? requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)
    : feature
      ? feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'Higher';

  // Inline mode — compact badge
  if (inline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium">
        <Lock className="w-3 h-3" />
        {requiredLabel} plan required
      </div>
    );
  }

  // Full upgrade banner
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-amber-500/20">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          Upgrade to {requiredLabel}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {feature === 'investor_view'
            ? 'The Investor View lets you share financial snapshots with stakeholders. Available on Pro and higher.'
            : feature === 'audit_logs'
              ? 'Audit logs provide full traceability of all changes. Available on Enterprise.'
              : requiredPlan === 'go'
                ? 'Workbenches, document vault, and expanded AI are available on the Go plan and above.'
                : `This feature requires the ${requiredLabel} plan or higher.`
          }
        </p>

        {/* Upgrade CTA */}
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00C6C2] to-[#00A8A4] text-black font-semibold rounded-xl hover:from-[#00D4D0] hover:to-[#00B5B1] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#00C6C2]/25 group"
        >
          <Sparkles className="w-4 h-4" />
          View Plans
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        {/* Current plan indicator */}
        <p className="mt-4 text-xs text-gray-500">
          Current plan: <span className="text-gray-300 font-medium capitalize">{plan}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * usePlanCheck — Hook version for conditional logic in components.
 *
 * Usage:
 *   const { allowed, plan, planLimits } = usePlanCheck({ requiredPlan: 'go' });
 *   if (!allowed) showUpgradePrompt();
 */
export function usePlanCheck({ requiredPlan, feature } = {}) {
  const { plan, planLimits } = useAuth();

  let allowed = true;
  if (requiredPlan && !isPlanAtLeast(plan, requiredPlan)) {
    allowed = false;
  }
  if (feature && !planLimits?.[feature]) {
    allowed = false;
  }

  return { allowed, plan, planLimits };
}
