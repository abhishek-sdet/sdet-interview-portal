import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import GPTWBadge from '@/components/GPTWBadge';
import { Loader2, ArrowRight, ArrowLeft, Clock, CheckCircle2, Circle, AlertCircle, Code, Sparkles, ShieldAlert, Lock, ShieldCheck, Zap } from 'lucide-react';
import { accessControl } from '@/lib/accessControl';
import QuizSubmissionModal from '@/components/QuizSubmissionModal';
import QuestionStatusMap from '@/components/QuestionStatusMap';
import FormattedQuestionText from '@/components/FormattedQuestionText';
import { shuffleArray } from '@/utils/questionHelpers';

export default function QuizInterface() {
    const navigate = useNavigate();
    const location = useLocation();
    const candidateData = location.state?.candidateData || { 
        full_name: localStorage.getItem('candidateName'), 
        id: localStorage.getItem('candidateId') 
    };

    const enterFullscreen = async () => {
        const elem = document.documentElement;
        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
            console.log('[PROCTOR] Fullscreen mode entered successfully');
        } catch (err) {
            console.warn('[PROCTOR] Fullscreen request failed:', err);
        }
    };

    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [criteriaType, setCriteriaType] = useState(''); // 'Fresher' or 'Experienced'
    const [answeredQuestions, setAnsweredQuestions] = useState(new Set()); // Track answered question IDs
    const [visitedQuestions, setVisitedQuestions] = useState(new Set([0])); // Track visited question indices
    const [showSubmitModal, setShowSubmitModal] = useState(false); // Custom Submission Modal State
    const [showProctorWarning, setShowProctorWarning] = useState(false); // Fullscreen/Focus Violation Modal
    // Specialization State
    const [showSpecialization, setShowSpecialization] = useState(false);
    const [specialization, setSpecialization] = useState(null); // 'Java' or 'Python'
    const [totalExamQuestions, setTotalExamQuestions] = useState(0); // Total expected questions

    // Specialization Confirmation State
    const [showConfirmSpecialization, setShowConfirmSpecialization] = useState(false);
    const [pendingSpecialization, setPendingSpecialization] = useState(null);
    const [pendingMapIndex, setPendingMapIndex] = useState(null); // Tracks intercepted map navigation

    // Proctoring State
    const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
    const [proctorCountdown, setProctorCountdown] = useState(30);
    const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);
    const [allowScreenshots, setAllowScreenshots] = useState(false); // Default to secure
    const [proctoringStrict, setProctoringStrict] = useState(true); // Default to strict
    const [enforceFullScreen, setEnforceFullScreen] = useState(false); // Add full screen enforcement state
    const [shuffleQuestions, setShuffleQuestions] = useState(false); // Add shuffle state
    const MAX_WARNINGS = 3;

    // Refs to hold cached questions needed for the second phase
    const generalQuestionsRef = useRef([]);
    const javaQuestionsRef = useRef([]);
    const pythonQuestionsRef = useRef([]);
    const databaseQuestionsRef = useRef([]);
    const javascriptQuestionsRef = useRef([]);
    const lastWarningTimeRef = useRef(0); // For debouncing tab switches
    const criteriaNameRef = useRef(''); // Added to track criteria name for formatting

    // Track visited questions for accurate "Skipped" status without hopping bugs
    useEffect(() => {
        setVisitedQuestions(prev => {
            if (prev.has(currentIndex)) return prev;
            const newSet = new Set(prev);
            newSet.add(currentIndex);
            return newSet;
        });
    }, [currentIndex]);

    useEffect(() => {
        setMounted(true);

        const checkSession = async () => {
            const intId = localStorage.getItem('interviewId');
            if (!intId) {
                console.warn('[SESSION] No interviewId found in storage. Redirecting.');
                navigate('/');
                return;
            }

            // Verify the interview exists and is NOT results-locked
            const { data, error } = await supabase
                .from('interviews')
                .select('status')
                .eq('id', intId)
                .maybeSingle();

            if (error || !data) {
                console.error('[SESSION] Invalid or missing interview record.', error);
                localStorage.removeItem('interviewId');
                navigate('/');
            } else if (data.status === 'completed') {
                console.warn('[SESSION] Interview already completed. Redirecting to home.');
                navigate('/');
            }
        };

        checkSession();
        const interviewId = localStorage.getItem('interviewId');
        const criteriaId = localStorage.getItem('criteriaId');

        console.log('[INIT] Interview ID:', interviewId);
        console.log('[INIT] Criteria ID:', criteriaId);

        if (!interviewId || !criteriaId) {
            console.error('[INIT ERROR] Missing session data:', { interviewId, criteriaId });
            setError('Session expired. Please start the interview again.');
            setTimeout(() => navigate('/'), 2000);
            return;
        }

        // --- RESTORE STATE FROM LOCAL STORAGE ---
        const storageKey = `quiz_state_${interviewId}`;
        const savedStateString = localStorage.getItem(storageKey);

        if (savedStateString) {
            try {
                const savedState = JSON.parse(savedStateString);
                console.log('[INIT] Found saved quiz state:', savedState);

                // Restore basic state
                if (savedState.answers) setAnswers(savedState.answers);
                if (savedState.currentIndex) setCurrentIndex(savedState.currentIndex);
                if (savedState.tabSwitchWarnings) setTabSwitchWarnings(savedState.tabSwitchWarnings);
                if (savedState.answeredQuestions) setAnsweredQuestions(new Set(savedState.answeredQuestions));

                // Restore specialization
                if (savedState.specialization) {
                    setSpecialization(savedState.specialization);
                    setShowSpecialization(false); // Ensure selection UI is hidden if already selected
                } else if (savedState.showSpecialization) {
                    setShowSpecialization(true);
                }

                // Questions are tricky - we need to fetch them first, then apply correct subset
                // For now, we rely on fetchQuestions to rebuild the question list based on criteria/specialization logic
                // But we must ensure the timer considers the saved time

                fetchQuestions(criteriaId, savedState.timeRemaining, savedState.specialization);
                return; // fetchQuestions will handle the rest
            } catch (err) {
                console.error('[INIT] Failed to parse saved state:', err);
                localStorage.removeItem(storageKey); // Clear corrupted state
            }
        }

        fetchQuestions(criteriaId);
    }, [navigate]);

    // NEW: Independent Security Settings Fetch with Retry logic
    useEffect(() => {
        let retryCount = 0;
        const fetchSettings = async () => {
            console.log('[PROCTOR] Supabase Config Check:', { 
                url: import.meta.env.VITE_SUPABASE_URL ? 'PRESENT' : 'MISSING',
                key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING'
            });
            console.log('[PROCTOR] Fetching Site Settings (Attempt ' + (retryCount + 1) + ')...');
            try {
                const { data: siteSettings, error } = await supabase
                    .from('site_settings')
                    .select('allow_screenshots, proctoring_auto_submit, enforce_full_screen, shuffle_questions')
                    .single();

                if (error) {
                    console.error('[PROCTOR] Error fetching settings:', error);
                    if (retryCount < 2) {
                        retryCount++;
                        setTimeout(fetchSettings, 2000);
                        return;
                    }
                    // If all retries fail, use defaults
                    console.warn('[PROCTOR] Falling back to default security rules.');
                    setSettingsLoaded(true);
                    return;
                }

                if (siteSettings) {
                    console.log('[PROCTOR] Fetched Site Settings:', siteSettings);
                    setAllowScreenshots(siteSettings.allow_screenshots || false);
                    setProctoringStrict(siteSettings.proctoring_auto_submit !== false);
                    setEnforceFullScreen(siteSettings.enforce_full_screen || false);
                    setShuffleQuestions(siteSettings.shuffle_questions || false);
                } else {
                    console.warn('[PROCTOR] Site settings table is empty.');
                }
                setSettingsLoaded(true);
            } catch (err) {
                console.error('[PROCTOR] Fetch Exception:', err);
                setSettingsLoaded(true); 
            }
        };
        fetchSettings();
    }, []);

    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const settingsLoadedRef = useRef(false);
    useEffect(() => { settingsLoadedRef.current = settingsLoaded }, [settingsLoaded]);

    // --- SAVE STATE TO LOCAL STORAGE ---
    useEffect(() => {
        const interviewId = localStorage.getItem('interviewId');
        if (!interviewId || loading || submitting) return;

        const storageKey = `quiz_state_${interviewId}`;
        const stateToSave = {
            answers,
            currentIndex,
            timeRemaining,
            tabSwitchWarnings,
            specialization,
            showSpecialization,
            answeredQuestions: Array.from(answeredQuestions),
            timestamp: Date.now()
        };

        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        // console.log('[STORAGE] State saved'); // Commented out to reduce console spam
    }, [answers, currentIndex, timeRemaining, tabSwitchWarnings, specialization, showSpecialization, answeredQuestions, loading, submitting]);


    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0 || submitting) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, submitting]);

    // Trigger submit when time runs out
    useEffect(() => {
        if (timeRemaining === 0 && !submitting) {
            console.log('[TIMER] Time is up, auto-submitting...');
            handleSubmit(true, 'time_expired');
        }
    }, [timeRemaining, submitting]);

    // --- PROCTORING SHIELD ---

    // 1. Strict Compliance Loop (Interval Fallback for Split-Screen & Tab Switching)
    useEffect(() => {
        // Only start checks once loading is finished and settings are in place
        if (submitting || showSpecialization || loading || !settingsLoaded) {
            console.log('[PROCTOR] Compliance check waiting/paused:', { submitting, showSpecialization, loading, settingsLoaded });
            return;
        }

        let intervalId = null;

        // NEW: Add a 3-second stabilization delay before starting compliance checks
        const stabilizationTimeout = setTimeout(() => {
            console.log('[PROCTOR] Starting compliance monitoring...');
            intervalId = setInterval(() => {
                // If checking is disabled, just update heartbeat and exit
                if (!proctoringStrict && !enforceFullScreen) {
                    setHeartbeat(prev => (prev + 1) % 10);
                    return;
                }

                if (showProctorWarning) return; 

                let violation = false;
                let reason = '';

                // Check 1: Fullscreen enforcement
                const currentFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
                if (enforceFullScreen && !currentFullscreen) {
                    violation = true;
                    reason = 'Fullscreen exited (Interval Check)';
                }

                // Check 2: Tab switch / Window blur (Aligned with STRICT toggle)
                if (proctoringStrict && (document.hidden || !document.hasFocus())) {
                    violation = true;
                    reason = `Focus Violation (Hidden: ${document.hidden}, Focus: ${document.hasFocus()})`;
                }

                if (violation) {
                    console.warn(`[PROCTOR] VIOLATION: ${reason}`);
                    setTabSwitchWarnings(prev => prev + 1);
                    setProctorCountdown(30);
                    setShowProctorWarning(true);
                }
                
                setHeartbeat(prev => (prev + 1) % 10);
            }, 1000);
        }, 3000);

        return () => {
            clearTimeout(stabilizationTimeout);
            if (intervalId) clearInterval(intervalId);
        };
    }, [submitting, showSpecialization, showProctorWarning, loading, settingsLoaded, proctoringStrict, enforceFullScreen]);

    const [heartbeat, setHeartbeat] = useState(0);

    // 1.b. Countdown Timer for Proctor Warning
    useEffect(() => {
        let timer;
        if (showProctorWarning && proctorCountdown > 0 && !submitting) {
            timer = setInterval(() => {
                setProctorCountdown(prev => prev - 1);
            }, 1000);
        } else if (showProctorWarning && proctorCountdown <= 0 && !submitting) {
            if (proctoringStrict) {
                console.log('[PROCTOR] Countdown expired. Auto-submitting.');
                showToast.error("Exam Auto-Submitted due to prolonged absence from the secure environment.");
                // Prevent infinite loop if submission fails by hiding the warning modal 
                // (or setting proctorCountdown to a safe value) so it doesn't trigger again
                setShowProctorWarning(false);
                handleSubmit(true, 'proctor_timeout');
            } else {
                console.log('[PROCTOR] Countdown expired. Strict mode OFF, skipping auto-submit.');
                // Just keep the modal open until they click resume
            }
        }
        return () => clearInterval(timer);
    }, [showProctorWarning, proctorCountdown, submitting, proctoringStrict]);

    // 2. Fullscreen Sync
    useEffect(() => {
        const syncFullscreen = () => {
            const current = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            setIsActuallyFullscreen(current);
            console.log('[PROCTOR] Fullscreen sync:', current);
        };

        document.addEventListener('fullscreenchange', syncFullscreen);
        document.addEventListener('webkitfullscreenchange', syncFullscreen);
        document.addEventListener('mozfullscreenchange', syncFullscreen);
        document.addEventListener('MSFullscreenChange', syncFullscreen);
        
        syncFullscreen(); // Initial check

        return () => {
            document.removeEventListener('fullscreenchange', syncFullscreen);
            document.removeEventListener('webkitfullscreenchange', syncFullscreen);
            document.removeEventListener('mozfullscreenchange', syncFullscreen);
            document.removeEventListener('MSFullscreenChange', syncFullscreen);
        };
    }, []);

    // 2.b Instant Event Listeners (For instantaneous reaction)
    useEffect(() => {
        console.log('[PROCTOR] Security Effect triggered:', { proctoringStrict, enforceFullScreen, loading, submitting });
        if (submitting || showSpecialization || loading) return;
        
        const handleFocusLoss = () => {
            // Aggressively clear clipboard on focus loss ANYWAY if screenshots are locked
            if (!allowScreenshots && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('SECURITY BREACH: Screen capture attempted or focus lost.').catch(() => {});
            }

            // Obscure the screen immediately to prevent snipping tools from capturing the content
            if (!allowScreenshots) {
                document.body.style.filter = 'blur(10px)';
                document.body.style.opacity = '0';
            }

            // ONLY trigger tab-switch security warning visual if STRICT proctoring is enabled.
            if (!proctoringStrict) return;

            if (document.hidden || !document.hasFocus()) {
                if (!showProctorWarning) {
                    console.log('[PROCTOR] Focus lost detected by listener.');
                    setTabSwitchWarnings(prev => prev + 1);
                    setProctorCountdown(30);
                    setShowProctorWarning(true);
                }
            }
        };

        const handleFocusGain = () => {
            // Restore screen visibility when focus returns
            document.body.style.filter = 'none';
            document.body.style.opacity = '1';
        };

        document.addEventListener('visibilitychange', handleFocusLoss);
        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusGain);

        return () => {
            document.removeEventListener('visibilitychange', handleFocusLoss);
            window.removeEventListener('blur', handleFocusLoss);
            window.removeEventListener('focus', handleFocusGain);
            document.body.style.filter = 'none';
            document.body.style.opacity = '1';
        };
    }, [submitting, showSpecialization, showProctorWarning, tabSwitchWarnings, proctoringStrict, enforceFullScreen, loading]);

    // 2.b DevTools Honeypot Detection (Time-based debugger trap)
    useEffect(() => {
        if (submitting || showSpecialization || !proctoringStrict) return;

        const devToolsCheck = setInterval(() => {
            if (!proctoringStrict) return;
 
            const start = performance.now();
            debugger;
            const end = performance.now();
 
            if (end - start > 100) {
                console.warn('[PROCTOR] DevTools/Inspect Element detected!');
                if (!showProctorWarning) {
                    setProctorCountdown(30);
                    setShowProctorWarning(true);
                }
            }
        }, 1500);
 
        // EXTRA AGGRESSIVE: Clipboard Heartbeat Wipe (If screenshots are locked)
        let clipboardHeartbeat = null;
        if (!allowScreenshots) {
            clipboardHeartbeat = setInterval(() => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('PROTECTED ASSESSMENT: Screenshots are strictly prohibited.').catch(() => {});
                }
            }, 3000); // Purge every 3 seconds
        }

        return () => {
            clearInterval(devToolsCheck);
            if (clipboardHeartbeat) clearInterval(clipboardHeartbeat);
        };
    }, [submitting, showSpecialization, showProctorWarning, tabSwitchWarnings, proctoringStrict, allowScreenshots, loading]);

    // 3. Content Protection (Disable Right-click, Copy, Paste, Keyboard)
    useEffect(() => {
        // We no longer return early if !proctoringStrict because 
        // some protections (like screenshots) are independent toggles.

        const preventAction = (e) => {
            // Block context menu, copy, paste, cut if either strict mode is on OR screenshotting is locked
            if (proctoringStrict || !allowScreenshots) {
                e.preventDefault();
            }
        };

        const preventKeyboard = (e) => {
            // 1. Screenshot Detection (Global lockdown if !allowScreenshots)
            const isPrintScreen = ['PrintScreen', 'Snapshot', 'PrntSt', 'SysRq'].includes(e.key) || 
                                 ['PrintScreen', 'Snapshot'].includes(e.code);
            
            // Detect Meta/OS key which is often used to launch Snipping Tool (Win+Shift+S)
            // We obscure the screen while Meta is held down
            if (!allowScreenshots && e.metaKey) {
                document.body.style.filter = 'blur(10px)';
                document.body.style.opacity = '0';
            }

            if (!allowScreenshots && isPrintScreen) {
                console.warn('[PROCTOR] Screenshot attempt detected!');
                e.preventDefault();
                e.stopPropagation();

                // Instantly hide the screen to prevent capture if OS is slow
                document.body.style.filter = 'blur(20px)';
                document.body.style.opacity = '0';

                // Aggressive clipboard clearing
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('Screenshots are strictly prohibited.').catch(() => {});
                }

                if (!showProctorWarning) {
                    setProctorCountdown(30);
                    setShowProctorWarning(true);
                }
                return false;
            }

            // Block other known cheating shortcuts, but otherwise let typing happen naturally (e.g. if there were text inputs)
            // Actually, since this is a multiple choice quiz, we can block almost everything except navigation, 
            // but we need to be careful not to break accessibility or standard browser function if not needed.
            // Existing logic blocked ALL keys which is extremely aggressive. Let's keep it but enhance it.

            // 2. Mastery Keyboard Locking (Always active during question phase to prevent copy/paste culture)
            const allowedKeys = ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            
            if (allowScreenshots) {
                allowedKeys.push('PrintScreen', 'Snapshot', 'PrntSt', 'SysRq');
            }

            if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        const restoreScreenOnKeyUp = (e) => {
            // Restore screen if Meta key is released
            if (!allowScreenshots && (e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight')) {
                // Only restore if we actually have focus (prevent restoring if snipping tool overlay is active)
                if (document.hasFocus()) {
                    document.body.style.filter = 'none';
                    document.body.style.opacity = '1';
                }
            }
        };

        document.addEventListener('contextmenu', preventAction);
        document.addEventListener('copy', preventAction);
        document.addEventListener('paste', preventAction);
        document.addEventListener('cut', preventAction);
        document.addEventListener('selectstart', preventAction);
        document.addEventListener('keydown', preventKeyboard, true);
        document.addEventListener('keyup', preventKeyboard, true);
        document.addEventListener('keyup', restoreScreenOnKeyUp, true);
        document.addEventListener('keypress', preventKeyboard, true);

        return () => {
            document.removeEventListener('contextmenu', preventAction);
            document.removeEventListener('copy', preventAction);
            document.removeEventListener('paste', preventAction);
            document.removeEventListener('cut', preventAction);
            document.removeEventListener('selectstart', preventAction);
            document.removeEventListener('keydown', preventKeyboard, true);
            document.removeEventListener('keyup', preventKeyboard, true);
            document.removeEventListener('keyup', restoreScreenOnKeyUp, true);
            document.removeEventListener('keypress', preventKeyboard, true);
        };
    }, [allowScreenshots, showProctorWarning, tabSwitchWarnings, proctoringStrict]);

    // 4. Block Browser Back Navigation & Refresh
    useEffect(() => {
        if (!proctoringStrict) return;

        // Push state initially to trap the history
        window.history.pushState(null, document.title, window.location.href);

        const handlePopState = (event) => {
            // Re-push state immediately when back is clicked
            window.history.pushState(null, document.title, window.location.href);
            showToast.error("Navigation is disabled during the quiz. Please complete the assessment.", { id: 'nav-warning' });
        };

        const handleBeforeUnload = (e) => {
            if (!submitting) {
                const message = "Assessment in progress. Leaving this page may disqualify your attempt. Are you sure you want to leave?";
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        // Create a periodic "trap" that keeps the user at the current URL depth
        // This prevents users from clicking "back" multiple times very fast to escape
        const historyTrap = setInterval(() => {
            if (!submitting) {
                window.history.pushState(null, document.title, window.location.href);
            }
        }, 1000);

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(historyTrap);
        };
    }, [submitting, proctoringStrict]);

    const fetchQuestions = async (criteriaId, savedTimeRemaining = null, savedSpecialization = null) => {
        try {
            // Get interviewId from session storage
            const interviewId = localStorage.getItem('interviewId');
            let timeLimitMinutes = 0;

            // Get exam configuration from session (set by ExamSetup.jsx)
            const examConfigStr = localStorage.getItem('examConfig');
            const examConfig = examConfigStr ? JSON.parse(examConfigStr) : null;

            const rawSet = examConfig?.set || localStorage.getItem('selectedSet');
            const selectedSet = (!rawSet || rawSet === 'undefined' || rawSet === 'null') ? null : rawSet;
            
            const rawSubject = examConfig?.subject || savedSpecialization; // e.g., 'java', 'python'
            const selectedSubject = (!rawSubject || rawSubject === 'undefined' || rawSubject === 'null') ? null : rawSubject.toLowerCase();

            // Fetch Criteria to get dynamic module counts
            const { data: criteriaMetaData, error: criteriaMetaError } = await supabase
                .from('criteria')
                .select('metadata')
                .eq('id', criteriaId)
                .maybeSingle();

            const moduleCounts = criteriaMetaData?.metadata?.module_counts || {
                testing: 10,
                api: 4,
                logical: 3,
                agile: 2,
                cs_basics: 2,
                grammar: 2,
                javascript: 2,
                elective: 7
            };

            const expectedGeneralTotal = moduleCounts.testing + moduleCounts.api + moduleCounts.logical + moduleCounts.agile + moduleCounts.cs_basics + moduleCounts.grammar + (moduleCounts.javascript || 0);

            let query = supabase
                .from('questions')
                .select('*')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            // REMOVED strict category filter here to ensure we fetch Elective questions too (which might not have a category)
            // if (selectedSet) {
            //     query = query.eq('category', selectedSet); 
            // }

            const { data, error: fetchError } = await query.order('created_at');

            if (fetchError) throw fetchError;

            if (!data || data.length === 0) {
                setError('No questions available.');
                return;
            }

            // Deduplicate questions by text to prevent identical questions appearing if DB has duplicates
            let uniqueData = Array.from(
                new Map(data.map(q => [(q.question_text || '').trim().toLowerCase(), q])).values()
            );

            // FLEXIBLE MAPPING FOR LEGACY UPLOADS
            uniqueData = uniqueData.map(q => {
                let mappedSub = q.subsection ? q.subsection.toLowerCase() : 'testing';
                if (mappedSub.includes('agile')) mappedSub = 'agile';
                else if (mappedSub.includes('api')) mappedSub = 'api';
                else if (mappedSub.includes('logical')) mappedSub = 'logical';
                else if (mappedSub.includes('grammar') || mappedSub.includes('communication')) mappedSub = 'grammar';
                else if (mappedSub.includes('cs') || mappedSub.includes('computer')) mappedSub = 'cs_basics';
                else if (mappedSub.includes('java')) mappedSub = 'java';
                else if (mappedSub.includes('python')) mappedSub = 'python';
                else if (mappedSub.includes('javascript') || mappedSub.includes('js')) mappedSub = 'javascript';
                else if (mappedSub.includes('database') || mappedSub.includes('sql')) mappedSub = 'database';
                else mappedSub = 'testing';
                return { ...q, subsection: mappedSub };
            });

            // FETCH PREVIOUSLY ANSWERED QUESTIONS FOR THIS CANDIDATE
            const candidateId = localStorage.getItem('candidateId');
            if (candidateId) {
                try {
                    const { data: pastInterviews } = await supabase
                        .from('interviews')
                        .select('id')
                        .eq('candidate_id', candidateId)
                        .neq('id', interviewId);

                    if (pastInterviews && pastInterviews.length > 0) {
                        const pastInterviewIds = pastInterviews.map(i => i.id);
                        const { data: pastAnswers } = await supabase
                            .from('answers')
                            .select('question_id')
                            .in('interview_id', pastInterviewIds);

                        if (pastAnswers && pastAnswers.length > 0) {
                            const previousQuestionIds = new Set(pastAnswers.map(a => a.question_id));
                            
                            // Filter out questions the candidate has already seen
                            const unseenData = uniqueData.filter(q => !previousQuestionIds.has(q.id));
                            
                            if (unseenData.length >= expectedGeneralTotal + moduleCounts.elective) {
                                uniqueData = unseenData;
                                console.log('[FETCH] Filtered out previously answered questions. Remaining:', uniqueData.length);
                            } else {
                                console.warn('[FETCH] Not enough unseen questions available. Falling back to all questions.');
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[FETCH] Error fetching previous answers for deduplication:', err);
                }
            }

            // Categorize Questions by NEW structure: section + subsection
            // General/Aptitude
            let generalQs = uniqueData.filter(q => {
                const isGeneral = q.section === 'general' || !q.section;
                return isGeneral;
            });

            let electiveQs = uniqueData.filter(q => {
                const isElective = q.section === 'elective';
                return isElective;
            });

            // FALLBACK: If no section-categorized questions are found (e.g. custom exam like
            // "Functional Assessment" uploaded without section metadata), use ALL questions
            // directly under that criteria as general questions.
            if (generalQs.length === 0 && electiveQs.length === 0) {
                console.log('[FETCH] No section-filtered questions found. Using all criteria questions as general (custom exam mode).');
                generalQs = data;
                electiveQs = [];
            }

            console.log('[FETCH] Total questions fetched:', data.length);
            console.log('[FETCH] Selected Set:', selectedSet);
            console.log('[FETCH] Selected Subject:', selectedSubject);
            console.log('[FETCH] General questions filtered:', generalQs.length);
            console.log('[FETCH] Elective questions filtered:', electiveQs.length);

            // Filter elective questions by selected subject
            const selectedElectiveQs = selectedSubject
                ? electiveQs.filter(q => q.subsection === selectedSubject)
                : [];

            console.log('[FETCH] Selected elective questions:', selectedElectiveQs.length);

            // Organize general questions by subsection
            // Fetch site settings directly to ensure we have the latest shuffle preference
            const { data: siteSettings } = await supabase
                .from('site_settings')
                .select('shuffle_questions')
                .single();
            
            const isShuffleEnabled = siteSettings?.shuffle_questions || false;
            setShuffleQuestions(isShuffleEnabled);

            const selectQuestions = (arr, count) => isShuffleEnabled ? shuffleArray([...arr]).slice(0, count) : arr.slice(0, count);

            const isCodingQuestion = (q) => {
                const text = (q.question_text || '').toLowerCase();
                if (text.includes('```')) return true;
                if (text.includes('public class') || text.includes('system.out.print') || text.includes('public static void main')) return true;
                if (text.includes('def ') || text.includes('print(')) return true;
                if (text.includes('select ') && text.includes(' from ')) return true;
                if (text.includes('output of') || text.includes('following code')) return true;
                if (text.includes(';') && text.includes('{') && text.includes('}')) return true;
                return false;
            };

            const selectElectiveMix = (availableQs, count) => {
                const codingQs = availableQs.filter(isCodingQuestion);
                const theoryQs = availableQs.filter(q => !isCodingQuestion(q));

                const codingCount = Math.round(count * 0.6);
                const theoryCount = count - codingCount;

                let selectedCoding = shuffleArray([...codingQs]).slice(0, codingCount);
                let selectedTheory = shuffleArray([...theoryQs]).slice(0, theoryCount);

                // Fallback if not enough questions in either category
                if (selectedCoding.length < codingCount) {
                    const remainingTheoryNeeded = count - selectedCoding.length;
                    selectedTheory = shuffleArray([...theoryQs]).slice(0, remainingTheoryNeeded);
                } else if (selectedTheory.length < theoryCount) {
                    const remainingCodingNeeded = count - selectedTheory.length;
                    selectedCoding = shuffleArray([...codingQs]).slice(0, remainingCodingNeeded);
                }

                return shuffleArray([...selectedCoding, ...selectedTheory]);
            };

            let orderedGeneralQs = [];
            const knownSubsections = ['testing', 'api', 'logical', 'agile', 'cs_basics', 'grammar', 'javascript'];
            const hasSectionedQuestions = generalQs.some(q => knownSubsections.includes(q.subsection));

            if (hasSectionedQuestions) {
                let testingQs = selectQuestions(generalQs.filter(q => q.subsection === 'testing'), moduleCounts.testing);
                let apiQs = selectQuestions(generalQs.filter(q => q.subsection === 'api'), moduleCounts.api);
                let logicalQs = selectQuestions(generalQs.filter(q => q.subsection === 'logical'), moduleCounts.logical);
                let agileQs = selectQuestions(generalQs.filter(q => q.subsection === 'agile'), moduleCounts.agile);
                let csBasicsQs = selectQuestions(generalQs.filter(q => q.subsection === 'cs_basics'), moduleCounts.cs_basics);
                let grammarQs = selectQuestions(generalQs.filter(q => q.subsection === 'grammar'), moduleCounts.grammar);
                let javascriptQs = selectQuestions(generalQs.filter(q => q.subsection === 'javascript'), moduleCounts.javascript || 0);

                // Pad missing questions if any category is short
                let currentTotal = testingQs.length + apiQs.length + logicalQs.length + agileQs.length + csBasicsQs.length + grammarQs.length + javascriptQs.length;
                if (currentTotal < expectedGeneralTotal) {
                    const missing = expectedGeneralTotal - currentTotal;
                    // Try to pad from testing first
                    const testingAvailable = generalQs.filter(q => q.subsection === 'testing' && !testingQs.includes(q));
                    const pad = selectQuestions(testingAvailable, missing);
                    testingQs = [...testingQs, ...pad];
                    
                    // If still missing, pad from logical
                    currentTotal = testingQs.length + apiQs.length + logicalQs.length + agileQs.length + csBasicsQs.length + grammarQs.length + javascriptQs.length;
                    if (currentTotal < expectedGeneralTotal) {
                        const missingMore = expectedGeneralTotal - currentTotal;
                        const logicalAvailable = generalQs.filter(q => q.subsection === 'logical' && !logicalQs.includes(q));
                        const padMore = selectQuestions(logicalAvailable, missingMore);
                        logicalQs = [...logicalQs, ...padMore];
                    }
                }
                
                orderedGeneralQs = [
                    ...testingQs,
                    ...apiQs,
                    ...logicalQs,
                    ...agileQs,
                    ...csBasicsQs,
                    ...grammarQs,
                    ...javascriptQs
                ];

                console.log('[FETCH] Testing questions:', testingQs.length);
                console.log('[FETCH] API questions:', apiQs.length);
                console.log('[FETCH] Logical questions:', logicalQs.length);
                console.log('[FETCH] Agile questions:', agileQs.length);
                console.log('[FETCH] CS Basics questions:', csBasicsQs.length);
                console.log('[FETCH] Grammar questions:', grammarQs.length);
            } else {
                // Fallback for custom exams
                orderedGeneralQs = generalQs.slice(0, expectedGeneralTotal + moduleCounts.elective);
                console.log('[FETCH] Fallback: using unsectioned generalQs directly.', orderedGeneralQs.length);
            }

            // Store in refs
            generalQuestionsRef.current = orderedGeneralQs;
            console.log('[FETCH] Stored general questions:', generalQuestionsRef.current.length);

            // Determine if we should SKIP the specialization phase
            // We skip if we already have enough general questions (>= expectedGeneralTotal + elective) or if it's functional assessment
            const totalExpected = expectedGeneralTotal + moduleCounts.elective;
            const skipSpecialization = generalQuestionsRef.current.length >= totalExpected;

            // For backward compatibility with old specialization flow, store by subject
            if (selectedSubject && !skipSpecialization) {
                // Store selected elective questions
                const electiveRef = selectedSubject === 'database' 
                    ? selectQuestions(selectedElectiveQs, moduleCounts.elective)
                    : selectElectiveMix(selectedElectiveQs, moduleCounts.elective);
                if (selectedSubject === 'java') {
                    javaQuestionsRef.current = electiveRef;
                } else if (selectedSubject === 'python') {
                    pythonQuestionsRef.current = electiveRef;
                } else if (selectedSubject === 'database') {
                    databaseQuestionsRef.current = electiveRef;
                }
            } else {
                // Pre-filter ALL available specialized subjects into refs for the selection screen
                javaQuestionsRef.current = selectElectiveMix(electiveQs.filter(q => q.subsection === 'java'), moduleCounts.elective);
                pythonQuestionsRef.current = selectElectiveMix(electiveQs.filter(q => q.subsection === 'python'), moduleCounts.elective);
                databaseQuestionsRef.current = selectQuestions(electiveQs.filter(q => q.subsection === 'database'), moduleCounts.elective);
                javascriptQuestionsRef.current = selectElectiveMix(electiveQs.filter(q => q.subsection === 'javascript'), moduleCounts.elective);
            }

            let initialQs = [...orderedGeneralQs];
            let addedElectives = [];

            if (selectedSubject && !skipSpecialization) {
                // If a subject was already selected before, append its questions now
                // addedElectives is already set if we go through the logic above, but if we need to set it here:
                addedElectives = selectedSubject === 'java' ? javaQuestionsRef.current : 
                                 selectedSubject === 'python' ? pythonQuestionsRef.current :
                                 selectedSubject === 'javascript' ? javascriptQuestionsRef.current : 
                                 databaseQuestionsRef.current;
                
                if (!addedElectives || addedElectives.length === 0) {
                     addedElectives = selectedSubject === 'database'
                         ? selectQuestions(selectedElectiveQs, moduleCounts.elective)
                         : selectElectiveMix(selectedElectiveQs, moduleCounts.elective);
                }
                initialQs = [...initialQs, ...addedElectives];
            } else if (!skipSpecialization) {
                // Add placeholder questions so the map shows 30 questions from the start.
                let placeholders = javaQuestionsRef.current || [];
                if (placeholders.length < moduleCounts.elective && (pythonQuestionsRef.current || []).length > placeholders.length) {
                    placeholders = pythonQuestionsRef.current;
                }
                if (placeholders.length < moduleCounts.elective && (databaseQuestionsRef.current || []).length > placeholders.length) {
                    placeholders = databaseQuestionsRef.current;
                }
                addedElectives = placeholders;
                initialQs = [...initialQs, ...addedElectives];
            }
            
            setQuestions(initialQs);
            
            // Set the dynamic total questions target
            // If a subject was already selected, use the actual length of initialQs (in case of missing questions)
            // Otherwise, we anticipate the moduleCounts.elective to be added later
            const expectedTotal = skipSpecialization
                ? generalQuestionsRef.current.length
                : (selectedSubject ? initialQs.length : generalQuestionsRef.current.length + moduleCounts.elective);
            setTotalExamQuestions(expectedTotal);

            // If we skip specialization, we mark it as "General" immediately
            let currentSpecialization = specialization;
            if (skipSpecialization) {
                currentSpecialization = 'General';
                setSpecialization('General');
            } else if (selectedSubject) {
                currentSpecialization = selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1);
            }

            // Apply randomization based on site settings (ONLY for internal shuffling now)
            // The category sequence is strictly maintained.
            let finalQuestions = initialQs;
            setQuestions(finalQuestions);

            console.log(`[FETCH] Loaded ${finalQuestions.length} questions upfront (${isShuffleEnabled ? 'SHUFFLED' : 'ORIGINAL ORDER'})`);

            // If total general < 1, we have an issue
            if (generalQuestionsRef.current.length < 1) {
                setError('No questions found for this assessment. Please contact the administrator.');
            }

            // Check for scheduled interview for today
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            console.log('[TIMER] Checking for scheduled interview on:', today);

            // 1. Fetch criteria timer FIRST (this is what admin sets - Primary Source of Truth)
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('timer_duration, name')
                .eq('id', criteriaId)
                .maybeSingle();

            if (criteriaError) {
                console.error('[TIMER ERROR] Failed to fetch criteria:', criteriaError);
            }

            if (criteriaData) {
                setCriteriaType(criteriaData.name);
                criteriaNameRef.current = criteriaData.name;
            }

            // Standard: Use criteria timer if available
            if (criteriaData && criteriaData.timer_duration) {
                timeLimitMinutes = criteriaData.timer_duration;
                console.log('[TIMER] Using criteria timer from admin:', timeLimitMinutes, 'minutes');
            }

            // 2. Scheduled interview check (Secondary Source / Override)
            // Fetch ALL active drives for today to see if any match our criteria OR are "Both"
            const { data: activeDrivesToday, error: scheduleError } = await supabase
                .from('scheduled_interviews')
                .select(`
                    id, 
                    time_limit_minutes,
                    criteria_id,
                    criteria!inner(name)
                `)
                .eq('scheduled_date', today)
                .eq('is_active', true);

            if (scheduleError) {
                console.error('[TIMER ERROR] Failed to fetch scheduled interviews:', scheduleError);
            }

            // Find a drive that either matches our specific criteria OR is marked "Both"
            const scheduledInterview = activeDrivesToday?.find(drive => 
                drive.criteria_id === criteriaId || drive.criteria?.name === 'Both'
            );

            if (scheduledInterview) {
                console.log('[TIMER] Found matching scheduled interview:', scheduledInterview);
                // ONLY override if the criteria timer wasn't found, OR if the scheduled drive 
                // has a SPECIFIC non-default timer that should take precedence (optional business rule)
                if (!timeLimitMinutes && scheduledInterview.time_limit_minutes) {
                    timeLimitMinutes = scheduledInterview.time_limit_minutes;
                    console.log('[TIMER] Falling back to scheduled timer:', timeLimitMinutes, 'minutes');
                }
            } else {
                console.log('[TIMER] No matching scheduled interview found for today (criteria mismatch or none active)');
            }

            let scheduledInterviewId = scheduledInterview?.id || null;

            // Universal Update: Ensure question_set and time_limit are ALWAYS saved
            if (interviewId) {
                // Determine specialization string for early display - Use local variables to avoid stale state
                const electiveStr = selectedSubject || currentSpecialization;
                const criteriaName = criteriaData?.name || '';
                const isAssessment = criteriaName.toLowerCase().includes('assessment');
                
                let displaySet = (selectedSet && selectedSet !== 'N/A') ? selectedSet : 'Set';
                
                // Refined Logic: If Assessment, just show Set A. Otherwise, show Set A (Java).
                if (!isAssessment && electiveStr && electiveStr.toLowerCase() !== 'n/a' && electiveStr !== 'null' && electiveStr !== 'undefined') {
                    displaySet = `${displaySet} (${electiveStr.charAt(0).toUpperCase() + electiveStr.slice(1)})`;
                } else if (displaySet === 'Set' && (!selectedSet || selectedSet === 'N/A')) {
                    displaySet = null; // Don't save if we have zero info
                }

                console.log('[SETUP] Updating interview:', { interviewId, timeLimitMinutes, displaySet, scheduledInterviewId });
                
                // Build update object dynamically to avoid overwriting existing valid IDs with null
                const updateData = {
                    time_limit_minutes: timeLimitMinutes,
                    question_set: displaySet
                };

                // Only update scheduled_interview_id if we actually found a valid one
                // This prevents the "null overwrite" bug
                if (scheduledInterviewId) {
                    updateData.scheduled_interview_id = scheduledInterviewId;
                }

                await supabase
                    .from('interviews')
                    .update(updateData)
                    .eq('id', interviewId);
            }

            if (savedTimeRemaining !== null) {
                console.log('[TIMER] Restoring saved time:', savedTimeRemaining, 'seconds');
                setTimeRemaining(savedTimeRemaining);
            } else if (timeLimitMinutes) {
                // Convert minutes to seconds
                console.log('[TIMER] Setting timer to:', timeLimitMinutes, 'minutes (', timeLimitMinutes * 60, 'seconds)');
                setTimeRemaining(timeLimitMinutes * 60);
            } else {
                console.warn('[TIMER] No timer configured - using unlimited time');
            }

            // Fetch criteria type for badge display
            const { data: criteriaInfo, error: criteriaInfoError } = await supabase
                .from('criteria')
                .select('name')
                .eq('id', criteriaId)
                .single();

            if (!criteriaInfoError && criteriaInfo) {
                // Determine if Fresher or Experienced based on criteria name
                const isExperienced = criteriaInfo.name?.toLowerCase().includes('experienced') ||
                    criteriaInfo.name?.toLowerCase().includes('experience');
                setCriteriaType(isExperienced ? 'Experienced' : 'Fresher');
            }
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError('Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const answersRef = useRef(answers);

    // Keep answersRef in sync with state
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const handleAnswerSelect = (questionId, answer) => {
        console.log(`[ANSWER_SELECT] QID: ${questionId}, Answer: "${answer}"`);
        const newAnswers = {
            ...answers,
            [questionId]: answer
        };
        setAnswers(newAnswers);

        // CRITICAL: Update Ref IMMEDIATELY to prevent stale closures in handleSubmit
        answersRef.current = newAnswers;

        // Mark this question as answered
        setAnsweredQuestions(prev => {
            const newSet = new Set(prev);
            newSet.add(questionId);
            return newSet;
        });
    };

    const handleNext = () => {
        const isEndOfGeneral = currentIndex === generalQuestionsRef.current.length - 1;
        const skipSpecialization = generalQuestionsRef.current.length >= 30 || specialization === 'General';

        if (isEndOfGeneral && !specialization && !skipSpecialization) {
            // Trigger Specialization Selection
            setShowSpecialization(true);
        } else if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSpecializationSelect = (type) => { // 'Java', 'Python', or 'Database'
        setPendingSpecialization(type);
        setShowConfirmSpecialization(true);
    };

    const confirmSpecialization = () => {
        if (!pendingSpecialization) return;

        const type = pendingSpecialization;

        // Reset confirmation state
        setShowConfirmSpecialization(false);
        setPendingSpecialization(null);
        setShowSpecialization(false); // Hide selection UI

        // SWAP elective questions instead of appending
        // Since we loaded questions upfront, we need to replace the last elective portion
        const newElectiveQuestions = type === 'Java' ? javaQuestionsRef.current : type === 'Python' ? pythonQuestionsRef.current : type === 'JavaScript' ? javascriptQuestionsRef.current : databaseQuestionsRef.current;

        // When submitting specialization, we add the actual retrieved questions, so we also update totalExamQuestions
        // just in case we didn't have enough questions to fulfill the count
        const expectedTotal = generalQuestionsRef.current.length + (newElectiveQuestions?.length || 0);
        setTotalExamQuestions(expectedTotal);

        setQuestions(prevQuestions => {
            // Keep general questions (first 23) and append the selected elective questions
            // precise slice based on generalQuestionsRef length to be safe
            const generalQs = prevQuestions.slice(0, generalQuestionsRef.current.length);
            const finalElectives = shuffleQuestions ? shuffleArray([...newElectiveQuestions]) : newElectiveQuestions;
            return [...generalQs, ...finalElectives];
        });

        // Resume intercepted navigation or move to next sequentially
        if (pendingMapIndex !== null) {
            setCurrentIndex(pendingMapIndex);
            setPendingMapIndex(null);
        } else {
            setCurrentIndex(currentIndex + 1);
        }

        // Auto-set the specialization state for record keeping if needed
        setSpecialization(type);
    };

    const cancelSpecialization = () => {
        setShowConfirmSpecialization(false);
        setPendingSpecialization(null);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleMapQuestionSelect = (idx) => {
        // If clicking on an elective question (index >= general questions length) AND no specialization selected
        if (idx >= generalQuestionsRef.current.length && !specialization) {
            console.log('[NAVIGATION] Intercepted jump to elective question. Triggering Specialization Modal.');
            setPendingMapIndex(idx);
            setShowSpecialization(true);
        } else {
            setCurrentIndex(idx);
        }
    };

    const handleReview = () => {
        // Find first unanswered question
        const firstUnansweredIdx = questions.findIndex(q => !answers[q.id]);
        if (firstUnansweredIdx !== -1) {
            setCurrentIndex(firstUnansweredIdx);
        }
        setShowSubmitModal(false);
    };

    const [submissionFailed, setSubmissionFailed] = useState(false);

    const handleSubmit = async (autoSubmit = false, reason = null) => {
        console.log('[handleSubmit] triggered', { autoSubmit, reason });

        const currentAnswers = answersRef.current;
        const answeredQuestions = Object.keys(currentAnswers).filter(key =>
            currentAnswers[key] !== null &&
            currentAnswers[key] !== undefined &&
            currentAnswers[key] !== ''
        );

        const expectedTotal = totalExamQuestions > 0 ? totalExamQuestions : questions.length;

        if (!autoSubmit && !showSubmitModal) {
            setShowSubmitModal(true);
            return;
        }

        setSubmitting(true);
        setSubmissionFailed(false);
        setError('');

        try {
            const interviewId = localStorage.getItem('interviewId');
            if (!interviewId || interviewId === 'undefined' || interviewId === 'null') {
                throw new Error("Invalid Session: Your exam session was not properly initialized or was deleted by an administrator.");
            }

            const criteriaId = localStorage.getItem('criteriaId');
            const deviceId = accessControl.getDeviceId();

            let passingPercentage = 70;
            if (criteriaId) {
                const { data: criteriaData, error: criteriaError } = await supabase
                    .from('criteria')
                    .select('passing_percentage')
                    .eq('id', criteriaId)
                    .single();

                if (!criteriaError && criteriaData) {
                    passingPercentage = criteriaData.passing_percentage;
                }
            }

            let correctCount = 0;
            const answerRecords = [];

            questions.forEach((question) => {
                const selectedAnswer = currentAnswers[question.id];
                const normalize = (str) => {
                    if (str === null || str === undefined) return '';
                    return String(str).replace(/\u00A0/g, ' ').trim().toLowerCase();
                };

                const safeSelected = normalize(selectedAnswer);
                const safeCorrect = normalize(question.correct_answer);
                const isCorrect = safeSelected !== '' && safeSelected === safeCorrect;

                if (isCorrect) correctCount++;

                answerRecords.push({
                    interview_id: interviewId,
                    question_id: question.id,
                    selected_answer: selectedAnswer || null,
                    is_correct: isCorrect
                });
            });

            const totalQuestions = totalExamQuestions > 0 ? totalExamQuestions : questions.length;
            const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
            const passed = percentage >= passingPercentage;

            // 1. Delete existing answers if this is a retry (to avoid unique constraint errors if any records were partially saved)
            // Note: This assumes we want to overwrite. If using a transaction-like approach, we'd do this.
            await supabase.from('answers').delete().eq('interview_id', interviewId);

            // 2. Insert answers
            const { error: answersError } = await supabase
                .from('answers')
                .insert(answerRecords);

            if (answersError) throw answersError;

            // 3. Update interview
            const configStr = localStorage.getItem('examConfig');
            const config = configStr ? JSON.parse(configStr) : null;
            
            // Match the retrieval logic in fetchQuestions for consistency
            const rawSetVal = config?.set || localStorage.getItem('selectedSet');
            const questionSet = (!rawSetVal || rawSetVal === 'undefined' || rawSetVal === 'null') ? 'Set' : rawSetVal;
            
            const rawElectiveVal = specialization || config?.subject;
            const elective = (!rawElectiveVal || rawElectiveVal === 'undefined' || rawElectiveVal === 'null' || rawElectiveVal === 'N/A') ? null : rawElectiveVal;
            
            // Refined Logic: If Assessment, just show Set A. Otherwise show Set A (Java).
            const isAssessment = (criteriaNameRef.current || '').toLowerCase().includes('assessment');
            
            let fullSetInfo = questionSet;
            if (!isAssessment && elective && elective.toLowerCase() !== 'n/a') {
                fullSetInfo = `${questionSet} (${elective.charAt(0).toUpperCase() + elective.slice(1)})`;
            } else if (isAssessment) {
                fullSetInfo = questionSet; // Just show Set A/B/C/D
            } else if (questionSet === 'Set' && (!rawSetVal || rawSetVal === 'undefined')) {
                fullSetInfo = null; // Don't update if we have no info
            }

            const updatePayload = {
                status: 'completed',
                completed_at: new Date().toISOString(),
                score: correctCount,
                total_questions: totalQuestions,
                percentage: percentage,
                passed: passed,
                device_id: deviceId // Ensure device_id is recorded on submission for reattempt check
            };

            if (fullSetInfo) updatePayload.question_set = fullSetInfo;
            
            // PRESERVE METADATA: Fetch existing metadata and merge to avoid wiping the identity photo
            try {
                const { data: currentInterview } = await supabase
                    .from('interviews')
                    .select('metadata')
                    .eq('id', interviewId)
                    .single();
                
                const existingMeta = currentInterview?.metadata || {};
                const newMeta = autoSubmit 
                    ? { ...existingMeta, auto_submitted: true, reason: reason }
                    : existingMeta;
                
                updatePayload.metadata = newMeta;
            } catch (metaErr) {
                console.warn('[SUBMIT] Could not fetch existing metadata for merge', metaErr);
                if (autoSubmit) updatePayload.metadata = { auto_submitted: true, reason: reason };
            }

            const { error: updateError } = await supabase
                .from('interviews')
                .update(updatePayload)
                .eq('id', interviewId);

            if (updateError) throw updateError;

            // SUCCESS: Store results and clear state
            localStorage.setItem('score', correctCount);
            localStorage.setItem('totalQuestions', totalQuestions);
            localStorage.setItem('percentage', percentage.toFixed(2));
            localStorage.setItem('passed', passed);

            const storageKey = `quiz_state_${interviewId}`;
            localStorage.removeItem(storageKey);

            navigate('/thank-you');
        } catch (err) {
            console.error('[SUBMISSION ERROR]', err);
            setSubmissionFailed(true);
            
            // Provide a friendly error for foreign key constraint errors (e.g., if interview row was deleted)
            if (err.code === '23503' || (err.message && err.message.includes('foreign key constraint'))) {
                setError('Your interview session was deleted or is invalid. Please contact the administrator.');
            } else {
                setError(err.message || 'Connection lost. We could not save your answers.');
            }
            
            setSubmitting(false);
            showToast('Submission failed. Please try again.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="h-full w-full bg-universe flex items-center justify-center font-sans">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading Assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full bg-universe flex items-center justify-center p-4 text-white">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {submissionFailed ? 'Submission Failed' : 'Loading Error'}
                    </h2>
                    <p className="text-slate-400 mb-6">
                        {error || 'An unexpected error occurred. Please try again.'}
                    </p>

                    <div className="flex flex-col gap-3">
                        {submissionFailed ? (
                            <button
                                onClick={() => handleSubmit(false)}
                                className="w-full px-6 py-3 bg-brand-blue rounded-lg hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-5 h-5" />
                                Retry Submission
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/criteria-selection')}
                                className="w-full px-6 py-3 bg-brand-blue rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                            >
                                Return to Selection
                            </button>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors font-semibold"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Specialization Selection UI ---
    if (showSpecialization) {
        return (
            <div className="h-full w-full bg-universe flex flex-col items-center justify-center p-4 relative font-sans text-slate-100 overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="orb orb-1 opacity-50"></div>
                    <div className="orb orb-2 opacity-50"></div>
                    <div className="grid-texture"></div>
                </div>

                <div className="relative z-10 max-w-4xl w-full text-center">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            Choose Your Specialization
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            You've completed the general assessment. Now, select your primary programming language for the final technical questions.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Java Option */}
                        <button
                            onClick={() => handleSpecializationSelect('Java')}
                            className="group relative p-1 rounded-[2rem] transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 opacity-20 group-hover:opacity-40 rounded-[2rem] blur-xl transition-opacity"></div>
                            <div className="relative h-full bg-[#080c14]/80 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-10 flex flex-col items-center justify-center gap-6 overflow-hidden hover:border-orange-500/50 transition-colors">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-600/10 flex items-center justify-center shadow-lg shadow-orange-500/10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                                    <div className="w-16 h-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                                            <path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z" />
                                            <path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z" />
                                            <path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z" />
                                            <path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z" />
                                            <path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Java</h3>
                                    <p className="text-slate-400 text-sm">Object Oriented Programming & Core Concepts</p>
                                </div>
                                <div className="mt-4 px-6 py-2 rounded-full border border-orange-500/30 text-orange-400 text-sm font-bold tracking-widest uppercase group-hover:bg-orange-500 group-hover:text-white transition-all">
                                    Select Java
                                </div>
                            </div>
                        </button>

                        {/* Python Option */}
                        <button
                            onClick={() => handleSpecializationSelect('Python')}
                            className="group relative p-1 rounded-[2rem] transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 opacity-20 group-hover:opacity-40 rounded-[2rem] blur-xl transition-opacity"></div>
                            <div className="relative h-full bg-[#080c14]/80 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-10 flex flex-col items-center justify-center gap-6 overflow-hidden hover:border-blue-500/50 transition-colors">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                                    <div className="w-16 h-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                                            <defs>
                                                <linearGradient id="python-grad-a" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stopColor="#5A9FD4" /><stop offset="1" stopColor="#306998" /></linearGradient>
                                                <linearGradient id="python-grad-b" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stopColor="#FFD43B" /><stop offset="1" stopColor="#FFE873" /></linearGradient>
                                                <radialGradient id="python-grad-c" cx="1825.678" cy="444.45" r="26.743" gradientTransform="matrix(0 -.24 -1.055 0 532.979 557.576)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B8B8B8" stopOpacity=".498" /><stop offset="1" stopColor="#7F7F7F" stopOpacity="0" /></radialGradient>
                                            </defs>
                                            <path fill="url(#python-grad-a)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z" transform="translate(0 10.26)" />
                                            <path fill="url(#python-grad-b)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z" transform="translate(0 10.26)" />
                                            <path opacity=".444" fill="url(#python-grad-c)" d="M97.309 119.597c0 3.543-14.816 6.416-33.091 6.416-18.276 0-33.092-2.873-33.092-6.416 0-3.544 14.815-6.417 33.092-6.417 18.275 0 33.091 2.872 33.091 6.417z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Python</h3>
                                    <p className="text-slate-400 text-sm">Data Structures & Minimalist Syntax</p>
                                </div>
                                <div className="mt-4 px-6 py-2 rounded-full border border-blue-500/30 text-blue-400 text-sm font-bold tracking-widest uppercase group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    Select Python
                                </div>
                            </div>
                        </button>
                        {/* Database Option */}
                        <button
                            onClick={() => handleSpecializationSelect('Database')}
                            className="group relative p-1 rounded-[2rem] transition-all duration-500 hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 opacity-20 group-hover:opacity-40 rounded-[2rem] blur-xl transition-opacity"></div>
                            <div className="relative h-full bg-[#080c14]/80 backdrop-blur-xl border border-white/10 rounded-[1.9rem] p-10 flex flex-col items-center justify-center gap-6 overflow-hidden hover:border-green-500/50 transition-colors">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                                    <div className="w-16 h-16">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Database</h3>
                                    <p className="text-slate-400 text-sm">SQL & Data Modeling</p>
                                </div>
                                <div className="mt-4 px-6 py-2 rounded-full border border-green-500/30 text-green-400 text-sm font-bold tracking-widest uppercase group-hover:bg-green-500 group-hover:text-white transition-all">
                                    Select Database
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Confirmation Modal Overlay */}
                {showConfirmSpecialization && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[#0b101b] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden animate-scale-up">
                            {/* Glow effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                            <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Confirm Selection</h3>
                            <div className="text-slate-300 mb-8 relative z-10">
                                Are you sure you want to select
                                <div className="text-brand-blue font-bold text-xl my-2">{pendingSpecialization}</div>
                                <span className="text-xs text-slate-500">This choice cannot be changed later.</span>
                            </div>

                            <div className="flex gap-4 justify-center relative z-10">
                                <button
                                    onClick={cancelSpecialization}
                                    className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSpecialization}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 transition-all"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }


    // Helper function to get section display name and color
    const getSectionInfo = (question) => {
        if (question.section === 'elective') {
            return {
                name: question.subsection === 'java' ? 'Java' : question.subsection === 'python' ? 'Python' : question.subsection === 'javascript' ? 'JavaScript' : 'Database',
                color: 'purple',
                bgClass: 'bg-purple-500/10',
                borderClass: 'border-purple-500/20',
                textClass: 'text-purple-400'
            };
        }

        // General questions - determine by subsection
        switch (question.subsection) {
            case 'testing':
                return {
                    name: 'Testing',
                    color: 'blue',
                    bgClass: 'bg-blue-500/10',
                    borderClass: 'border-blue-500/20',
                    textClass: 'text-blue-400'
                };
            case 'api':
                return {
                    name: 'API',
                    color: 'cyan',
                    bgClass: 'bg-cyan-500/10',
                    borderClass: 'border-cyan-500/20',
                    textClass: 'text-cyan-400'
                };
            case 'logical':
            case 'logical_reasoning':
                return { 
                    name: 'Logical Reasoning', 
                    color: 'green', 
                    bgClass: 'bg-green-500/10', 
                    borderClass: 'border-green-500/20', 
                    textClass: 'text-green-400' 
                };
            case 'agile':
                return {
                    name: 'Agile',
                    color: 'teal',
                    bgClass: 'bg-teal-500/10',
                    borderClass: 'border-teal-500/20',
                    textClass: 'text-teal-400'
                };
            case 'cs_basics':
                return {
                    name: 'CS Basics',
                    color: 'indigo',
                    bgClass: 'bg-indigo-500/10',
                    borderClass: 'border-indigo-500/20',
                    textClass: 'text-indigo-400'
                };
            case 'grammar':
                return { 
                    name: 'Grammar', 
                    color: 'pink', 
                    bgClass: 'bg-pink-500/10', 
                    borderClass: 'border-pink-500/20', 
                    textClass: 'text-pink-400' 
                };
            case 'javascript':
                return { 
                    name: 'JavaScript', 
                    color: 'yellow', 
                    bgClass: 'bg-yellow-500/10', 
                    borderClass: 'border-yellow-500/20', 
                    textClass: 'text-yellow-400' 
                };
            default:
                return { 
                    name: 'General', 
                    color: 'slate', 
                    bgClass: 'bg-slate-500/10', 
                    borderClass: 'border-slate-500/20', 
                    textClass: 'text-slate-400' 
                };
        }
    };

    const candidateId = localStorage.getItem('candidateId') || 'ID_UNKNOWN';
    const candidateName = localStorage.getItem('candidateName') || 'CANDIDATE';

    // Generate a simple SVG watermark string
    const watermarkText = `${candidateName} - ${candidateId}`.replace(/['"]/g, '');
    // Using encodeURIComponent for the text to ensure it's valid in the data URI
    const watermarkSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='350' height='350'><text x='50%' y='50%' fill='rgba(255,255,255,0.025)' font-size='18' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45 175 175)'>${encodeURIComponent(watermarkText)}</text></svg>`;

    const currentQuestion = questions[currentIndex];
    const currentSectionInfo = currentQuestion ? getSectionInfo(currentQuestion) : null;

    // Safety check to prevent blank screen crash
    if (!currentQuestion) {
        return (
            <div className="h-full w-full bg-universe flex items-center justify-center p-4 text-white">
                <div className="text-center p-8 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                    <p className="text-xl font-bold mb-4 text-red-400">Debug Mode: No Question Loaded</p>
                    <div className="text-left space-y-2 font-mono text-sm text-slate-300 mb-6">
                        <p>Questions Count: {questions?.length ?? 'undefined'}</p>
                        <p>Current Index: {currentIndex}</p>
                        <p>Loading State: {String(loading)}</p>
                        <p>Error State: {String(error)}</p>
                        <p>Total Exams: {totalExamQuestions}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-brand-blue rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Reload Page
                    </button>
                    <button
                        onClick={() => navigate('/criteria-selection')}
                        className="block mt-4 text-sm text-slate-400 hover:text-white mx-auto"
                    >
                        Back to Selection
                    </button>
                </div>
            </div>
        );
    }

    // Secondary Safety Check: Malformed Data
    if (!currentQuestion.options || !Array.isArray(currentQuestion.options)) {
        return (
            <div className="min-h-screen w-full bg-universe flex items-center justify-center p-4 text-white">
                <div className="text-center p-8 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                    <p className="text-xl font-bold mb-4 text-amber-400">Debug Mode: Invalid Question Data</p>
                    <div className="text-left space-y-2 font-mono text-sm text-slate-300 mb-6">
                        <p>Question ID: {currentQuestion.id}</p>
                        <p>Question Text: {currentQuestion.question_text}</p>
                        <p>Options Type: {typeof currentQuestion.options}</p>
                        <p>Is Array: {String(Array.isArray(currentQuestion.options))}</p>
                    </div>
                    <button
                        onClick={() => navigate('/criteria-selection')}
                        className="px-6 py-2 bg-brand-blue rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Progress Calculation: Based on answered questions vs TOTAL EXPECTED questions
    // This prevents the 100% -> 80% drop when specialization questions are added
    const answeredCount = Object.keys(answers).length;
    const progress = totalExamQuestions > 0 ? (answeredCount / totalExamQuestions) * 100 : 0;
    const isFirstQuestion = currentIndex === 0;
    const isLastQuestion = currentIndex === questions.length - 1 && specialization; // Only last if specialization selected

    // Check if current question is answered - if so, disable back button
    const currentQuestionAnswered = answeredQuestions.has(currentQuestion?.id);

    return (
        <div className="h-screen w-full bg-universe relative overflow-hidden flex flex-col font-sans text-slate-100 selection:bg-brand-orange selection:text-white">

            {/* DYNAMIC SCREEN WATERMARK - ANTI-LEAK */}
            <div
                className="fixed inset-0 pointer-events-none z-[60]"
                style={{
                    backgroundImage: `url("${watermarkSvg}")`,
                    backgroundRepeat: 'repeat'
                }}
            />

            {/* Active Background Animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-1 opacity-20" />
                <div className="orb orb-2 opacity-20" />
                <div className="orb orb-3 opacity-20" />
                <div className="grid-texture opacity-30" />
            </div>


            {/* ===== INTEGRATED HEADER BAR ===== */}
            <header className="flex-shrink-0 relative z-40 bg-[#080c14]/85 backdrop-blur-xl border-b border-white/[0.06] shadow-lg">
                <div className="flex items-center justify-between px-3 sm:px-5 h-13 sm:h-14 gap-2 sm:gap-4">

                    {/* LEFT: Logo + Badges */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
                        <img src="/sdet-logo.png" alt="SDET" className="h-7 sm:h-8 w-auto object-contain flex-shrink-0" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {criteriaType && (
                                <span className={`hidden xs:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider whitespace-nowrap
                                    ${criteriaType === 'Fresher'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }`}>
                                    {criteriaType}
                                </span>
                            )}
                            {currentSectionInfo && (
                                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${currentSectionInfo.bgClass} ${currentSectionInfo.borderClass} ${currentSectionInfo.textClass}`}>
                                    {currentSectionInfo.name}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* CENTER: Progress */}
                    <div className="flex-1 max-w-xs hidden md:block">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            <span>Progress</span>
                            <span className="text-brand-blue">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-brand-blue to-purple-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Timer + Answered + Badge */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className={`flex items-center gap-1.5 ${(!timeRemaining || timeRemaining < 60) ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-sm tabular-nums">
                                {timeRemaining !== null
                                    ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
                                    : '--:--'}
                            </span>
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-white/10" />
                        <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-bold text-sm">{answeredCount}</span>
                            <span className="text-slate-500 text-xs">/ {questions.length}</span>
                        </div>
                        <div className="hidden lg:block">
                            <GPTWBadge size="sm" />
                        </div>
                    </div>
                </div>
                {/* Mobile progress bar */}
                <div className="md:hidden h-0.5 bg-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-brand-blue transition-all duration-700"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            </header>

            {/* ===== SCROLLABLE QUESTION CONTENT ===== */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
                <div className="flex flex-col px-3 sm:px-5 lg:px-8 py-3 sm:py-4 gap-3 max-w-4xl w-full mx-auto min-h-full">

                    {/* Question Card */}
                    <div
                        className="flex-1 bg-[#0b101b]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden select-none"
                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-blue/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-orange/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

                        <div className="relative z-10 p-4 sm:p-6">

                            {/* Question header */}
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="text-sm font-bold bg-gradient-to-br from-cyan-400 to-brand-blue bg-clip-text text-transparent">
                                        {String(currentIndex + 1).padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center pt-1.5">
                                    {currentQuestion.category && (
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                                            {currentQuestion.category}
                                        </span>
                                    )}
                                    {criteriaType && (
                                        <span className={`sm:hidden px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider
                                            ${criteriaType === 'Fresher'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {criteriaType}
                                        </span>
                                    )}
                                    {currentSectionInfo && (
                                        <span className={`sm:hidden px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${currentSectionInfo.bgClass} ${currentSectionInfo.borderClass} ${currentSectionInfo.textClass}`}>
                                            {currentSectionInfo.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="text-lg sm:text-xl font-bold text-white leading-relaxed mb-5 pl-0 sm:pl-12">
                                <FormattedQuestionText text={currentQuestion.question_text} />
                            </div>

                            {/* Options */}
                            <div className="space-y-2 sm:pl-12">
                                {currentQuestion.options?.map((option, idx) => {
                                    const isSelected = answers[currentQuestion.id] === option;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                            disabled={submitting || timeRemaining === 0}
                                            className={`
                                                w-full text-left p-3 rounded-xl border transition-all duration-200 group/option relative overflow-hidden
                                                ${isSelected
                                                    ? 'bg-brand-blue/12 border-brand-blue shadow-[0_0_12px_rgba(0,119,255,0.12)]'
                                                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/20'
                                                }
                                                ${(submitting || timeRemaining === 0) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                            `}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-r from-brand-blue/8 to-transparent transition-opacity duration-200 rounded-xl ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200
                                                    ${isSelected
                                                        ? 'border-brand-blue bg-brand-blue shadow-md shadow-brand-blue/30 scale-110'
                                                        : 'border-slate-600 group-hover/option:border-slate-400'
                                                    }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full bg-white transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                                                </div>
                                                <span className={`text-sm sm:text-base font-medium transition-colors duration-200 ${isSelected ? 'text-white' : 'text-slate-300 group-hover/option:text-white'}`}>
                                                    {option}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className={`flex-shrink-0 flex items-center pb-2 ${isFirstQuestion ? 'justify-end' : 'justify-between'}`}>
                        {!isFirstQuestion && (
                            <button
                                onClick={handlePrevious}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm text-slate-400 hover:text-white hover:bg-white/5"
                            >
                                <div className="p-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                                <span className="hidden sm:inline">Previous</span>
                            </button>
                        )}

                        {!isLastQuestion ? (
                            <button
                                onClick={handleNext}
                                className="group relative overflow-hidden rounded-xl py-2.5 px-7 bg-white text-slate-900 font-bold shadow-lg transition-all transform hover:-translate-y-0.5 text-sm"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <span className="relative z-10 flex items-center gap-2">
                                    Next Question
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className={`group relative overflow-hidden rounded-xl py-2.5 px-8 font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 text-sm
                                    ${submitting
                                        ? 'bg-slate-700 cursor-wait'
                                        : 'bg-gradient-to-r from-brand-orange to-red-500 shadow-brand-orange/20 hover:shadow-brand-orange/40'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="relative z-10 flex items-center gap-2">
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
                                    ) : (
                                        <>Finish Assessment<CheckCircle2 className="w-4 h-4" /></>
                                    )}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== PINNED BOTTOM: ASSESSMENT MAP ===== */}
            <div className="flex-shrink-0 relative z-20 bg-[#080c14]/90 backdrop-blur-xl border-t border-white/[0.06] px-3 sm:px-5 py-3 pb-8">
                <div className="max-w-4xl mx-auto">
                    <QuestionStatusMap
                        questions={questions}
                        answers={answers}
                        currentIndex={currentIndex}
                        onQuestionSelect={handleMapQuestionSelect}
                        visitedQuestions={visitedQuestions}
                    />
                </div>
            </div>


            {/* PREMIUM: QUANTUM SECURITY GATE OVERLAY */}
            {enforceFullScreen && !isActuallyFullscreen && !loading && !submitting && !showSpecialization && (
                <div className="fixed inset-0 z-[100000] bg-[#020617] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Immersive Animated Background */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-[#020617]"></div>
                        {/* Moving Digital Grid */}
                        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-grid-pan"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]"></div>
                        
                        {/* Kinetic Energy Orbs */}
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-blue/30 rounded-full blur-[160px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '-2s' }}></div>
                    </div>

                    <div className="relative z-10 max-w-xl w-full translate-y-[-5%] sm:translate-y-0">
                        {/* The Gate Frame */}
                        <div className="relative bg-[#0b1221]/85 backdrop-blur-[40px] border border-white/10 rounded-[1.5rem] p-4 sm:p-6 shadow-[0_0_100px_rgba(0,0,0,0.8)] group premium-border-glow">
                            {/* Scanning Effect Overlay */}
                            <div className="scan-line"></div>
                            
                            {/* Inner Accent Light */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-3xl rounded-full"></div>

                            <div className="text-center space-y-3 sm:space-y-4">
                                {/* Header / Status */}
                                <div className="space-y-0.5 sm:space-y-1">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-0.5 w-3 bg-brand-blue rounded-full animate-pulse"></div>
                                        <span className="text-[7px] sm:text-[8px] font-black tracking-[0.3em] text-brand-blue uppercase">Secure Mode v4.0</span>
                                        <div className="h-0.5 w-3 bg-brand-blue rounded-full animate-pulse"></div>
                                    </div>
                                    
                                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none italic uppercase">
                                        Quantum <span className="text-brand-blue not-italic shimmer-text">Gate</span>
                                    </h2>
                                </div>

                                {/* Security Metrics */}
                                <div className="flex items-center justify-around py-3 border-y border-white/5 mx-auto max-w-md">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                                        <div className="text-left">
                                            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider leading-none">Scan</p>
                                            <p className="text-[9px] text-white font-black leading-none">OK</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-brand-blue" />
                                        <div className="text-left">
                                            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider leading-none">Env</p>
                                            <p className="text-[9px] text-white font-black leading-none">LOCK</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                        <div className="text-left">
                                            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider leading-none">Data</p>
                                            <p className="text-[9px] text-white font-black leading-none">SEC</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 sm:space-y-3 max-w-lg mx-auto">
                                    <p className="text-sm sm:text-base text-slate-200 font-bold leading-tight">
                                        Site operates in <span className="text-brand-blue uppercase tracking-widest px-1.5 py-0.5 bg-brand-blue/10 rounded border border-brand-blue/20">Full-Screen</span> mode. 
                                    </p>
                                    
                                    <div className="bg-black/20 p-2 sm:p-3 rounded-[0.75rem] border border-white/5">
                                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-none">
                                            Tab switching is a <span className="text-red-400 font-bold italic">Security Strike</span>. 
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={enterFullscreen}
                                        className="group relative w-full px-6 py-3.5 sm:px-10 sm:py-4 bg-white hover:bg-brand-blue text-[#020617] hover:text-white font-black text-base sm:text-lg rounded-[1rem] transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 overflow-hidden"
                                    >
                                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
                                        ENTER SECURE ENVIRONMENT
                                    </button>
                                </div>

                                <p className="text-[8px] text-slate-600 font-black tracking-[0.3em] uppercase opacity-50">
                                    Encrypted Assessment Session
                                </p>
                            </div>
                        </div>

                        
                        {/* Cinematic Footer Elements */}
                        <div className="mt-12 flex items-center justify-between px-10">
                            <div className="flex gap-1.5">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-blue transition-all duration-1000 animate-pulse" style={{ width: '40%', animationDelay: `${i * 0.2}s` }}></div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold tracking-[0.3em] uppercase opacity-40">
                                Auth Type: Dynamic Biometric (Fingerprint)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <QuizSubmissionModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onReview={handleReview}
                onConfirm={() => {
                    setShowSubmitModal(false);
                    handleSubmit(true, 'manual_confirm'); // Treat as auto-submit to bypass checks, but with reason
                }}
                questions={questions}
                answers={answers}
                totalExpectedQuestions={totalExamQuestions > 0 ? totalExamQuestions : questions.length}
            />

            {/* Proctor Violation Modal */}
            {showProctorWarning && (
                <div className="fixed inset-0 z-[99999] bg-[#0b101b] flex items-center justify-center p-4 h-screen w-screen overflow-hidden">
                    <div className="bg-[#0b101b] border border-red-500/30 rounded-2xl max-w-md w-full p-8 shadow-2xl shadow-red-500/20 text-center relative overflow-hidden">
                        {/* Dramatic Red Scanline effect */}
                        <div className="absolute inset-0 bg-red-500/5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50 pointer-events-none"></div>
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scanline_3s_linear_infinite] pointer-events-none"></div>

                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">SECURITY WARNING</h2>

                        <div className={`mb-4 inline-block px-4 py-1.5 font-bold rounded-full border ${tabSwitchWarnings >= MAX_WARNINGS ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            {tabSwitchWarnings >= MAX_WARNINGS ? 'LIMIT REACHED' : `STRIKE ${tabSwitchWarnings} OF ${MAX_WARNINGS}`}
                        </div>

                        <p className="text-slate-300 mb-6 leading-relaxed font-medium">
                            {tabSwitchWarnings >= MAX_WARNINGS ? (
                                <span className="text-red-400 font-black text-xl">
                                    MAXIMUM VIOLATIONS REACHED. 
                                    <br />
                                    Your assessment is being terminated.
                                </span>
                            ) : (
                                <>
                                    You have attempted to leave the secure fullscreen environment or switch tabs. This is a strict violation of exam rules.
                                    <br /><br />
                                    <span className="text-red-400 font-bold text-lg block mb-1">Return to the exam immediately.</span>
                                </>
                            )}
                            <br /><br />
                            {proctoringStrict ? (
                                <>Auto-submitting in <span className="text-white text-2xl font-black">{proctorCountdown}</span> seconds...</>
                            ) : (
                                <span className="text-emerald-400">Security check in progress. Please resume to continue.</span>
                            )}
                        </p>

                        <div className="flex flex-col gap-4 relative z-10">
                            <button
                                onClick={() => {
                                    if (tabSwitchWarnings >= MAX_WARNINGS) return; // Extra safety
                                    setShowProctorWarning(false);
                                    enterFullscreen();
                                }}
                                disabled={tabSwitchWarnings >= MAX_WARNINGS}
                                className={`w-full py-4 text-white font-bold rounded-xl transition-all transform ${
                                    tabSwitchWarnings >= MAX_WARNINGS 
                                    ? 'bg-slate-800 cursor-not-allowed grayscale' 
                                    : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:-translate-y-1'
                                }`}
                            >
                                {tabSwitchWarnings >= MAX_WARNINGS ? 'SUBMITTING...' : 'RESUME EXAM (Accept Warning)'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowProctorWarning(false);
                                    handleSubmit(true, 'proctor_quit');
                                }}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold rounded-xl transition-all border border-white/10"
                            >
                                Quit & Submit Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
