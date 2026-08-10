import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import UserBar from '@/components/UserBar'

export default function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <>
      <UserBar />
      {/* Keep route transitions overlapping so auth and large page changes mount immediately. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
