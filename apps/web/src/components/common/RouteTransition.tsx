import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface RouteTransitionProps {
  children: ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        data-testid="route-transition"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
