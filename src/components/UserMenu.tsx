import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, LogIn, LogOut, UserPlus, Smile, Frown, LayoutDashboard } from 'lucide-react';

interface UserMenuProps {
  isAuthenticated: boolean;
  userEmail?: string;
  onAuthRequired?: () => void | Promise<void>;
}

export function UserMenu({ isAuthenticated, userEmail, onAuthRequired }: UserMenuProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsMenuVisible(false);
    }
  };
  
  const handleLogout = async () => {
    setIsMenuVisible(false);
    if (!onAuthRequired) {
      console.error('❌ No onAuthRequired callback provided');
      return;
    }

    try {
      console.log('🚪 Logging out...');
      await onAuthRequired();
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      // Try again even on exception
      try {
        await onAuthRequired();
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
    }
  };

  const handleLoginClick = () => {
    setIsMenuVisible(false);
    if (onAuthRequired) {
      onAuthRequired();
    }
  };

  const handleDashboardClick = () => {
    console.log('🎯 Dashboard button clicked!');
    setIsMenuVisible(false);
    console.log('🎯 Setting hash to #/dashboard');
    window.location.hash = '#/dashboard';
    console.log('🎯 Current hash:', window.location.hash);
  };

  const showMenu = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsMenuVisible(true);
  };

  const scheduleHideMenu = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsMenuVisible(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      onBlur={handleBlur}
    >
      <button
        type="button"
        onClick={() => setIsMenuVisible((prev) => !prev)}
        onFocus={showMenu}
        onMouseEnter={showMenu}
        onMouseLeave={scheduleHideMenu}
        className={`flex items-center justify-center w-12 h-12 rounded-full border-3 border-black hover:scale-110 transition-all duration-200 focus:outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] ${
          isAuthenticated ? 'bg-cyan-400' : 'bg-gray-400'
        }`}
        aria-haspopup="menu"
        aria-expanded={isMenuVisible}
        aria-label="User menu"
      >
        {isAuthenticated ? (
          <Smile className="h-6 w-6 text-black" strokeWidth={2.5} />
        ) : (
          <Frown className="h-6 w-6 text-black" strokeWidth={2.5} />
        )}
      </button>

      <AnimatePresence>
        {isMenuVisible && (
          <motion.div
            key="user-menu-dropdown"
            role="menu"
            onMouseEnter={showMenu}
            onMouseLeave={scheduleHideMenu}
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 mt-3 w-56 rounded-xl border border-border/40 bg-white dark:bg-slate-900 shadow-xl py-2 text-sm z-50"
          >
            {isAuthenticated ? (
              <>
                {userEmail && (
                  <div className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                    {userEmail}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDashboardClick}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50/80 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Log in</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign up</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
