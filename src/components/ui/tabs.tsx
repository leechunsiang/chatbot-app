import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode | any;
};

// Original Tabs component (kept for backward compatibility)
export const TabsOriginal = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);
  const [tabs, setTabs] = useState<Tab[]>(propTabs);

  const moveSelectedTabToTop = (idx: number) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => {
              moveSelectedTabToTop(idx);
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn("relative px-4 py-2 rounded-full", tabClassName)}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full ",
                  activeTabClassName
                )}
              />
            )}

            <span className="relative block text-black dark:text-white">
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        hovering={hovering}
        className={cn("", contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  return (
    <div className="relative w-full h-full">
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          initial={{ opacity: 0 }}
          animate={{
            opacity: idx === 0 ? 1 : 0,
            display: idx === 0 ? 'block' : 'none',
          }}
          transition={{ duration: 0.3 }}
          className={cn("w-full h-full", className)}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
};

// Enhanced Tabs with Rich Page-Like Transitions
interface TabItem {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultActive?: number;
  className?: string;
}

export const Tabs = ({ tabs, defaultActive = 0, className = '' }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultActive);
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const [previousTab, setPreviousTab] = useState(defaultActive);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTabChange = (newIndex: number) => {
    if (newIndex === activeTab) return;
    
    setPreviousTab(activeTab);
    setActiveTab(newIndex);
    // Don't clear hover when switching - let the user control it
    setIsAnimating(true);
    
    // Reset animation flag after transition
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Tab Headers - Interactive Cards */}
      <div 
        className="relative flex items-center gap-2 mb-6"
        onMouseLeave={() => setHoveredTab(null)}
      >
        {tabs.map((tab, index) => (
          <motion.button
            key={index}
            onClick={() => handleTabChange(index)}
            onMouseEnter={() => index !== activeTab && setHoveredTab(index)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-all rounded-lg",
              activeTab === index
                ? 'text-white bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Stacked Cards Container */}
      <div 
        className="relative w-full" 
        style={{ 
          perspective: '2000px',
          height: 'calc(100% - 4rem)'
        }}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const wasPrevious = index === previousTab;
          
          // Show card if: 
          // - it's active
          // - was previous (for exit animation)
          // - we're hovering over navigation and it's not involved in current animation
          const isInTransition = isAnimating && (isActive || wasPrevious);
          const isStackedPreview = hoveredTab !== null && !isActive && !(isAnimating && wasPrevious);
          const shouldShow = isActive || isInTransition || isStackedPreview;
          
          // Calculate stack position for inactive cards
          let zIndex = 0;
          let stackLayer = 0;
          let animationState: 'active' | 'entering' | 'exiting' | 'stacked' | 'hidden' = 'hidden';
          
          // Active card should ALWAYS remain in active state, even when hovering
          if (isActive && !isAnimating) {
            zIndex = 100;
            stackLayer = 0;
            animationState = 'active';
          } else if (isActive && isAnimating) {
            zIndex = 100;
            stackLayer = 0;
            animationState = 'entering';
          } else if (wasPrevious && isAnimating) {
            zIndex = 90;
            stackLayer = 0;
            animationState = 'exiting';
          } else if (isStackedPreview) {
            // Create stack order based on distance from active tab
            const distance = Math.abs(index - activeTab);
            stackLayer = distance;
            zIndex = 50 - distance;
            animationState = 'stacked';
          } else {
            animationState = 'hidden';
          }
          
          // Calculate animation values based on state and direction
          let y = 0;
          let scale = 1;
          let opacity = 1;
          let rotateX = 0;
          
          if (animationState === 'active') {
            // Active card at front - always 100% opacity
            y = 0;
            scale = 1;
            opacity = 1;
            rotateX = 0;
          } else if (animationState === 'entering') {
            // New card coming forward - starts from below and springs up
            y = 0;
            scale = 1;
            opacity = 1;
            rotateX = 0;
          } else if (animationState === 'exiting') {
            // Old card moving back - lifts up as it recedes
            y = -80;
            scale = 0.85;
            opacity = 0.4;
            rotateX = -12;
          } else if (animationState === 'stacked') {
            // Stacked preview cards - but keep active card at 100% opacity
            y = -stackLayer * 25;
            scale = Math.max(0.8, 1 - stackLayer * 0.04);
            // Active card stays at full opacity when hovering
            opacity = isActive ? 1 : Math.max(0.5, 1 - stackLayer * 0.15);
            rotateX = -stackLayer * 4;
          } else {
            // Hidden - not visible
            opacity = 0;
          }
          
          return (
            <motion.div
              key={index}
              className="absolute inset-0 w-full"
              style={{
                transformStyle: 'preserve-3d',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
              initial={
                animationState === 'entering' 
                  ? {
                      y: 60,
                      scale: 0.9,
                      opacity: 0.5,
                      rotateX: 10,
                    }
                  : false
              }
              animate={{
                zIndex,
                y,
                x: 0,
                scale,
                opacity: shouldShow ? opacity : 0,
                rotateX,
                rotateY: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 25,
                mass: 1.2,
                // Add slight bounce for vertical motion
                y: {
                  type: 'spring',
                  stiffness: 180,
                  damping: 20,
                  mass: 1.5,
                },
              }}
            >
              <div className={cn(
                "w-full h-full rounded-3xl shadow-2xl border transition-colors",
                isActive 
                  ? 'border-blue-500/50 shadow-blue-500/20' 
                  : 'border-gray-300 dark:border-gray-600'
              )}>
                {tab.content}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
