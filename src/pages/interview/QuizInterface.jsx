import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import GPTWBadge from '@/components/GPTWBadge';
import { Loader2, ArrowRight, ArrowLeft, Clock, CheckCircle2, Circle, AlertCircle, Code, Sparkles, ShieldAlert } from 'lucide-react';
import { accessControl } from '@/lib/accessControl';
import QuizSubmissionModal from '@/components/QuizSubmissionModal';
import QuestionStatusMap from '@/components/QuestionStatusMap';
import FormattedQuestionText from '@/components/FormattedQuestionText';
import { shuffleArray } from '@/utils/questionHelpers';

export default function QuizInterface() {
    const navigate = useNavigate();
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
    const [proctorCountdown, setProctorCountdown] = useState(10);
    const [allowScreenshots, setAllowScreenshots] = useState(false); // Default to secure
    const MAX_WARNINGS = 3;

    // Refs to hold cached questions needed for the second phase
    const generalQuestionsRef = useRef([]);
    const javaQuestionsRef = useRef([]);
    const pythonQuestionsRef = useRef([]);
    const lastWarningTimeRef = useRef(0); // For debouncing tab switches

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

                fetchQuestions(criteriaId, savedState.timeRemaining);
                return; // fetchQuestions will handle the rest
            } catch (err) {
                console.error('[INIT] Failed to parse saved state:', err);
                localStorage.removeItem(storageKey); // Clear corrupted state
            }
        }

        fetchQuestions(criteriaId, null);
    }, [navigate]);

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
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    // handleSubmit(true); // Auto-submit when time runs out (DISABLED FOR TESTING)
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, submitting]);

    // --- PROCTORING SHIELD ---

    // Force Fullscreen API Helper
    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => { });
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    };

    // 1. Strict Compliance Loop (Interval Fallback for Split-Screen)
    useEffect(() => {
        if (submitting || showSpecialization || loading) return;

        const complianceCheck = setInterval(() => {
            let violation = false;

            // Check 1: Must be in Fullscreen (prevents split-screen entirely)
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            if (!isFullscreen) {
                violation = true;
            }

            // Check 2: Must have focus
            if (!document.hasFocus() || document.hidden) {
                violation = true;
            }

            // If a violation is caught and the modal isn't showing yet, trigger the strike system
            if (violation && !showProctorWarning) {
                if (tabSwitchWarnings >= MAX_WARNINGS - 1) { // -1 because this IS the final strike
                    console.log('[PROCTOR] Max strikes reached. Auto-submitting.');
                    showToast.error("Exam Auto-Submitted due to maximum security violations (3/3).");
                    handleSubmit(true, 'proctor_max_strikes');
                } else {
                    console.log('[PROCTOR] Violation detected. Triggering security modal countdown.');
                    setProctorCountdown(10); // Reset timer
                    setShowProctorWarning(true);
                }
            }
        }, 1000);

        return () => clearInterval(complianceCheck);
    }, [submitting, showSpecialization, showProctorWarning, loading, tabSwitchWarnings]);

    // 1.b. Countdown Timer for Proctor Warning
    useEffect(() => {
        let timer;
        if (showProctorWarning && proctorCountdown > 0 && !submitting) {
            timer = setInterval(() => {
                setProctorCountdown(prev => prev - 1);
            }, 1000);
        } else if (showProctorWarning && proctorCountdown <= 0 && !submitting) {
            console.log('[PROCTOR] Countdown expired. Auto-submitting.');
            showToast.error("Exam Auto-Submitted due to prolonged absence from the secure environment.");
            handleSubmit(true, 'proctor_timeout');
        }
        return () => clearInterval(timer);
    }, [showProctorWarning, proctorCountdown, submitting]);

    // 2. Instant Event Listeners (For instantaneous reaction)
    useEffect(() => {
        if (submitting || showSpecialization) return;

        const handleFocusLoss = () => {
            if (document.hidden || !document.hasFocus()) {
                if (!showProctorWarning) {
                    if (tabSwitchWarnings >= MAX_WARNINGS - 1) {
                        showToast.error("Exam Auto-Submitted due to maximum security violations (3/3).");
                        handleSubmit(true, 'proctor_max_strikes');
                    } else {
                        console.log('[PROCTOR] Focus lost/tab switched. Triggering security modal.');
                        setProctorCountdown(10);
                        setShowProctorWarning(true);
                    }
                }
            }
        };

        const handleFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            if (!isFullscreen && !showProctorWarning) {
                if (tabSwitchWarnings >= MAX_WARNINGS - 1) {
                    showToast.error("Exam Auto-Submitted due to maximum security violations (3/3).");
                    handleSubmit(true, 'proctor_max_strikes');
                } else {
                    console.log('[PROCTOR] Exam exited fullscreen. Triggering security modal.');
                    setProctorCountdown(10);
                    setShowProctorWarning(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleFocusLoss);
        window.addEventListener('blur', handleFocusLoss);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleFocusLoss);
            window.removeEventListener('blur', handleFocusLoss);

            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [submitting, showSpecialization, showProctorWarning, tabSwitchWarnings]);

    // 2.b DevTools Honeypot Detection (Time-based debugger trap)
    useEffect(() => {
        if (submitting || showSpecialization) return;

        const devToolsCheck = setInterval(() => {
            const start = performance.now();
            // The debugger statement forces the browser to pause execution IF DevTools is open.
            // If it is closed, this statement is ignored by the engine and takes 0ms.
            debugger;
            const end = performance.now();

            // If execution was paused for >100ms, DevTools is open.
            if (end - start > 100) {
                console.warn('[PROCTOR] DevTools/Inspect Element detected!');
                if (!showProctorWarning) {
                    if (tabSwitchWarnings >= MAX_WARNINGS - 1) {
                        showToast.error("Exam Auto-Submitted due to prohibited Developer Tools usage.");
                        handleSubmit(true, 'proctor_devtools_max_strikes');
                    } else {
                        setProctorCountdown(10);
                        setShowProctorWarning(true);
                    }
                }
            }
        }, 1500);

        return () => clearInterval(devToolsCheck);
    }, [submitting, showSpecialization, showProctorWarning, tabSwitchWarnings]);

    // 3. Content Protection (Disable Right-click, Copy, Paste, Keyboard)
    useEffect(() => {
        const preventAction = (e) => {
            e.preventDefault();
            // Optional: showToast.error("Action disabled during assessment."); 
            // Commenting out toast to avoid spamming if user persists
        };

        const preventKeyboard = (e) => {
            // Check for screenshot attempts if not explicitly allowed
            if (!allowScreenshots && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) {
                console.warn('[PROCTOR] Screenshot attempt detected!');
                e.preventDefault();
                e.stopPropagation();

                // Attempt to clear clipboard aggressively 
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('Screenshots are strictly prohibited during this exam.').catch(err => console.log('Clipboard clear failed', err));
                }

                // Trigger Proctor Strike
                if (!showProctorWarning) {
                    if (tabSwitchWarnings >= MAX_WARNINGS - 1) {
                        showToast.error("Exam Auto-Submitted due to prohibited Screen Capture attempt.");
                        handleSubmit(true, 'proctor_screenshot_strike');
                    } else {
                        setProctorCountdown(10);
                        setShowProctorWarning(true);
                    }
                }
                return false;
            }

            // Block other known cheating shortcuts, but otherwise let typing happen naturally (e.g. if there were text inputs)
            // Actually, since this is a multiple choice quiz, we can block almost everything except navigation, 
            // but we need to be careful not to break accessibility or standard browser function if not needed.
            // Existing logic blocked ALL keys which is extremely aggressive. Let's keep it but enhance it.

            // Allow basic navigation (Tab, Enter, Space, Arrows) if needed for accessibility, 
            // but to be safe and true to original code, we block by default unless it's a known safe key.
            const allowedKeys = ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        document.addEventListener('contextmenu', preventAction);
        document.addEventListener('copy', preventAction);
        document.addEventListener('paste', preventAction);
        document.addEventListener('cut', preventAction);
        document.addEventListener('selectstart', preventAction);
        document.addEventListener('keydown', preventKeyboard, true);
        document.addEventListener('keyup', preventKeyboard, true);
        document.addEventListener('keypress', preventKeyboard, true);

        return () => {
            document.removeEventListener('contextmenu', preventAction);
            document.removeEventListener('copy', preventAction);
            document.removeEventListener('paste', preventAction);
            document.removeEventListener('cut', preventAction);
            document.removeEventListener('selectstart', preventAction);
            document.removeEventListener('keydown', preventKeyboard, true);
            document.removeEventListener('keyup', preventKeyboard, true);
            document.removeEventListener('keypress', preventKeyboard, true);
        };
    }, [allowScreenshots, showProctorWarning, tabSwitchWarnings]);

    // 4. Block Browser Back Navigation & Refresh
    useEffect(() => {
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
    }, [submitting]);

    const fetchQuestions = async (criteriaId, savedTimeRemaining = null) => {
        try {
            // Get interviewId from session storage
            const interviewId = localStorage.getItem('interviewId');

            // Get exam configuration from session (set by ExamSetup.jsx)
            const examConfigStr = localStorage.getItem('examConfig');
            const examConfig = examConfigStr ? JSON.parse(examConfigStr) : null;

            const selectedSet = examConfig?.set || localStorage.getItem('selectedSet');
            const selectedSubject = examConfig?.subject; // e.g., 'java', 'python'

            // Fetch Site Settings for Security (Screenshots)
            const { data: siteSettings } = await supabase
                .from('site_settings')
                .select('allow_screenshots')
                .single();

            if (siteSettings) {
                setAllowScreenshots(siteSettings.allow_screenshots || false);
            }

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

            // Categorize Questions by NEW structure: section + subsection
            // General/Aptitude: Must match selected Set if applicable
            const generalQs = data.filter(q => {
                const isGeneral = q.section === 'general' || !q.section;
                const matchesSet = selectedSet ? q.category === selectedSet : true;
                return isGeneral && matchesSet;
            });

            const electiveQs = data.filter(q => {
                const isElective = q.section === 'elective';
                const matchesSet = selectedSet ? q.category === selectedSet : true;
                return isElective && matchesSet;
            });

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

            // Organize general questions by subsection (5-section structure)
            // This ensures questions appear in the same order as the admin panel
            const computerScienceQs = generalQs.filter(q => q.subsection === 'computer_science');
            const logicalReasoningQs = generalQs.filter(q => q.subsection === 'logical_reasoning');
            const miscellaneousQs = generalQs.filter(q => q.subsection === 'miscellaneous');
            const grammarQs = generalQs.filter(q => q.subsection === 'grammar');

            console.log('[FETCH] Computer Science questions:', computerScienceQs.length);
            console.log('[FETCH] Logical Reasoning questions:', logicalReasoningQs.length);
            console.log('[FETCH] Miscellaneous Logic questions:', miscellaneousQs.length);
            console.log('[FETCH] Grammar questions:', grammarQs.length);

            // Combine in order: Computer Science → Logical Reasoning → Miscellaneous → Grammar
            // This matches the 5-section structure in the admin panel
            const orderedGeneralQs = [
                ...computerScienceQs,
                ...logicalReasoningQs,
                ...miscellaneousQs,
                ...grammarQs
            ];

            // Store in refs - Take first 23 general questions (in subsection order)
            generalQuestionsRef.current = orderedGeneralQs.slice(0, 23);
            console.log('[FETCH] Stored general questions (ordered by subsection):', generalQuestionsRef.current.length);

            // For backward compatibility with old specialization flow, store by subject
            // But now we use the selected subject directly
            if (selectedSubject) {
                // Store selected elective questions (take top 7)
                if (selectedSubject === 'java') {
                    javaQuestionsRef.current = selectedElectiveQs.slice(0, 7);
                } else if (selectedSubject === 'python') {
                    pythonQuestionsRef.current = selectedElectiveQs.slice(0, 7);
                }
                // Auto-set specialization since user already chose in ExamSetup
                setSpecialization(selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1));
            } else {
                // Fallback: if no exam config, populate both for old flow
                javaQuestionsRef.current = electiveQs.filter(q => q.subsection === 'java').slice(0, 7);
                pythonQuestionsRef.current = electiveQs.filter(q => q.subsection === 'python').slice(0, 7);
            }


            // Calculate EXPECTED total questions (General + Elective)
            // We know we take 23 general and 7 elective
            const expectedTotal = generalQuestionsRef.current.length + 7;
            setTotalExamQuestions(expectedTotal);

            // NEW: Load ALL 30 questions upfront (23 general + 7 elective)
            // This ensures the question map shows all questions from the start with a visual separator
            let electiveQuestionsToShow = [];

            if (selectedSubject) {
                // Use the selected subject's questions
                electiveQuestionsToShow = selectedSubject === 'java'
                    ? (javaQuestionsRef.current || [])
                    : (pythonQuestionsRef.current || []);
            } else {
                // Default to Java if no selection yet, but ensure it's an array
                electiveQuestionsToShow = javaQuestionsRef.current || [];
            }

            // Safety check: ensure we have valid arrays
            if (!Array.isArray(electiveQuestionsToShow)) {
                console.error('[FETCH ERROR] Elective questions is not an array:', electiveQuestionsToShow);
                electiveQuestionsToShow = [];
            }

            const rawAllQuestions = [...generalQuestionsRef.current, ...electiveQuestionsToShow];

            // Security Enhancement: True Randomization of Test
            // 1. Shuffle the options within each question (A/B/C/D order randomized)
            const questionsWithOptionsShuffled = rawAllQuestions.map(q => {
                if (q.options && Array.isArray(q.options)) {
                    return { ...q, options: shuffleArray(q.options) };
                }
                return q;
            });

            // 2. Shuffle the entire question order
            const finalShuffledQuestions = shuffleArray(questionsWithOptionsShuffled);

            setQuestions(finalShuffledQuestions);

            console.log('[FETCH] Loaded all questions upfront (Shuffled):', finalShuffledQuestions.length);
            console.log('[FETCH] General questions:', generalQuestionsRef.current.length);
            console.log('[FETCH] Elective questions:', electiveQuestionsToShow.length);

            // Note: Questions are already loaded upfront, no need to append elective questions later

            // If total general < 12, we might have an issue, but we proceed with what we have
            if (generalQuestionsRef.current.length < 1) {
                setError('Insufficient general questions configured.');
            }

            // Check for scheduled interview for today
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            console.log('[TIMER] Checking for scheduled interview on:', today);
            const { data: scheduledInterview, error: scheduleError } = await supabase
                .from('scheduled_interviews')
                .select('id, time_limit_minutes')
                .eq('criteria_id', criteriaId)
                .eq('scheduled_date', today)
                .eq('is_active', true)
                .maybeSingle(); // Use maybeSingle() to avoid errors when no scheduled interview

            if (scheduleError) {
                console.error('[TIMER ERROR] Failed to fetch scheduled interview:', scheduleError);
            } else if (scheduledInterview) {
                console.log('[TIMER] Found scheduled interview:', scheduledInterview);
            } else {
                console.log('[TIMER] No scheduled interview found for today');
            }

            let timeLimitMinutes = null;
            let scheduledInterviewId = null;

            // ALWAYS fetch criteria timer FIRST (this is what admin sets)
            const { data: criteriaData, error: criteriaError } = await supabase
                .from('criteria')
                .select('timer_duration, name')
                .eq('id', criteriaId)
                .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no row found

            console.log('[TIMER] Criteria data:', criteriaData);
            console.log('[TIMER] Criteria error:', criteriaError);

            if (criteriaError) {
                console.error('[TIMER ERROR] Failed to fetch criteria:', criteriaError);
            }

            // Use criteria timer if available
            if (criteriaData && criteriaData.timer_duration) {
                timeLimitMinutes = criteriaData.timer_duration;
                console.log('[TIMER] Using criteria timer from admin:', timeLimitMinutes, 'minutes');
                setCriteriaType(criteriaData.name || '');
            } else {
                console.warn('[TIMER] No criteria timer found, will use default or scheduled timer');
            }

            // Override with scheduled interview timer if exists
            if (!scheduleError && scheduledInterview) {
                scheduledInterviewId = scheduledInterview.id;
                if (scheduledInterview.time_limit_minutes) {
                    timeLimitMinutes = scheduledInterview.time_limit_minutes;
                    console.log('[TIMER] Overriding with scheduled timer:', timeLimitMinutes, 'minutes');
                }
            }
            // Universal Update: Ensure question_set and time_limit are ALWAYS saved

            if (interviewId) {
                console.log('[SETUP] Updating interview:', { interviewId, timeLimitMinutes, selectedSet });
                await supabase
                    .from('interviews')
                    .update({
                        scheduled_interview_id: scheduledInterviewId,
                        time_limit_minutes: timeLimitMinutes,
                        question_set: selectedSet || null
                    })
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
        // ID of the last general question (usually index 11 if we have 12)
        const isEndOfGeneral = currentIndex === generalQuestionsRef.current.length - 1;

        if (isEndOfGeneral && !specialization) {
            // Trigger Specialization Selection
            setShowSpecialization(true);
        } else if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSpecializationSelect = (type) => { // 'Java' or 'Python'
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
        // Since we loaded 30 questions upfront (defaulting to Java), we need to replace the last 7
        // if the user selected a different language (or just re-confirm if same)
        const newElectiveQuestions = type === 'Java' ? javaQuestionsRef.current : pythonQuestionsRef.current;

        setQuestions(prevQuestions => {
            // Keep general questions (first 23) and append the selected elective questions
            // precise slice based on generalQuestionsRef length to be safe
            const generalQs = prevQuestions.slice(0, generalQuestionsRef.current.length);
            return [...generalQs, ...newElectiveQuestions];
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
            const questionSet = localStorage.getItem('selectedSet') ||
                JSON.parse(localStorage.getItem('examConfig') || '{}')?.set;

            const updatePayload = {
                status: 'completed',
                completed_at: new Date().toISOString(),
                score: correctCount,
                total_questions: totalQuestions,
                percentage: percentage,
                passed: passed,
                device_id: deviceId // Ensure device_id is recorded on submission for reattempt check
            };

            if (questionSet) updatePayload.question_set = questionSet;
            if (autoSubmit) updatePayload.metadata = { auto_submitted: true, reason: reason };

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
            setError(err.message || 'Connection lost. We could not save your answers.');
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

                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
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
                name: question.subsection === 'java' ? 'Java' : 'Python',
                color: 'purple',
                bgClass: 'bg-purple-500/10',
                borderClass: 'border-purple-500/20',
                textClass: 'text-purple-400'
            };
        }

        // General questions - determine by subsection
        switch (question.subsection) {
            case 'computer_science':
                // Show "Software Testing" for Experienced, "Computer Science" for Fresher
                return {
                    name: criteriaType === 'Experienced' ? 'Software Testing' : 'Computer Science',
                    color: 'blue',
                    bgClass: 'bg-blue-500/10',
                    borderClass: 'border-blue-500/20',
                    textClass: 'text-blue-400'
                };
            case 'logical_reasoning':
                return { name: 'Logical Reasoning', color: 'green', bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-400' };
            case 'miscellaneous':
                return { name: 'Miscellaneous Logic', color: 'yellow', bgClass: 'bg-yellow-500/10', borderClass: 'border-yellow-500/20', textClass: 'text-yellow-400' };
            case 'grammar':
                return { name: 'Grammar', color: 'pink', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/20', textClass: 'text-pink-400' };
            default:
                return { name: 'General', color: 'slate', bgClass: 'bg-slate-500/10', borderClass: 'border-slate-500/20', textClass: 'text-slate-400' };
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
                <div className="orb orb-1 opacity-20"></div>
                <div className="orb orb-2 opacity-20"></div>
                <div className="orb orb-3 opacity-20"></div>
                <div className="grid-texture opacity-30"></div>
            </div>


            {/* Top Left - SDET Logo - Compact & Non-overlapping */}
            <div className="fixed top-2 left-2 z-50 animate-hero hidden md:block">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg shadow-xl hover:border-brand-blue/50 transition-all duration-300 hover:scale-105 group">
                    <img src="/sdet-logo.png" alt="SDET Logo" className="h-10 w-auto object-contain" />
                </div>
            </div>

            {/* Bottom Right - GPTW Badge - Moderate Size */}
            <div className="fixed bottom-4 right-4 z-50 animate-hero-delay-1 hidden md:block">
                <div className="hover:scale-105 transition-transform duration-300 drop-shadow-xl">
                    <GPTWBadge size="lg" />
                </div>
            </div>


            {/* Header Bar - Floating Glass Pill (Top Right) */}
            <div className="fixed top-4 right-4 z-40 flex justify-end pointer-events-none">
                <div className="bg-[#0b101b]/90 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 shadow-2xl flex items-center gap-5 pointer-events-auto hover:border-brand-blue/30 transition-colors">

                    {/* Current Section Badge - NEW */}
                    {currentSectionInfo && (
                        <>
                            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${currentSectionInfo.bgClass} ${currentSectionInfo.textClass} border ${currentSectionInfo.borderClass} transition-colors duration-300`}>
                                <span className="opacity-70">SECTION:</span>
                                <span>{currentSectionInfo.name}</span>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block h-6 w-[1px] bg-white/10"></div>
                        </>
                    )}

                    {/* Progress Section */}
                    <div className="flex flex-col gap-1 min-w-[140px] sm:min-w-[200px]">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Progress</span>
                            <span className="text-brand-blue">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-brand-blue/10"></div>
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-brand-blue to-purple-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(34,211,238,0.6)] relative"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 blur-[1px]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-[1px] bg-white/10"></div>

                    {/* Stats Pills - Integrated */}
                    <div className="flex items-center gap-3">
                        {/* Timer - Always Visible */}
                        <div className={`flex items-center gap-1.5 ${(!timeRemaining || timeRemaining < 60) ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-sm tabular-nums">
                                {timeRemaining !== null ? (
                                    `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
                                ) : (
                                    '--:--'
                                )}
                            </span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-bold text-sm">{answeredCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Flex Wrapper (No Outer Scroll) */}
            <div className="flex-1 w-full flex flex-col items-center overflow-hidden p-3 sm:p-6 lg:p-8 pt-16 sm:pt-20 relative z-10">
                <div className={`w-[90%] max-w-6xl flex-1 min-h-0 transition-all duration-700 flex flex-col gap-4 sm:gap-6 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                    {/* Question Card - Premium Glassmorphism (Flex-1 to fill space, internally scrollable) */}
                    <div className="flex-1 min-h-0 flex flex-col bg-[#0b101b]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">

                        {/* Ambient Background Glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent opacity-50"></div>

                        {/* Inner Scrollable Area for Card Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-4 sm:space-y-6">

                            {/* Question Text Area */}
                            <div>
                                <div className="flex items-start gap-4">
                                    {/* Question Number Box */}
                                    <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-white font-bold text-base shadow-lg">
                                        <span className="bg-gradient-to-br from-cyan-400 to-brand-blue bg-clip-text text-transparent">
                                            {String(currentIndex + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <div className="space-y-3 w-full">
                                        {/* Badges & Metadata */}
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {/* Category Chip */}
                                            {currentQuestion.category && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                                                    {currentQuestion.category}
                                                </div>
                                            )}

                                            {/* Set Type Chip (Fresher/Experience) */}
                                            {criteriaType && (
                                                <div className={`
                                                flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase
                                                ${criteriaType === 'Fresher'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                                            `}>
                                                    <Sparkles className="w-3 h-3" />
                                                    {criteriaType} Set
                                                </div>
                                            )}

                                            {/* Section Name Chip - NEW */}
                                            {currentSectionInfo && (
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase ${currentSectionInfo.bgClass} ${currentSectionInfo.borderClass} ${currentSectionInfo.textClass}`}>
                                                    <Code className="w-3 h-3" />
                                                    {currentSectionInfo.name}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xl sm:text-2xl font-bold text-white leading-relaxed tracking-tight drop-shadow-sm">
                                            <FormattedQuestionText text={currentQuestion.question_text} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Answer Options - Animated List */}
                            <div className="space-y-2 sm:space-y-3 relative z-10">
                                {currentQuestion.options?.map((option, idx) => {
                                    const isSelected = answers[currentQuestion.id] === option;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                            disabled={submitting || timeRemaining === 0}
                                            className={`
                                            w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-300 group/option relative overflow-hidden
                                            ${isSelected
                                                    ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_15px_rgba(0,119,255,0.2)] translate-x-1'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:translate-x-1'
                                                }
                                            ${(submitting || timeRemaining === 0) ? 'cursor-not-allowed' : ''}
                                        `}
                                        >
                                            {/* Selection Gradient Background */}
                                            <div className={`absolute inset-0 bg-gradient-to-r from-brand-blue/10 to-transparent transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`}></div>

                                            <div className="flex items-center gap-4 relative z-10">
                                                {/* Custom Radio Indicator */}
                                                <div className={`
                                                w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-300
                                                ${isSelected
                                                        ? 'border-brand-blue bg-brand-blue scale-110 shadow-lg shadow-brand-blue/40'
                                                        : 'border-slate-600 group-hover/option:border-slate-400 bg-transparent'
                                                    }
                                            `}>
                                                    <div className={`w-2 h-2 rounded-full bg-white transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                                                </div>

                                                {/* Option Text */}
                                                <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-300 group-hover/option:text-white'
                                                    }`}>
                                                    {option}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                        </div> {/* End Inner Scrollable Area */}
                    </div>

                    {/* Navigation Actions - Premium */}
                    <div className="flex-shrink-0 flex items-center justify-between relative z-20">
                        <button
                            onClick={handlePrevious}
                            disabled={isFirstQuestion}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm group
                                ${isFirstQuestion
                                    ? 'opacity-30 pointer-events-none cursor-not-allowed'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            <span className="hidden sm:inline">
                                Back
                            </span>
                        </button>

                        {!isLastQuestion ? (
                            <button
                                onClick={handleNext}
                                className="group relative overflow-hidden rounded-xl py-2.5 px-8 bg-white text-slate-900 font-bold shadow-lg shadow-white/5 hover:shadow-cyan-400/20 transition-all transform hover:-translate-y-0.5 text-sm"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    Next Question
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className={`
                                    group relative overflow-hidden rounded-xl py-2.5 px-10 font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 text-sm
                                    ${submitting
                                        ? 'bg-slate-700 cursor-wait'
                                        : 'bg-gradient-to-r from-brand-orange to-red-500 shadow-brand-orange/20 hover:shadow-brand-orange/40'
                                    }
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Finish Assessment
                                            <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Embed Question Map for Quick Access */}
                    <div className="flex-shrink-0 px-2 sm:px-6 w-full max-w-3xl mx-auto pb-4">
                        <QuestionStatusMap
                            questions={questions}
                            answers={answers}
                            currentIndex={currentIndex}
                            onQuestionSelect={handleMapQuestionSelect}
                        />
                    </div>

                </div>
            </div>

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

                        <div className="mb-4 inline-block px-4 py-1.5 bg-red-500/20 text-red-400 font-bold rounded-full border border-red-500/30">
                            STRIKE {tabSwitchWarnings + 1} OF {MAX_WARNINGS}
                        </div>

                        <p className="text-slate-300 mb-6 leading-relaxed font-medium">
                            You have attempted to leave the secure fullscreen environment or switch tabs. This is a strict violation of exam rules.
                            <br /><br />
                            <span className="text-red-400 font-bold text-lg block mb-1">Return to the exam immediately.</span>
                            Auto-submitting in <span className="text-white text-2xl font-black">{proctorCountdown}</span> seconds...
                        </p>

                        <div className="flex flex-col gap-4 relative z-10">
                            <button
                                onClick={() => {
                                    setTabSwitchWarnings(prev => prev + 1); // Record the strike
                                    setShowProctorWarning(false);
                                    enterFullscreen();
                                }}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transform hover:-translate-y-1"
                            >
                                RESUME EXAM (Accept Warning)
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
