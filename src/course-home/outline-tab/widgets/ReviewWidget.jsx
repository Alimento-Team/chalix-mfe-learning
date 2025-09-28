import React, { useEffect, useState } from 'react';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import PropTypes from 'prop-types';

// Local icon assets added from Figma export — shipped with the MFE for native rendering
import imgLike from '../assets/icons/like.png';
import imgNeutral from '../assets/icons/neutral.png';
import imgDislike from '../assets/icons/negative.png';
import './styles/ReviewWidget.scss';

const Reaction = ({
  label,
  icon,
  active,
  onClick,
  count,
}) => (
  <button
    type="button"
    className={`chalix-review-emoji ${active ? 'active' : ''}`}
    onClick={onClick}
    aria-pressed={!!active}
  >
    <img src={icon} alt={label} className="emoji-icon" />
    <span className="label">
      {label}
      {typeof count === 'number' && (
        <span className="count-badge" aria-hidden="true"> {count}</span>
      )}
    </span>
  </button>
);

Reaction.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string,
  active: PropTypes.bool,
  count: PropTypes.number,
  onClick: PropTypes.func.isRequired,
};

const ReviewWidget = ({ courseId, unitUsageKey }) => {
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
      <div className="title">Đánh giá</div>
      <div className="review-columns">
        <div className="review-col">
    <Reaction label="Yêu thích" icon={imgLike} active={selected === 'like'} onClick={() => submit('like')} count={summary.like} />
        </div>
        <div className="review-col">
    <Reaction label="Trung bình" icon={imgNeutral} active={selected === 'neutral'} onClick={() => submit('neutral')} count={summary.neutral} />
        </div>
        <div className="review-col">
    <Reaction label="Không thích" icon={imgDislike} active={selected === 'dislike'} onClick={() => submit('dislike')} count={summary.dislike} />
        </div>
      </div>
      {submitting && <div className="submitting">Đang gửi...</div>}
    </div>
  );
}
ReviewWidget.propTypes = {
  courseId: PropTypes.string.isRequired,
  unitUsageKey: PropTypes.string,
};

export default ReviewWidget;
