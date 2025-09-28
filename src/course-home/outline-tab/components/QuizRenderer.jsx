import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

const QuizRenderer = ({ selectedContent, unitId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedContent) return;
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
  }, [selectedContent, unitId]);

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

  const handleSubmit = async () => {
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
    } catch (e) {
      setError(e?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div style={{ color: '#c00' }}>{error}</div>;
  if (!quiz) return <div>Không có quiz để hiển thị.</div>;

  return (
    <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
      <h3>{quiz.title}</h3>
      <p>{quiz.description}</p>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
                      onChange={() => handleChange(qid, cid, multiple)}
                      style={{ marginRight: 8 }}
                    />
                    {c.text || c.choice_text || c.choice || ''}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button type="submit" style={{ background: '#0070d2', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6 }}>Nộp bài</button>
        </div>
      </form>
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
};

export default QuizRenderer;
