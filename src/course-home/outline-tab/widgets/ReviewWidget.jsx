import React, { useEffect, useState } from 'react';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import PropTypes from 'prop-types';

// Icons exported from Figma (served by the local design server)
const imgLike = 'http://localhost:3845/assets/e191e84842561196491ba2452093486fe585071a.png';
const imgNeutral = 'http://localhost:3845/assets/83c2962bc2e80c0395153ee7c76a68d31b48196e.png';
const imgDislike = 'http://localhost:3845/assets/0c3a72ce03ddad144cb80d669da194c315d1ea50.png';

const Reaction = ({ label, emoji, icon, active, onClick }) => (
  <button
    type="button"
    className={`chalix-review-emoji ${active ? 'active' : ''}`}
    onClick={onClick}
    aria-pressed={!!active}
  >
    {icon ? (
      <img src={icon} alt={label} className="emoji-icon" />
    ) : (
      <span className="emoji" aria-hidden>
        {emoji}
      </span>
    )}
    <span className="label">{label}</span>
  </button>
);

Reaction.propTypes = {
  label: PropTypes.string.isRequired,
  // optional unicode fallback
  emoji: PropTypes.string,
  // optional icon url (preferred)
  icon: PropTypes.string,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default function ReviewWidget({ courseId, unitUsageKey }) {
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState({ like: 0, neutral: 0, dislike: 0 });
  const [submitting, setSubmitting] = useState(false);

  const fetchSummary = async () => {
    try {
      const base = `${getConfig().LMS_BASE_URL}/api/course_home/reviews/${courseId}/summary`;
      const url = unitUsageKey ? `${base}?unit_usage_key=${encodeURIComponent(unitUsageKey)}` : base;
      const { data } = await getAuthenticatedHttpClient().get(url);
      setSummary(data);
    } catch (e) {
      // ignore
    }
  };

  const submit = async (rating) => {
    try {
      setSubmitting(true);
      await getAuthenticatedHttpClient().post(
        `${getConfig().LMS_BASE_URL}/api/course_home/reviews/${courseId}`,
        { rating, unit_usage_key: unitUsageKey },
      );
      setSelected(rating);
      fetchSummary();
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [courseId, unitUsageKey]);

  return (
    <div className="chalix-review-widget" aria-label="Course quick review">
      <div className="title">Đánh giá nhanh</div>
      <div className="reactions">
        <Reaction label="Yêu thích" emoji="😍" icon={imgLike} active={selected === 'like'} onClick={() => submit('like')} />
        <Reaction label="Trung bình" emoji="😐" icon={imgNeutral} active={selected === 'neutral'} onClick={() => submit('neutral')} />
        <Reaction label="Không thích" emoji="😞" icon={imgDislike} active={selected === 'dislike'} onClick={() => submit('dislike')} />
      </div>
      <div className="summary">
        <span>{summary.like} yêu thích</span>
        <span>{summary.neutral} trung bình</span>
        <span>{summary.dislike} không thích</span>
      </div>
      {submitting && <div className="submitting">Đang gửi...</div>}
    </div>
  );
}

ReviewWidget.propTypes = {
  courseId: PropTypes.string.isRequired,
  unitUsageKey: PropTypes.string,
};
