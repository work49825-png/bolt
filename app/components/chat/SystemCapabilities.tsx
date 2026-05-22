import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import {
  ORCHESTRATION_CAPABILITY_NOTE,
  ORCHESTRATION_OFF_CAPABILITY_NOTE,
  SYSTEM_CAPABILITY_GROUPS,
  type CapabilityGroup,
} from '~/lib/orchestration/system-capabilities';
import { enableFullStackOrchestrationStore } from '~/lib/stores/settings';

type Variant = 'intro' | 'settings';

function CapabilityList({ group, accent }: { group: CapabilityGroup; accent: 'green' | 'amber' | 'blue' | 'slate' }) {
  const accentClasses = {
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    slate: 'text-bolt-elements-textTertiary',
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h4 className={classNames('text-sm font-medium', accentClasses[accent])}>{group.title}</h4>
        <p className="text-xs text-bolt-elements-textSecondary mt-0.5">{group.description}</p>
      </div>
      <ul className="list-disc pl-4 space-y-1 text-xs text-bolt-elements-textSecondary">
        {group.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {group.examples && group.examples.length > 0 ? (
        <p className="text-xs text-bolt-elements-textTertiary">
          Try:{' '}
          {group.examples.map((ex, i) => (
            <span key={ex}>
              {i > 0 ? ' · ' : ''}
              <span className="italic">&ldquo;{ex}&rdquo;</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export function SystemCapabilities({ variant = 'intro' }: { variant?: Variant }) {
  const orchestrationEnabled = useStore(enableFullStackOrchestrationStore);
  const [open, setOpen] = useState(variant === 'settings');

  const isIntro = variant === 'intro';

  if (isIntro) {
    return (
      <motion.div
        className="w-full max-w-2xl mx-auto mt-4 text-left animate-fade-in animation-delay-300"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={classNames(
            'w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-theme',
            'border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
            'hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
          )}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="i-ph:compass text-lg text-bolt-elements-textPrimary" />
            What can Bolt build well?
          </span>
          <span className={classNames('i-ph:caret-down transition-transform', open && 'rotate-180')} />
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SystemCapabilitiesPanel orchestrationEnabled={orchestrationEnabled} compact />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  }

  return <SystemCapabilitiesPanel orchestrationEnabled={orchestrationEnabled} />;
}

function SystemCapabilitiesPanel({
  orchestrationEnabled,
  compact = false,
}: {
  orchestrationEnabled: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={classNames(
        'rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
        compact ? 'mt-2 p-4' : 'p-5',
      )}
    >
      <p className="text-xs text-bolt-elements-textSecondary mb-4 leading-relaxed">
        {orchestrationEnabled ? ORCHESTRATION_CAPABILITY_NOTE : ORCHESTRATION_OFF_CAPABILITY_NOTE}
      </p>

      <motion.div layout className={classNames('grid gap-5', compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
        <CapabilityList group={SYSTEM_CAPABILITY_GROUPS.worksWell} accent="green" />
        <CapabilityList group={SYSTEM_CAPABILITY_GROUPS.worksWithCaveats} accent="amber" />
        <CapabilityList group={SYSTEM_CAPABILITY_GROUPS.requirements} accent="blue" />
        <CapabilityList group={SYSTEM_CAPABILITY_GROUPS.poorFit} accent="slate" />
      </motion.div>
    </div>
  );
}
