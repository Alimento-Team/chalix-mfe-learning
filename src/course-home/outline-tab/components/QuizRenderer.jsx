import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
// Confirmation and final submit are handled by the parent component.

const QuizRenderer = ({ selectedContent, unitId, onRegister = null, requireConfirm = false, forceOpen = false, disabled = false, showHeader = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [opened, setOpened] = useState(false);
  const [highlighted, setHighlighted] = useState(false);

  // Load quiz details only when the quiz is opened to avoid fetching many quizzes at once.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedContent || !opened) return;
      setLoading(true);
      setError(null);
      setQuiz(null);
      setResult(null);
      try {
        const client = getAuthenticatedHttpClient();
        const id = selectedContent.id || '';
        let url = null;
        // chalix-quiz- prefix indicates DB-backed quiz endpoint
        if (id.startsWith && id.startsWith('chalix-quiz-')) {
          const qid = id.replace('chalix-quiz-', '');
          url = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/quizzes/${qid}/`;
        } else {
          // Fallback to unit media detail for modulestore problem blocks
          const encodedUnit = encodeURIComponent(unitId || '');
          url = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/units/${encodedUnit}/quizzes/${encodeURIComponent(id)}/`;
        }
        const resp = await client.get(url, { headers: { 'USE-JWT-COOKIE': 'true' } });
        if (!cancelled) setQuiz(resp.data || null);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load quiz');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedContent, unitId, opened]);

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

  const doSubmit = async () => {
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
      const id = selectedContent.id || '';
      let postUrl = null;
      if (id.startsWith && id.startsWith('chalix-quiz-')) {
        const qid = id.replace('chalix-quiz-', '');
        postUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/quizzes/${qid}/submit/`;
      } else {
        const encodedUnit = encodeURIComponent(unitId || '');
        postUrl = `${getConfig().LMS_BASE_URL}/api/course_home/v1/content/quizzes/${encodeURIComponent(id)}/submit/`;
      }
      const payload = { answers };
      const resp = await client.post(postUrl, payload, { headers: { 'USE-JWT-COOKIE': 'true' } });
      setResult(resp.data || null);
      return resp.data || null;
    } catch (e) {
      setError(e?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  // Registration API: allow parent to register this quiz so it can orchestrate final submit
  useEffect(() => {
    if (typeof onRegister !== 'function') return undefined;
    const id = selectedContent?.id || null;
    if (!id) return undefined;
    const api = {
      id,
      getAnswers: () => answers,
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
    <div data-quiz-id={selectedContent?.id || ''} style={{ marginTop: 12, padding: 14, background: highlighted ? '#fff6f6' : '#fff', borderRadius: 8 }}>
      {showHeader && (<h3 style={{ marginTop: 0 }}>{quiz.title}</h3>)}
      <div>
        {(quiz.questions || []).map((q, idx) => (
          <div key={q.id || idx} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600 }}>{idx + 1}. {q.question_text || q.text || 'Câu hỏi'}</div>
            <div style={{ marginTop: 8 }}>
              {(q.choices || []).map((c) => {
                const multiple = (q.question_type || '').toLowerCase() === 'multiple_choice_multiple_answer';
                const qid = String(q.id || q.pk || idx);
                const cid = String(c.id || c.pk || c.choice_id || c.choice_id);
                const checked = (answers[qid] || []).includes(cid);
                return (
                  <label key={cid} style={{ display: 'block', marginBottom: 6 }}>
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`q-${qid}`}
                      checked={checked}
                      onChange={() => { if (!disabled) handleChange(qid, cid, multiple); }}
                      style={{ marginRight: 8 }}
                      disabled={disabled}
                    />
                    {c.text || c.choice_text || c.choice || ''}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {result && (
        <div style={{ marginTop: 16, background: '#f0f9ff', padding: 12, borderRadius: 6 }}>
          <div>Kết quả: {result?.score ? `${result.score[0]} / ${result.score[1]}` : JSON.stringify(result)}</div>
        </div>
      )}
    </div>
  );
};

QuizRenderer.propTypes = {
  selectedContent: PropTypes.object,
  unitId: PropTypes.string,
  onRegister: PropTypes.func,
};

QuizRenderer.defaultProps = {
  selectedContent: null,
  unitId: '',
  onRegister: null,
};


export default QuizRenderer;
