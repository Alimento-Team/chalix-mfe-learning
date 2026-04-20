import { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';

import { useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Button, TransitionReplace } from '@openedx/paragon';

import { useDispatch } from 'react-redux';
import LmsHtmlFragment from '../LmsHtmlFragment';
import messages from '../messages';
import { useModel } from '../../../generic/model-store';
import { dismissWelcomeMessage } from '../../data/thunks';

const htmlToText = (html) => {
  if (!html) {
    return '';
  }

  if (typeof window !== 'undefined' && window.document) {
    const container = window.document.createElement('div');
    container.innerHTML = html;
    return (container.textContent || container.innerText || '').trim();
  }

  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const escapeHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const truncateWords = (text, maxWords) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return { text: words.join(' '), truncated: false };
  }
  return { text: `${words.slice(0, maxWords).join(' ')}...`, truncated: true };
};

const WelcomeMessage = ({ courseId, nextElementRef }) => {
  const intl = useIntl();
  const {
    welcomeMessageHtml,
  } = useModel('outline', courseId);
  const { isEnrolled } = useModel('courseHomeMeta', courseId);

  const messageBodyRef = useRef();
  const [display, setDisplay] = useState(true);

  const fullWelcomeMessageText = useMemo(
    () => htmlToText(welcomeMessageHtml),
    [welcomeMessageHtml],
  );
  const cleanedWelcomeMessageHtml = useMemo(
    () => welcomeMessageHtml,
    [welcomeMessageHtml],
  );
  const shortWelcomeMessageHtml = useMemo(
    () => {
      const shortened = truncateWords(fullWelcomeMessageText, 100);
      return `<p>${escapeHtml(shortened.text)}</p>`;
    },
    [fullWelcomeMessageText],
  );
  const messageCanBeShortened = useMemo(
    () => truncateWords(fullWelcomeMessageText, 100).truncated,
    [fullWelcomeMessageText],
  );

  const [showShortMessage, setShowShortMessage] = useState(messageCanBeShortened);
  const dispatch = useDispatch();

  // Hide welcome message for unenrolled users
  if (!welcomeMessageHtml || !isEnrolled) {
    return null;
  }

  return (
    <Alert
      data-testid="alert-container-welcome"
      variant="light"
      stacked
      dismissible
      show={display}
      onClose={() => {
        nextElementRef.current?.focus();
        setDisplay(false);
        dispatch(dismissWelcomeMessage(courseId));
      }}
      className="raised-card"
      actions={messageCanBeShortened ? [
        <Button
          onClick={() => {
            if (showShortMessage) {
              messageBodyRef.current?.focus();
            }

            setShowShortMessage(!showShortMessage);
          }}
          variant="outline-primary"
        >
          {showShortMessage ? intl.formatMessage(messages.welcomeMessageShowMoreButton)
            : intl.formatMessage(messages.welcomeMessageShowLessButton)}
        </Button>,
      ] : []}
    >
      <div ref={messageBodyRef} tabIndex="-1">
        <TransitionReplace className="mb-3" enterDuration={400} exitDuration={200}>
          {showShortMessage ? (
            <LmsHtmlFragment
              className="inline-link"
              data-testid="short-welcome-message-iframe"
              key="short-html"
              html={shortWelcomeMessageHtml}
              title={intl.formatMessage(messages.welcomeMessage)}
            />
          ) : (
            <LmsHtmlFragment
              className="inline-link"
              data-testid="long-welcome-message-iframe"
              key="full-html"
              html={cleanedWelcomeMessageHtml}
              title={intl.formatMessage(messages.welcomeMessage)}
            />
          )}
        </TransitionReplace>
      </div>
    </Alert>
  );
};

WelcomeMessage.propTypes = {
  courseId: PropTypes.string.isRequired,
  nextElementRef: PropTypes.shape({ current: PropTypes.instanceOf(HTMLInputElement) }),
};

export default WelcomeMessage;
