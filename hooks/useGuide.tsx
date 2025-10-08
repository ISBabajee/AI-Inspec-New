import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { CloseIcon } from '../components/Icons';
import { useAccessibility } from './useAccessibility';

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  action?: () => void | Promise<void>; // Action to run before displaying the step
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuideContextType {
  isGuideActive: boolean;
  startGuide: (steps: TourStep[]) => void;
  endGuide: () => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

const GuidePopover: React.FC<{
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}> = ({ step, currentStepIndex, totalSteps, onNext, onPrev, onEnd }) => {
    const targetElement = document.querySelector(step.selector);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [desktopStyle, setDesktopStyle] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useAccessibility(popoverRef, true, onEnd);

    const calculatePosition = useCallback(() => {
        const isCurrentlyMobile = window.innerWidth < 768;
        setIsMobile(isCurrentlyMobile);

        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            
            if (isCurrentlyMobile) {
                setDesktopStyle({}); // Reset desktop styles on mobile
            } else {
                const rect = targetElement.getBoundingClientRect();
                const popoverHeight = popoverRef.current?.offsetHeight || 200;
                const popoverWidth = popoverRef.current?.offsetWidth || 320;
                let top, left;
                const placement = step.placement || 'bottom';
    
                switch(placement){
                    case 'top':
                        top = rect.top - popoverHeight - 15;
                        left = rect.left + (rect.width / 2) - (popoverWidth / 2);
                        break;
                    case 'right':
                        top = rect.top + (rect.height / 2) - (popoverHeight / 2);
                        left = rect.right + 15;
                        break;
                    case 'left':
                        top = rect.top + (rect.height / 2) - (popoverHeight / 2);
                        left = rect.left - popoverWidth - 15;
                        break;
                    default: // bottom
                        top = rect.bottom + 15;
                        left = rect.left + (rect.width / 2) - (popoverWidth / 2);
                        break;
                }
    
                setDesktopStyle({
                    position: 'absolute',
                    top: `${Math.max(10, top)}px`,
                    left: `${Math.max(10, Math.min(left, window.innerWidth - popoverWidth - 10))}px`,
                });
            }
        }
    }, [step.selector, step.placement, targetElement]);

    useEffect(() => {
        if (targetElement) {
            targetElement.classList.add('tour-highlight');
            calculatePosition();
            window.addEventListener('resize', calculatePosition);
        }
        return () => {
            if (targetElement) {
                targetElement.classList.remove('tour-highlight');
                window.removeEventListener('resize', calculatePosition);
            }
        };
    }, [targetElement, calculatePosition]);

    if (!targetElement) return null;

    return (
        <div 
            ref={popoverRef}
            style={isMobile ? {} : desktopStyle}
            className={`
              bg-white dark:bg-gray-800 p-4 shadow-2xl z-[101] border-2 border-brand-light-blue transition-all duration-300
              ${isMobile 
                ? 'guide-popover-mobile fixed bottom-0 left-0 right-0 w-full rounded-t-2xl' 
                : 'absolute rounded-lg max-w-sm w-full'
              }
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 id="guide-title" className="font-bold text-lg text-brand-dark dark:text-brand-light-blue">{step.title}</h3>
                <button 
                  onClick={onEnd} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 p-1 -mt-1 -mr-1" 
                  aria-label="End tour"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="max-h-[40vh] overflow-y-auto mb-4">
              <p className="text-sm text-slate-700 dark:text-gray-300">{step.content}</p>
            </div>

            <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onPrev} 
                        disabled={currentStepIndex === 0} 
                        className="px-4 py-2 bg-slate-200 dark:bg-gray-600 rounded text-sm font-medium hover:bg-slate-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {currentStepIndex === totalSteps - 1 ? (
                        <button 
                          onClick={onEnd} 
                          className="px-4 py-2 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600"
                        >
                          Finish
                        </button>
                    ) : (
                        <button 
                          onClick={onNext} 
                          className="px-4 py-2 bg-brand-light-blue text-white rounded text-sm font-semibold hover:bg-sky-500"
                        >
                          Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isGuideActive, setIsGuideActive] = useState(false);
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const startGuide = useCallback(async (tourSteps: TourStep[]) => {
        setSteps(tourSteps);
        setCurrentStepIndex(0);
        setIsGuideActive(true);
        if (tourSteps[0]?.action) {
            await tourSteps[0].action();
        }
    }, []);

    const endGuide = useCallback(() => {
        const lastStep = steps[currentStepIndex];
        if(lastStep){
             const targetElement = document.querySelector(lastStep.selector);
             if(targetElement) targetElement.classList.remove('tour-highlight');
        }
        setIsGuideActive(false);
        setSteps([]);
        setCurrentStepIndex(0);
    }, [steps, currentStepIndex]);

    const goToStep = useCallback(async (index: number) => {
        if (index >= 0 && index < steps.length) {
            const prevStep = steps[currentStepIndex];
            if (prevStep && prevStep.selector) {
                const targetElement = document.querySelector(prevStep.selector);
                if (targetElement) targetElement.classList.remove('tour-highlight');
            }

            const nextStep = steps[index];
            if (nextStep.action) {
                await nextStep.action();
            }
            
            // Give the DOM time to update after the action
            setTimeout(() => {
                setCurrentStepIndex(index);
            }, 300); // Increased delay to allow for async actions and UI updates
        } else {
            endGuide();
        }
    }, [steps, currentStepIndex, endGuide]);

    const nextStep = useCallback(() => {
        goToStep(currentStepIndex + 1);
    }, [currentStepIndex, goToStep]);

    const prevStep = useCallback(() => {
        goToStep(currentStepIndex - 1);
    }, [currentStepIndex, goToStep]);
    
    const contextValue = {
        isGuideActive,
        startGuide,
        endGuide,
    };
    
    return (
        <GuideContext.Provider value={contextValue}>
            {children}
            {isGuideActive && steps.length > 0 && (
              <>
                  <div className="fixed inset-0 bg-transparent z-[100]" onClick={endGuide}></div>
                  <style>{`
                    @keyframes tour-pulse {
                      0% {
                        box-shadow: 0 0 0 0px rgba(56, 189, 248, 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.6);
                      }
                      70% {
                        box-shadow: 0 0 0 12px rgba(56, 189, 248, 0), 0 0 0 9999px rgba(0, 0, 0, 0.6);
                      }
                      100% {
                        box-shadow: 0 0 0 0px rgba(56, 189, 248, 0), 0 0 0 9999px rgba(0, 0, 0, 0.6);
                      }
                    }
                    .tour-highlight {
                      position: relative;
                      z-index: 101;
                      border-radius: 6px;
                      animation: tour-pulse 1.5s infinite;
                      transition: box-shadow 0.3s ease-in-out;
                      pointer-events: none; /* Prevent interaction with the highlighted element itself */
                    }
                    .tour-highlight > * {
                        pointer-events: auto; /* Re-enable pointer events for children if needed */
                    }
                    @keyframes guide-slide-in {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    .guide-popover-mobile {
                        animation: guide-slide-in 0.3s ease-out forwards;
                    }
                  `}</style>
                   <GuidePopover
                        step={steps[currentStepIndex]}
                        currentStepIndex={currentStepIndex}
                        totalSteps={steps.length}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onEnd={endGuide}
                    />
              </>
            )}
        </GuideContext.Provider>
    );
};

export const useGuide = (): GuideContextType => {
    const context = useContext(GuideContext);
    if (!context) {
        throw new Error('useGuide must be used within a GuideProvider');
    }
    return context;
};