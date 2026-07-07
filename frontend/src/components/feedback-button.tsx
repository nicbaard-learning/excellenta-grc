'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
import { idbSet } from '@/lib/idb';

export function FeedbackButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Don't show on the feedback editor page or login page
  if (pathname === '/feedback/editor' || pathname === '/login' || pathname === '/') {
    return null;
  }

  const handleCapture = async () => {
    setCapturing(true);
    try {
      // Store original body styles
      const prevBodyHeight = document.body.style.height;
      const prevBodyOverflow = document.body.style.overflow;

      // Expand body to full scroll height so html-to-image captures everything
      document.body.style.height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) + 'px';
      document.body.style.overflow = 'visible';

      // Wait for layout to settle before capturing
      await new Promise(resolve => requestAnimationFrame(resolve));

      const dataUrl = await toPng(document.body, {
        quality: 0.95,
        pixelRatio: 1,
        backgroundColor:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--background')
            .trim() || '#ffffff',
        filter: (node) => {
          // Exclude the feedback button and its children from the screenshot
          if (node instanceof Element && node.hasAttribute('data-feedback-btn')) {
            return false;
          }
          return true;
        },
      });

      // Restore body styles
      document.body.style.height = prevBodyHeight;
      document.body.style.overflow = prevBodyOverflow;

      await idbSet('feedback_screenshot', dataUrl);
      await idbSet('feedback_page_url', window.location.href);
      await idbSet('feedback_page_title', document.title);

      window.open('/feedback/editor', '_blank');
    } catch (err) {
      // Restore body styles on error
      document.body.style.height = '';
      document.body.style.overflow = '';
      console.error('Screenshot failed:', err);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setCapturing(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999]" data-feedback-btn>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-16 right-0 mb-2 w-64"
            >
              <div className="glass rounded-xl p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Send Feedback</h4>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Capture this page, annotate it with notes, and send it to the development team.
                </p>
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {capturing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Capture Page
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="feedback"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageSquare className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
