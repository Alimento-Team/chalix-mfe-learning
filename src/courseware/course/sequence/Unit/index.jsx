import PropTypes from 'prop-types';
import React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';

import { AppContext } from '@edx/frontend-platform/react';
import { useIntl } from '@edx/frontend-platform/i18n';

import { useModel } from '@src/generic/model-store';
import { usePluginsCallback } from '@src/generic/plugin-store';

import messages from '../messages';
import ContentIFrame from './ContentIFrame';
// import UnitSuspense from './UnitSuspense'; // Temporarily commented out to debug import issues
import { modelKeys, views } from './constants';
import { useExamAccess, useShouldDisplayHonorCode } from './hooks';
import { getIFrameUrl } from './urls';
import FacialExpressionRecorder from '../../facial-expression-recorder';
// Removed UnitTitleSlot import since we're not using it anymore

const Unit = ({
  courseId,
  format,
  onLoaded,
  id,
  isOriginalUserStaff,
  renderUnitNavigation,
}) => {
  const { formatMessage } = useIntl();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { authenticatedUser } = React.useContext(AppContext);
  const examAccess = useExamAccess({ id });
  const shouldDisplayHonorCode = useShouldDisplayHonorCode({ courseId, id });
  const unit = useModel(modelKeys.units, id);
  const view = authenticatedUser ? views.student : views.public;
  const shouldDisplayUnitPreview = pathname.startsWith('/preview') && isOriginalUserStaff;

  const getUrl = usePluginsCallback('getIFrameUrl', () => getIFrameUrl({
    id,
    view,
    format,
    examAccess,
    jumpToId: searchParams.get('jumpToId'),
    preview: shouldDisplayUnitPreview ? '1' : '0',
  }));

  const iframeUrl = getUrl();
  
  // State for facial expression recorder
  const [showRecorder, setShowRecorder] = React.useState(false);
  const [recorderError, setRecorderError] = React.useState(null);

  // Activate recorder immediately when unit loads and user is authenticated
  React.useEffect(() => {
    console.log('Facial Expression Recorder - Checking conditions:', {
      shouldDisplayHonorCode,
      blockAccess: examAccess.blockAccess,
      authenticatedUser: !!authenticatedUser,
    });
    
    if (!shouldDisplayHonorCode && !examAccess.blockAccess && authenticatedUser) {
      console.log('Facial Expression Recorder - ACTIVATING');
      setShowRecorder(true);
    } else {
      console.log('Facial Expression Recorder - NOT ACTIVATING');
      setShowRecorder(false);
    }
  }, [shouldDisplayHonorCode, examAccess.blockAccess, authenticatedUser, id]);

  const handleRecorderError = (error) => {
    console.error('Facial expression recorder error:', error);
    setRecorderError(error);
    // Don't block the learning experience, just log the error
  };

  return (
    <div className="unit" style={{ margin: '0', padding: '0' }}>
      {/* Remove UnitTitleSlot to prevent duplicate title - title is already shown in blue header */}
      {/* Temporarily remove UnitSuspense to debug import issues */}
      <ContentIFrame
        elementId="unit-iframe"
        id={id}
        iframeUrl={iframeUrl}
        loadingMessage={formatMessage(messages.loadingSequence)}
        onLoaded={onLoaded}
        shouldShowContent={!shouldDisplayHonorCode && !examAccess.blockAccess}
        title={unit.title}
        courseId={courseId}
      />
      {/* Facial Expression Recorder - records learner's facial expressions while viewing content */}
      {showRecorder && (
        <FacialExpressionRecorder
          courseId={courseId}
          unitId={id}
          isActive={showRecorder}
          onError={handleRecorderError}
        />
      )}
    </div>
  );
};

Unit.propTypes = {
  courseId: PropTypes.string.isRequired,
  format: PropTypes.string,
  id: PropTypes.string.isRequired,
  onLoaded: PropTypes.func,
  isOriginalUserStaff: PropTypes.bool.isRequired,
  renderUnitNavigation: PropTypes.func.isRequired,
};

Unit.defaultProps = {
  format: null,
  onLoaded: undefined,
};

export default Unit;
