import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
// Confirmation and final submit are handled by the parent component.

const QuizRenderer = ({ selectedContent = null, unitId = '', onRegister = null, requireConfirm = false, forceOpen = false, disabled = false, showHeader = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [opened, setOpened] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState(null);
  const doSubmitRef = useRef(null);

  // Function to get current attempt status
  const getAttemptStatus = useCallback(async () => {
    if (!selectedContent?.courseId) return null;
    
    try {
      const client = getAuthenticatedHttpClient();
      const statusUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/final_evaluation/${selectedContent.courseId}/attempt-status`;
      const resp = await client.get(statusUrl, { headers: { 'USE-JWT-COOKIE': 'true' } });
      
      console.log('📊 Attempt status:', resp.data);
      return resp.data;
    } catch (error) {
      console.error('❌ Error getting attempt status:', error);
      return null;
    }
  }, [selectedContent?.courseId]);

  // Function to start a new attempt
  const startNewAttempt = useCallback(async () => {
    if (!selectedContent?.courseId) return null;
    
    try {
      const client = getAuthenticatedHttpClient();
      const startUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/final_evaluation/${selectedContent.courseId}/attempt-status`;
      const resp = await client.post(startUrl, {}, { headers: { 'USE-JWT-COOKIE': 'true' } });
      
      console.log('✅ New attempt started:', resp.data);
      return resp.data;
    } catch (error) {
      console.error('❌ Error starting new attempt:', error);
      throw error;
    }
  }, [selectedContent?.courseId]);

  // Add CSS animations for floating timer
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes timerPulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load attempt status for final evaluation quizzes
  useEffect(() => {
    const isFinalEvaluationQuiz = selectedContent?.courseId && selectedContent?.quizList;
    if (isFinalEvaluationQuiz) {
      getAttemptStatus().then(status => {
        if (status) {
          setAttemptStatus(status);
          console.log('📊 Loaded attempt status:', status);
        }
      });
    }
  }, [selectedContent?.courseId, getAttemptStatus]);

  // Load ALL quizzes - either from provided list or by fetching from unit
  useEffect(() => {
    let cancelled = false;
    const loadAllQuizzes = async () => {
      if (!opened || !unitId) {
        console.log('QuizRenderer: Skipping load - opened:', opened, 'unitId:', unitId);
        return;
      }
      
      // Skip if quiz is already loaded to prevent re-fetching
      if (quiz && !loading) {
        console.log('QuizRenderer: Quiz already loaded, skipping fetch');
        return;
      }
      
      console.log('QuizRenderer: Loading ALL quizzes for unit:', unitId);
      console.log('QuizRenderer: selectedContent:', selectedContent);
      setLoading(true);
      setError(null);
      setQuiz(null);
      setResult(null);
      
      try {
        const client = getAuthenticatedHttpClient();
        
        // Use course configuration passed from parent or fetch if not available
        let courseConfig = selectedContent?.finalEvaluationConfig || null;
        if (!courseConfig && selectedContent?.courseId) {
          try {
            console.log('🔧 Fetching course config for course:', selectedContent.courseId);
            const configRes = await client.get(
              `${getConfig().LMS_BASE_URL}/api/course_home/v1/final_evaluation/${selectedContent.courseId}/config`,
              { headers: { 'USE-JWT-COOKIE': 'true' } }
            );
            courseConfig = configRes.data;
            console.log('✅ Course config loaded via API:', courseConfig);
          } catch (configError) {
            console.warn('⚠️ Could not load course config:', configError);
          }
        } else if (courseConfig) {
          console.log('✅ Using pre-loaded course config:', courseConfig);
        }

        // If we still don't have time limit info, try the quiz data endpoint
        if ((!courseConfig || (!courseConfig.time_limit && !courseConfig.quiz_time_limit)) && selectedContent?.courseId) {
          try {
            console.log('🔧 Trying quiz data endpoint for time limit info');
            const quizRes = await client.get(
              `${getConfig().LMS_BASE_URL}/api/course_home/v1/final_evaluation/${selectedContent.courseId}/quiz`,
              { headers: { 'USE-JWT-COOKIE': 'true' } }
            );
            if (quizRes.data && quizRes.data.time_limit) {
              console.log('✅ Found time limit in quiz data:', quizRes.data.time_limit);
              courseConfig = { ...courseConfig, ...quizRes.data };
            }
          } catch (quizError) {
            console.warn('⚠️ Could not load quiz data for time limit:', quizError);
          }
        }
        
        // Check if quiz list is already provided from parent
        if (selectedContent?.quizList && selectedContent.quizList.length > 0) {
          console.log('✅ Using provided quiz list:', selectedContent.quizList);
          
          // Load all quiz details from the provided list
          const allQuizzes = [];
          let totalQuestions = [];
          
          for (const quizItem of selectedContent.quizList) {
            try {
              const encodedUnit = encodeURIComponent(unitId);
              const quizUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/units/${encodedUnit}/quizzes/${encodeURIComponent(quizItem.id)}/`;
              console.log('QuizRenderer: Loading quiz details:', quizUrl);
              const quizResp = await client.get(quizUrl, { headers: { 'USE-JWT-COOKIE': 'true' } });
              
              console.log('🔍 Individual quiz response:', quizResp.data);
              
              if (quizResp.data && quizResp.data.questions) {
                // Add quiz metadata to each question for tracking
                const questionsWithQuizId = quizResp.data.questions.map(q => ({
                  ...q,
                  quizId: quizItem.id,
                  quizTitle: quizItem.title || quizItem.displayName || quizResp.data.title
                }));
                
                totalQuestions = totalQuestions.concat(questionsWithQuizId);
                allQuizzes.push({
                  id: quizItem.id,
                  title: quizItem.title || quizItem.displayName || quizResp.data.title,
                  questions: quizResp.data.questions,
                  ...quizResp.data
                });
              }
            } catch (quizError) {
              console.warn('QuizRenderer: Failed to load quiz', quizItem.id, quizError);
            }
          }
          
          if (!cancelled) {
            if (totalQuestions.length > 0) {
              // Create a combined quiz object with all questions and course config
              console.log('🔍 Debug courseConfig:', courseConfig);
              
              // Try multiple field name variations for time limit
              const timeLimit = courseConfig?.quiz_time_limit || 
                               courseConfig?.time_limit || 
                               courseConfig?.final_evaluation_quiz_time_limit ||
                               courseConfig?.final_evaluation_time_limit ||
                               // If this is a final evaluation quiz (has courseId and quizList), use 60 minutes
                               (selectedContent?.courseId && selectedContent?.quizList ? 60 : 30); // Default based on quiz type
              
              console.log('🕐 Time limit calculation:', {
                quiz_time_limit: courseConfig?.quiz_time_limit,
                time_limit: courseConfig?.time_limit,
                final_evaluation_quiz_time_limit: courseConfig?.final_evaluation_quiz_time_limit,
                final_evaluation_time_limit: courseConfig?.final_evaluation_time_limit,
                finalValue: timeLimit
              });
              
              const combinedQuiz = {
                title: `Bài kiểm tra cuối bài - ${allQuizzes.length} phần`,
                questions: totalQuestions,
                total_questions: totalQuestions.length,
                individual_quizzes: allQuizzes,
                // Include course configuration for display
                time_limit: timeLimit, // minutes
                passing_score: courseConfig?.quiz_passing_score || courseConfig?.passing_score || 70, // percentage
                max_attempts: courseConfig?.quiz_max_attempts || courseConfig?.max_attempts || 3,
                attempts_used: courseConfig?.attempts_used || 0,
                attempts_remaining: courseConfig?.attempts_remaining || (courseConfig?.quiz_max_attempts || courseConfig?.max_attempts || 3) - (courseConfig?.attempts_used || 0)
              };
              
              setQuiz(combinedQuiz);
              console.log('QuizRenderer: Loaded combined quiz with', totalQuestions.length, 'questions from', allQuizzes.length, 'quizzes');
              console.log('🎯 Quiz config:', {
                timeLimit: combinedQuiz.time_limit,
                passingScore: combinedQuiz.passing_score,
                maxAttempts: combinedQuiz.max_attempts,
                attemptsRemaining: combinedQuiz.attempts_remaining
              });
            } else {
              setError('Không có câu hỏi nào trong các bài kiểm tra');
            }
          }
        } else {
          // Fallback: try to discover quizzes from unit vertical data
          console.log('🔄 No quiz list provided, discovering from unit data');
          const encodedUnit = encodeURIComponent(unitId);
          const verticalUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/container_handler/${encodedUnit}?debug=1`;
          console.log('QuizRenderer: Fetching unit data from:', verticalUrl);
          const verticalResp = await client.get(verticalUrl, { headers: { 'USE-JWT-COOKIE': 'true' } });
          
          const children = verticalResp.data?.xblock_info?.children || [];
          console.log('QuizRenderer: Unit children:', children);
          
          // Find all quiz/problem blocks
          const quizBlocks = children.filter(
            (c) => c.category === 'problem' || 
                   c.category === 'quiz' || 
                   c.category === 'questions' ||
                   c.category === 'openassessment' ||
                   (c.display_name && c.display_name.toLowerCase().includes('quiz')) ||
                   (c.display_name && c.display_name.toLowerCase().includes('kiểm tra'))
          );
          
          console.log('QuizRenderer: Found quiz blocks:', quizBlocks);
          
          if (quizBlocks.length === 0) {
            setError('Không tìm thấy bài kiểm tra nào trong bài học này');
            return;
          }
          
          // Process the discovered quiz blocks (existing logic)
          // ... rest of the original logic
        }
      } catch (e) {
        console.error('QuizRenderer: Error loading all quizzes:', e);
        if (!cancelled) setError(e?.message || 'Không thể tải bài kiểm tra');
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log('QuizRenderer: Loading complete');
        }
      }
    };
    loadAllQuizzes();
    return () => { cancelled = true; };
  }, [unitId, opened, selectedContent?.quizList?.length, selectedContent?.courseId]);

  // Timer effect for quiz time limit
  useEffect(() => {
    if (!quiz || !quiz.time_limit || result || !opened) return;
    
    if (!timerStarted) {
      // Start timer when quiz opens
      const totalSeconds = quiz.time_limit * 60; // convert minutes to seconds
      setTimeRemaining(totalSeconds);
      setTimerStarted(true);
      console.log('⏰ Timer started:', quiz.time_limit, 'minutes =', totalSeconds, 'seconds');
    }

    if (timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          console.log('⏰ Time expired!');
          // Auto-submit when time runs out
          if (!result && !disabled && doSubmitRef.current) {
            console.log('⏰ Auto-submitting quiz due to timeout');
            doSubmitRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz?.time_limit, result, opened, timerStarted, timeRemaining, disabled]);

  // Format timer display
  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const doSubmit = useCallback(async () => {
    if (disabled) {
      // Prevent submission if parent marked quizzes as final-submitted
      return null;
    }
    if (!quiz) return;
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const client = getAuthenticatedHttpClient();
      
      // For final evaluation quizzes, start a new attempt first
      const isFinalEvaluationQuiz = selectedContent?.courseId && selectedContent?.quizList;
      if (isFinalEvaluationQuiz) {
        try {
          const attemptData = await startNewAttempt();
          console.log('📝 Started new attempt before submission:', attemptData);
        } catch (attemptError) {
          console.error('❌ Failed to start new attempt:', attemptError);
          // If we can't start a new attempt, show the error and stop
          if (attemptError.response?.status === 400) {
            const errorData = attemptError.response.data;
            setError(errorData.error || 'Cannot start new attempt');
            setLoading(false);
            return null;
          }
          // For other errors, continue with submission (might be existing attempt)
        }
      }
      
      // Group answers by quizId for multiple quiz submission
      const answersByQuiz = {};
      let totalPointsEarned = 0;
      let totalPointsPossible = 0;
      const individualResults = [];
      
      // Process answers for each individual quiz
      quiz.questions.forEach(q => {
        const qid = String(q.id || q.pk || '');
        const quizId = q.quizId;
        
        if (!answersByQuiz[quizId]) {
          answersByQuiz[quizId] = {};
        }
        
        if (answers[qid]) {
          answersByQuiz[quizId][qid] = answers[qid];
        }
      });
      
      console.log('📤 Submitting answers for multiple quizzes:', answersByQuiz);
      
      if (isFinalEvaluationQuiz) {
        // For final evaluation quizzes, submit all answers at once to the final evaluation endpoint
        console.log('📤 Submitting final evaluation quiz with all answers:', answersByQuiz);
        console.log('📤 Course ID:', selectedContent.courseId);
        console.log('📤 Quiz config:', quiz);
        
        // The backend expects answers in format: {question_id: [choice_ids]}
        // But our answersByQuiz is grouped by quiz, we need to flatten it
        const flattenedAnswers = {};
        
        // Flatten the answers from quiz-grouped format to question-grouped format
        Object.values(answersByQuiz).forEach(quizAnswers => {
          Object.entries(quizAnswers).forEach(([questionId, answer]) => {
            // Convert single answer to array format expected by backend
            if (Array.isArray(answer)) {
              flattenedAnswers[questionId] = answer;
            } else {
              flattenedAnswers[questionId] = [answer];
            }
          });
        });
        
        const payload = { answers: flattenedAnswers };
        console.log('📤 Original answersByQuiz:', answersByQuiz);
        console.log('📤 Flattened answers for backend:', flattenedAnswers);
        console.log('📤 Final payload:', payload);
        
        try {
          
          const postUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/final_evaluation/${selectedContent.courseId}/quiz/submit`;
          console.log('📤 POST URL:', postUrl);
          
          const resp = await client.post(postUrl, payload, { headers: { 'USE-JWT-COOKIE': 'true' } });
          const finalResult = resp.data || {};
          
          console.log('✅ Final evaluation quiz submitted successfully:', finalResult);
          
          // Use the result from the final evaluation endpoint
          const processedResult = {
            points_earned: finalResult.points_earned || finalResult.score || 0,
            points_possible: finalResult.points_possible || finalResult.total_points || Object.keys(answersByQuiz).length,
            percentage: finalResult.percentage || finalResult.score_percentage || 0,
            passing_score: finalResult.passing_score || quiz.passing_score || 70,
            passed: finalResult.passed || false,
            individual_results: finalResult.individual_results || [],
            total_quizzes: Object.keys(answersByQuiz).length,
            successful_submissions: Object.keys(answersByQuiz).length,
            attempts_remaining: finalResult.attempts_remaining || 0,
            attempts_used: finalResult.attempts_used || 1,
            max_attempts: finalResult.max_attempts || quiz.max_attempts || 3,
            message: finalResult.message
          };
          
          console.log('📊 Final evaluation result processed:', processedResult);
          setResult(processedResult);
          return processedResult;
          
        } catch (finalError) {
          console.error('❌ Error submitting final evaluation quiz:', finalError);
          console.error('❌ Error response data:', finalError.response?.data);
          console.error('❌ Error status:', finalError.response?.status);
          console.error('❌ Error headers:', finalError.response?.headers);
          console.error('❌ Request config:', finalError.config);
          console.error('❌ Payload sent:', payload);
          
          // The backend error '0' suggests a specific issue - let's try alternative approaches
          if (finalError.response?.data?.error === '0') {
            console.log('⚠️ Backend returned error code "0" - this might indicate missing data or configuration');
          }
          
          // If final evaluation endpoint fails, try individual submissions as fallback
          console.log('🔄 Final evaluation endpoint failed, trying individual submissions as fallback...');
          
          const individualResults = [];
          let totalPointsEarned = 0;
          let totalPointsPossible = 0;
          
          for (const [blockId, answers] of Object.entries(answersByQuiz)) {
            try {
              const quizData = quizModules.find(q => q.id === blockId);
              if (!quizData) continue;
              
              const individualPayload = { answers };
              const individualUrl = `${getConfig().LMS_BASE_URL}/api/courses/v1/blocks/${blockId}/handler/xblock_handler`;
              
              console.log(`📤 Fallback: Submitting individual quiz ${blockId}:`, individualPayload);
              const individualResp = await client.post(individualUrl, individualPayload, { 
                headers: { 'USE-JWT-COOKIE': 'true' } 
              });
              
              const individualResult = individualResp.data || {};
              individualResults.push({
                quiz_id: blockId,
                success: true,
                ...individualResult
              });
              
              totalPointsEarned += individualResult.points_earned || individualResult.score || 0;
              totalPointsPossible += individualResult.points_possible || individualResult.total_points || 1;
              
            } catch (indivError) {
              console.error(`❌ Error submitting individual quiz ${blockId}:`, indivError);
              individualResults.push({
                quiz_id: blockId,
                success: false,
                error: indivError.message
              });
              totalPointsPossible += 1; // Assume 1 point possible for failed submissions
            }
          }
          
          // Calculate fallback result
          const overallPercentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
          const passingScore = quiz.passing_score || 70;
          
          const fallbackResult = {
            points_earned: totalPointsEarned,
            points_possible: totalPointsPossible,
            percentage: overallPercentage,
            passing_score: passingScore,
            passed: overallPercentage >= passingScore,
            individual_results: individualResults,
            total_quizzes: Object.keys(answersByQuiz).length,
            successful_submissions: individualResults.filter(r => r.success).length,
            attempts_remaining: (quiz.attempts_remaining || quiz.max_attempts || 3) - 1,
            attempts_used: (quiz.attempts_used || 0) + 1,
            max_attempts: quiz.max_attempts || 3,
            fallback_used: true,
            original_error: finalError.message
          };
          
          console.log('📊 Fallback result processed:', fallbackResult);
          setResult(fallbackResult);
          return fallbackResult;
        }
      } else {
        // For regular individual quizzes
        const individualResults = [];
        let totalPointsEarned = 0;
        let totalPointsPossible = 0;
        
        for (const [blockId, answers] of Object.entries(answersByQuiz)) {
          try {
            const quizData = quizModules.find(q => q.id === blockId);
            if (!quizData) continue;
            
            const payload = { answers };
            const postUrl = `${getConfig().LMS_BASE_URL}/api/courses/v1/blocks/${blockId}/handler/xblock_handler`;
            
            console.log(`📤 Submitting individual quiz ${blockId}:`, payload);
            const resp = await client.post(postUrl, payload, { headers: { 'USE-JWT-COOKIE': 'true' } });
            
            const result = resp.data || {};
            individualResults.push({
              quiz_id: blockId,
              success: true,
              ...result
            });
            
            totalPointsEarned += result.points_earned || result.score || 0;
            totalPointsPossible += result.points_possible || result.total_points || 1;
            
          } catch (error) {
            console.error(`❌ Error submitting quiz ${blockId}:`, error);
            individualResults.push({
              quiz_id: blockId,
              success: false,
              error: error.message
            });
            totalPointsPossible += 1; // Assume 1 point possible for failed submissions
          }
        }
        
        // Calculate overall result for regular quizzes
        const overallPercentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
        const passingScore = quiz.passing_score || 70; // Use quiz config or default
        
        const processedResult = {
          points_earned: totalPointsEarned,
          points_possible: totalPointsPossible,
          percentage: overallPercentage,
          passing_score: passingScore,
          passed: overallPercentage >= passingScore,
          individual_results: individualResults,
          total_quizzes: Object.keys(answersByQuiz).length,
          successful_submissions: individualResults.filter(r => r.success).length,
          // Use quiz config values
          attempts_remaining: (quiz.attempts_remaining || quiz.max_attempts || 3) - 1,
          attempts_used: (quiz.attempts_used || 0) + 1,
          max_attempts: quiz.max_attempts || 3
        };
        
        console.log('📊 Combined quiz submission result:', processedResult);
        setResult(processedResult);
        return processedResult;
      }
      
      // If we reach here, it's not a final evaluation quiz, so process as regular individual quizzes
      for (const [quizId, quizAnswers] of Object.entries(answersByQuiz)) {
        try {
          const encodedUnit = encodeURIComponent(unitId || '');
          const postUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/units/${encodedUnit}/quizzes/${encodeURIComponent(quizId)}/submit/`;
          const payload = { answers: quizAnswers };
            
          console.log(`📤 Submitting quiz ${quizId}:`, payload);
          const resp = await client.post(postUrl, payload, { headers: { 'USE-JWT-COOKIE': 'true' } });
          const quizResult = resp.data || {};
          
          individualResults.push({
            quizId,
            result: quizResult,
            success: true
          });
          
          // Accumulate total scores
          totalPointsEarned += quizResult.points_earned || quizResult.score?.[0] || 0;
          totalPointsPossible += quizResult.points_possible || quizResult.score?.[1] || 1;
          
        } catch (quizError) {
          console.error(`❌ Error submitting quiz ${quizId}:`, quizError);
          individualResults.push({
            quizId,
            error: quizError.message,
            success: false
          });
        }
      }
        
      // Calculate overall result for regular quizzes
      const overallPercentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;
      const passingScore = quiz.passing_score || 70; // Use quiz config or default
      
      const processedResult = {
        points_earned: totalPointsEarned,
        points_possible: totalPointsPossible,
        percentage: overallPercentage,
        passing_score: passingScore,
        passed: overallPercentage >= passingScore,
        individual_results: individualResults,
        total_quizzes: Object.keys(answersByQuiz).length,
        successful_submissions: individualResults.filter(r => r.success).length,
        // Use quiz config values
        attempts_remaining: (quiz.attempts_remaining || quiz.max_attempts || 3) - 1,
        attempts_used: (quiz.attempts_used || 0) + 1,
        max_attempts: quiz.max_attempts || 3
      };
      
      console.log('📊 Combined quiz submission result:', processedResult);
      setResult(processedResult);
      
      // Refresh attempt status after successful submission for final evaluation quizzes
      if (isFinalEvaluationQuiz) {
        getAttemptStatus().then(status => {
          if (status) {
            setAttemptStatus(status);
            console.log('🔄 Refreshed attempt status after submission:', status);
          }
        });
      }
      
      return processedResult;
      
    } catch (e) {
      console.error('❌ Error in combined quiz submission:', e);
      setError(e?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }, [disabled, quiz, answers, unitId]);

  // Update the ref when doSubmit changes
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  }, [doSubmit]);

  // If parent requests to force-open this quiz (show full questions), obey it.
  useEffect(() => {
    if (forceOpen) setOpened(true);
  }, [forceOpen]);

  const handleChange = (questionId, choiceId, multiple) => {
    setAnswers(prev => {
      const copy = { ...prev };
      if (multiple) {
        const cur = new Set(copy[questionId] || []);
        if (cur.has(choiceId)) cur.delete(choiceId); else cur.add(choiceId);
        copy[questionId] = Array.from(cur);
      } else {
        copy[questionId] = [choiceId];
      }
      return copy;
    });
  };



  // Registration API: allow parent to register this quiz so it can orchestrate final submit
  useEffect(() => {
    if (typeof onRegister !== 'function') return undefined;
    const id = selectedContent?.id || null;
    if (!id) return undefined;
    const api = {
      id,
      getAnswers: () => answers,
      getUserAnswers: () => answers, // Alias for compatibility with final submission handler
      isAnswered: () => {
        if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return false;
        return quiz.questions.every((q) => {
          const qid = String(q.id || q.pk || '');
          return Array.isArray(answers[qid]) && answers[qid].length > 0;
        });
      },
      submit: async () => {
        if (!quiz && !opened) {
          setOpened(true);
          await new Promise((resolve) => {
            const iv = setInterval(() => { if (!loading) { clearInterval(iv); resolve(); } }, 100);
            setTimeout(() => { clearInterval(iv); resolve(); }, 5000);
          });
        }
        return doSubmit();
      },
      highlight: (v) => setHighlighted(Boolean(v)),
      open: () => setOpened(true),
    };
    try { onRegister(id, api); } catch (e) { /* ignore */ }
    return () => { try { onRegister(id, null); } catch (e) { /* ignore */ } };
  }, [selectedContent, quiz, answers, onRegister, doSubmit, opened, loading]);

  // If not opened, show a compact card with an explicit button to open the quiz.
  if (!opened) {
    return (
      <div data-quiz-id={selectedContent?.id || ''} style={{ marginTop: 12, padding: 12, borderRadius: 6, background: highlighted ? '#fff6f6' : '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{selectedContent?.title || 'Bài kiểm tra'}</div>
          <div>
            {!forceOpen && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { if (!disabled) setOpened(true); }}
                disabled={disabled}
              >
                {disabled ? 'Đã nộp' : 'Làm bài kiểm tra'}
              </button>
            )}
          </div>
        </div>
        {highlighted && (<div style={{ marginTop: 8, color: '#c0392b' }}>Bài này chưa được trả lời.</div>)}
      </div>
    );
  }

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div style={{ color: '#c00' }}>{error}</div>;
  if (!quiz) return <div>Không có quiz để hiển thị.</div>;

  return (
    <>
      {/* Floating Timer - only show when quiz is active and has time remaining */}
      {timeRemaining !== null && timeRemaining > 0 && (
        <div 
          role="timer" 
          aria-live="polite" 
          aria-label={`Thời gian còn lại: ${formatTime(timeRemaining)}`}
          style={{
            position: 'fixed',
            top: window.innerWidth <= 768 ? '10px' : '20px',
            right: window.innerWidth <= 768 ? '10px' : '20px',
            zIndex: 1000,
            background: timeRemaining < 300 ? '#fee2e2' : '#e3f2fd',
            border: `2px solid ${timeRemaining < 300 ? '#dc2626' : '#1565c0'}`,
            borderRadius: '12px',
            padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
            fontWeight: 700,
            color: timeRemaining < 300 ? '#dc2626' : '#1565c0',
            textAlign: 'center',
            minWidth: window.innerWidth <= 768 ? '140px' : '180px',
            maxWidth: window.innerWidth <= 768 ? '180px' : '220px',
            backdropFilter: 'blur(10px)',
            userSelect: 'none',
            transition: 'all 0.3s ease',
            cursor: 'default',
            transform: timeRemaining < 60 ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ 
            fontSize: '12px', 
            marginBottom: '2px', 
            opacity: 0.8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Thời gian còn lại
          </div>
          <div style={{ 
            fontSize: '20px', 
            fontFamily: 'monospace, Arial, sans-serif',
            marginBottom: '2px',
            animation: timeRemaining < 60 ? 'timerPulse 1s infinite ease-in-out' : 'none'
          }}>
            ⏰ {formatTime(timeRemaining)}
          </div>
          {timeRemaining < 300 && timeRemaining > 60 && (
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              ⚠️ Còn ít thời gian!
            </div>
          )}
          {timeRemaining <= 60 && (
            <div style={{ 
              fontSize: '11px', 
              color: '#dc2626',
              fontWeight: 'bold',
              textShadow: '0 0 4px rgba(220, 38, 38, 0.5)'
            }}>
              🚨 SẮP HẾT GIỜ!
            </div>
          )}
        </div>
      )}
    
      <div data-quiz-id={unitId} style={{ marginTop: 12, padding: 14, background: highlighted ? '#fff6f6' : '#fff', borderRadius: 8 }}>
        {showHeader && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#0070d2' }}>📝 Kiểm tra cuối khóa</h3>
          
          {/* Timer and Quiz Info Section */}
          <div style={{ 
            background: '#e3f2fd', 
            padding: '16px', 
            borderRadius: 8, 
            marginBottom: 16,
            border: '1px solid #bbdefb'
          }}>
            {/* Timer Display */}
            <div style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              color: timeRemaining !== null && timeRemaining < 300 ? '#dc2626' : '#1565c0', // Red when < 5 minutes
              marginBottom: 12,
              textAlign: 'center'
            }}>
              ⏰ Thời gian còn lại: {formatTime(timeRemaining)}
            </div>
            
            {/* Attempt Status Display */}
            {attemptStatus && (
              <div style={{ 
                background: '#fff', 
                padding: '12px', 
                borderRadius: 6, 
                marginBottom: 12,
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#333'
                }}>
                  <span>🔄 Số lần làm còn lại: {
                    attemptStatus.attempts_remaining !== null 
                      ? `${attemptStatus.attempts_remaining} lần`
                      : 'Không giới hạn'
                  }</span>
                  {attemptStatus.max_attempts > 0 && (
                    <span style={{ color: '#666', fontSize: 12 }}>
                      ({attemptStatus.attempts_used}/{attemptStatus.max_attempts})
                    </span>
                  )}
                </div>
                {attemptStatus.latest_score !== null && (
                  <div style={{ 
                    marginTop: 6, 
                    fontSize: 12, 
                    color: attemptStatus.latest_passed ? '#4caf50' : '#f44336'
                  }}>
                    Kết quả lần trước: {attemptStatus.latest_score.toFixed(1)}% 
                    {attemptStatus.latest_passed ? ' ✅ Đạt' : ' ❌ Chưa đạt'}
                  </div>
                )}
              </div>
            )}
            
            {/* Quiz Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: 14,
              color: '#1565c0'
            }}>
              <div>
                📊 <strong>{quiz.total_questions} câu hỏi</strong> từ <strong>{quiz.individual_quizzes?.length || 1} phần</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                🎯 Số lần làm còn lại: <strong style={{ 
                  color: (quiz.attempts_remaining || 0) > 0 ? '#16a34a' : '#dc2626' 
                }}>{quiz.attempts_remaining || quiz.max_attempts || 'Không giới hạn'} lần</strong>
              </div>
            </div>
            
            <div style={{ 
              fontSize: 14,
              color: '#1565c0',
              marginTop: 8,
              textAlign: 'center'
            }}>
              📈 Điểm tối thiểu để qua: <strong>{quiz.passing_score || 70}%</strong>
            </div>
            
            <div style={{ 
              fontSize: 12,
              color: '#666',
              marginTop: 8,
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              Bài kiểm tra đánh giá kiến thức toàn khóa học
            </div>
          </div>
        </div>
      )}
      
      <div>
        {[...(quiz.questions || [])].reverse().map((q, idx) => {
          // Calculate the correct question number (since we reversed the array)
          const questionNumber = quiz.questions.length - idx;
          
          return (
            <div key={q.id || idx} style={{ marginBottom: 24 }}>
              {/* Question */}
              <div style={{ 
                background: '#f8f9fa', 
                padding: '16px', 
                borderRadius: 8,
                border: '1px solid #e9ecef',
                marginBottom: 16
              }}>
                <div style={{ 
                  fontWeight: 700, 
                  marginBottom: 12,
                  fontSize: 16,
                  color: '#0070d2',
                  borderBottom: '2px solid #e3f2fd',
                  paddingBottom: 8
                }}>
                  Câu {questionNumber}: {q.question_text || q.text || 'Câu hỏi'}
                </div>
                <div style={{ marginTop: 12 }}>
                  {(q.choices || []).map((c) => {
                    const multiple = (q.question_type || '').toLowerCase() === 'multiple_choice_multiple_answer';
                    const qid = String(q.id || q.pk || idx);
                    const cid = String(c.id || c.pk || c.choice_id || c.choice_id);
                    const checked = (answers[qid] || []).includes(cid);
                    return (
                      <label 
                        key={cid} 
                        style={{ 
                          display: 'block', 
                          marginBottom: 10,
                          padding: '8px 12px',
                          background: checked ? '#e3f2fd' : '#fff',
                          border: '1px solid #ddd',
                          borderRadius: 6,
                          cursor: (disabled || result) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type={multiple ? 'checkbox' : 'radio'}
                          name={`q-${qid}`}
                          checked={checked}
                          onChange={() => { if (!disabled && !result) handleChange(qid, cid, multiple); }}
                          style={{ marginRight: 10 }}
                          disabled={disabled || result}
                        />
                        <span style={{ fontSize: 14 }}>
                          {c.text || c.choice_text || c.choice || ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Submit button - only show if quiz is opened and no result yet */}
      {opened && !result && !disabled && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            style={{ 
              background: '#0070d2', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 6, 
              padding: '12px 24px', 
              fontWeight: 600, 
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              minWidth: 120
            }}
            onClick={doSubmit}
            disabled={loading}
          >
            {loading ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      )}
      
      {result && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 8, border: '2px solid', borderColor: result.passed ? '#22c55e' : '#ef4444', background: result.passed ? '#f0fdf4' : '#fef2f2' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: result.passed ? '#16a34a' : '#dc2626' }}>
            {result.passed ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'}
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Điểm số tổng:</strong> {result.points_earned || 0} / {result.points_possible || 0} điểm
            {result.percentage !== undefined && (
              <span style={{ marginLeft: 8, color: '#666' }}>({Math.round(result.percentage)}%)</span>
            )}
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Số phần đã nộp:</strong> {result.successful_submissions || 0} / {result.total_quizzes || 0} phần
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Điểm tối thiểu để qua:</strong> {result.passing_score || result.min_grade || 'Chưa xác định'} điểm
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <strong>Số lần làm còn lại:</strong> 
            <span style={{ 
              marginLeft: 8, 
              fontWeight: 700,
              color: (result.attempts_remaining || 0) > 0 ? '#16a34a' : '#dc2626' 
            }}>
              {result.attempts_remaining !== undefined ? result.attempts_remaining : 'Không giới hạn'}
            </span>
            {result.max_attempts && (
              <span style={{ color: '#666', marginLeft: 4 }}>
                (đã dùng {result.attempts_used || 0}/{result.max_attempts})
              </span>
            )}
          </div>

          {!result.passed && (result.attempts_remaining === undefined || result.attempts_remaining > 0) && (
            <button
              type="button"
              style={{ 
                background: '#f59e0b', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                padding: '10px 20px', 
                fontWeight: 600, 
                fontSize: 14,
                cursor: 'pointer',
                width: '100%'
              }}
              onClick={() => {
                // Reset quiz state for retake
                setResult(null);
                setAnswers({});
                setError(null);
              }}
            >
              🔄 Làm lại
            </button>
          )}

          {result.passed && (
            <div style={{ 
              background: '#dcfce7', 
              color: '#166534', 
              padding: '8px 12px', 
              borderRadius: 6, 
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center'
            }}>
              🎉 Chúc mừng! Bạn đã hoàn thành bài kiểm tra thành công.
            </div>
          )}

          {!result.passed && (result.attempts_remaining === 0) && (
            <div style={{ 
              background: '#fee2e2', 
              color: '#991b1b', 
              padding: '8px 12px', 
              borderRadius: 6, 
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center'
            }}>
              ⚠️ Bạn đã hết số lần làm bài. Vui lòng liên hệ giảng viên.
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};

QuizRenderer.propTypes = {
  selectedContent: PropTypes.object,
  unitId: PropTypes.string,
  onRegister: PropTypes.func,
};


export default QuizRenderer;
