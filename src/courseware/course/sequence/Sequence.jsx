/* eslint-disable @typescript-eslint/no-use-before-define */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import {
  sendTrackEvent,
  sendTrackingLogEvent,
} from '@edx/frontend-platform/analytics';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useSelector } from 'react-redux';
import { Card, Button } from '@openedx/paragon';
import SequenceExamWrapper from '@edx/frontend-lib-special-exams';

import PageLoading from '@src/generic/PageLoading';
import { useModel } from '@src/generic/model-store';
import { useSequenceBannerTextAlert, useSequenceEntranceExamAlert } from '@src/alerts/sequence-alerts/hooks';
import SequenceContainerSlot from '@src/plugin-slots/SequenceContainerSlot';
import { CourseOutlineSidebarSlot } from '@src/plugin-slots/CourseOutlineSidebarSlot';
import { CourseOutlineSidebarTriggerSlot } from '@src/plugin-slots/CourseOutlineSidebarTriggerSlot';
import { NotificationsDiscussionsSidebarSlot } from '@src/plugin-slots/NotificationsDiscussionsSidebarSlot';
import SequenceNavigationSlot from '@src/plugin-slots/SequenceNavigationSlot';

import CourseLicense from '../course-license';
import messages from './messages';
import HiddenAfterDue from './hidden-after-due';
import { UnitNavigation } from './sequence-navigation';
import SequenceContent from './SequenceContent';
import { FinalEvaluationQuiz } from '../final-evaluation';
import { useFinalUnitDetection } from '../final-evaluation/hooks';

const Sequence = ({
  unitId,
  sequenceId,
  courseId,
  unitNavigationHandler,
  nextSequenceHandler,
  previousSequenceHandler,
}) => {
  const intl = useIntl();
  const {
    canAccessProctoredExams,
    license,
  } = useModel('coursewareMeta', courseId);
  const {
    isStaff,
    originalUserIsStaff,
  } = useModel('courseHomeMeta', courseId);
  const sequence = useModel('sequences', sequenceId);
  const section = useModel('sections', sequence ? sequence.sectionId : null);
  const unit = useModel('units', unitId);
  const sequenceStatus = useSelector(state => state.courseware.sequenceStatus);
  const sequenceMightBeUnit = useSelector(state => state.courseware.sequenceMightBeUnit);
  
  // Check if this is the final unit in the course
  const isFinalUnit = useFinalUnitDetection(sequenceId, unitId);

  // Debug logging - very visible
  console.log('🎯 SEQUENCE COMPONENT DEBUG:', {
    sequenceId,
    unitId,
    isFinalUnit,
    sequenceDisplayName: sequence?.displayName,
    unitDisplayName: unit?.displayName,
    unitHasLoaded,
    timestamp: new Date().toISOString()
  });

  const handleNext = () => {
    const nextIndex = sequence.unitIds.indexOf(unitId) + 1;
    const newUnitId = sequence.unitIds[nextIndex];
    handleNavigate(newUnitId);

    if (nextIndex >= sequence.unitIds.length) {
      nextSequenceHandler();
    }
  };

  const handlePrevious = () => {
    const previousIndex = sequence.unitIds.indexOf(unitId) - 1;
    const newUnitId = sequence.unitIds[previousIndex];
    handleNavigate(newUnitId);

    if (previousIndex < 0) {
      previousSequenceHandler();
    }
  };

  const handleNavigate = (destinationUnitId) => {
    unitNavigationHandler(destinationUnitId);
  };

  const logEvent = (eventName, widgetPlacement, targetUnitId) => {
    // Note: tabs are tracked with a 1-indexed position
    // as opposed to a 0-index used throughout this MFE
    const currentIndex = sequence.unitIds.length > 0 ? sequence.unitIds.indexOf(unitId) : 0;
    const payload = {
      current_tab: currentIndex + 1,
      id: unitId,
      tab_count: sequence.unitIds.length,
      widget_placement: widgetPlacement,
    };
    if (targetUnitId) {
      const targetIndex = sequence.unitIds.indexOf(targetUnitId);
      payload.target_tab = targetIndex + 1;
    }
    sendTrackEvent(eventName, payload);
    sendTrackingLogEvent(eventName, payload);
  };

  /* istanbul ignore next */
  const nextHandler = () => {
    logEvent('edx.ui.lms.sequence.next_selected', 'top');
    handleNext();
  };

  /* istanbul ignore next */
  const previousHandler = () => {
    logEvent('edx.ui.lms.sequence.previous_selected', 'top');
    handlePrevious();
  };

  /* istanbul ignore next */
  const onNavigate = (destinationUnitId) => {
    logEvent('edx.ui.lms.sequence.tab_selected', 'top', destinationUnitId);
    handleNavigate(destinationUnitId);
  };

  const sequenceNavProps = {
    nextHandler,
    previousHandler,
    onNavigate,
  };

  useSequenceBannerTextAlert(sequenceId);
  useSequenceEntranceExamAlert(courseId, sequenceId, intl);

  useEffect(() => {
    function receiveMessage(event) {
      const { type } = event.data;
      if (type === 'entranceExam.passed') {
        // I know this seems (is) intense. It is implemented this way since we need to refetch the underlying
        // course blocks that were originally hidden because the Entrance Exam was not passed.
        global.location.reload();
      }
    }
    global.addEventListener('message', receiveMessage);
  }, []);

  const [unitHasLoaded, setUnitHasLoaded] = useState(false);
  const handleUnitLoaded = () => {
    setUnitHasLoaded(true);
  };

  // We want hide the unit navigation if we're in the middle of navigating to another unit
  // but not if other things about the unit change, like the bookmark status.
  // The array property of this useEffect ensures that we only hide the unit navigation
  // while navigating to another unit.
  useEffect(() => {
    if (unit) {
      setUnitHasLoaded(false);
    }
  }, [(unit || {}).id]);

  // If sequence might be a unit, we want to keep showing a spinner - the courseware container will redirect us when
  // it knows which sequence to actually go to.
  const loading = sequenceStatus === 'loading' || (sequenceStatus === 'failed' && sequenceMightBeUnit);
  if (loading) {
    if (!sequenceId) {
      return (<div> {intl.formatMessage(messages.noContent)} </div>);
    }
    return (
      <PageLoading
        srMessage={intl.formatMessage(messages.loadingSequence)}
      />
    );
  }

  if (sequenceStatus === 'loaded' && sequence.isHiddenAfterDue) {
    // Shouldn't even be here - these sequences are normally stripped out of the navigation.
    // But we are here, so render a notice instead of the normal content.
    return <HiddenAfterDue courseId={courseId} />;
  }

  const gated = sequence && sequence.gatedContent !== undefined && sequence.gatedContent.gated;

  const renderUnitNavigation = (isAtTop) => (
    <UnitNavigation
      courseId={courseId}
      sequenceId={sequenceId}
      unitId={unitId}
      isAtTop={isAtTop}
      onClickPrevious={() => {
        logEvent('edx.ui.lms.sequence.previous_selected', 'bottom');
        handlePrevious();
      }}
      onClickNext={() => {
        logEvent('edx.ui.lms.sequence.next_selected', 'bottom');
        handleNext();
      }}
    />
  );

  const defaultContent = (
    <>
      <div className="sequence-container d-inline-flex flex-row w-100">
        <CourseOutlineSidebarTriggerSlot
          sectionId={section ? section.id : null}
          sequenceId={sequenceId}
          isStaff={isStaff}
          unitId={unitId}
        />
        <CourseOutlineSidebarSlot />
        <div className="sequence w-100">
          <div className="sequence-navigation-container">
            {/**
             SequenceNavigationSlot renders nothing by default.
             However, we still pass nextHandler, previousHandler, and onNavigate,
             because, as per the slot's contract, if this slot is replaced
             with the default SequenceNavigation component, these props are required.
             These handlers are excluded from test coverage via istanbul ignore,
             since they are not used unless the slot is overridden.
             */}
            <SequenceNavigationSlot
              sequenceId={sequenceId}
              unitId={unitId}
              {...{
                ...sequenceNavProps,
                nextSequenceHandler,
                handleNavigate,
              }}
            />
          </div>

          <div className="unit-container flex-grow-1 pt-4">
            {/* DEBUG: Always visible */}
            <div style={{
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7',
              padding: '10px', 
              margin: '10px 0',
              borderRadius: '5px',
              fontSize: '12px'
            }}>
              🔧 <strong>DEBUG INFO:</strong> Unit: {unitId} | Sequence: {sequenceId} | 
              isFinalUnit: <strong style={{color: isFinalUnit ? 'green' : 'red'}}>{String(isFinalUnit)}</strong> |
              unitHasLoaded: <strong>{String(unitHasLoaded)}</strong> |
              Sequence Name: "{sequence?.displayName}" |
              Unit Name: "{unit?.displayName}"
            </div>
            
            <SequenceContent
              courseId={courseId}
              gated={gated}
              sequenceId={sequenceId}
              unitId={unitId}
              unitLoadedHandler={handleUnitLoaded}
              isOriginalUserStaff={originalUserIsStaff}
              renderUnitNavigation={renderUnitNavigation}
            />
            {unitHasLoaded && renderUnitNavigation(false)}
            {isFinalUnit && unitHasLoaded && (
              <div>
                <FinalEvaluationQuiz 
                  courseId={courseId} 
                  sequenceId={sequenceId} 
                  unitId={unitId}
                />
                {/* Fallback for testing */}
                <Card className="mt-4 p-4 text-center" style={{backgroundColor: '#e3f2fd'}}>
                  <h3>📝 Kiểm tra cuối khóa</h3>
                  <p>Bạn đã hoàn thành tất cả bài học trong khóa học này!</p>
                  <Button variant="primary" size="lg">
                    Bắt đầu kiểm tra
                  </Button>
                  <div className="mt-2">
                    <small className="text-muted">Final Unit Detected: {isFinalUnit ? 'Yes' : 'No'}</small>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
        <NotificationsDiscussionsSidebarSlot courseId={courseId} />
      </div>
      <SequenceContainerSlot courseId={courseId} unitId={unitId} />
    </>
  );

  if (sequenceStatus === 'loaded') {
    return (
      <>
        <div className="d-flex flex-column flex-grow-1 justify-content-center">
          <SequenceExamWrapper
            sequence={sequence}
            courseId={courseId}
            isStaff={isStaff}
            originalUserIsStaff={originalUserIsStaff}
            canAccessProctoredExams={canAccessProctoredExams}
          >
            {defaultContent}
          </SequenceExamWrapper>
        </div>
        <CourseLicense license={license || undefined} />
      </>
    );
  }

  // sequence status 'failed' and any other unexpected sequence status.
  return (
    <p className="text-center py-5 mx-auto" style={{ maxWidth: '30em' }}>
      {intl.formatMessage(messages.loadFailure)}
    </p>
  );
};

Sequence.propTypes = {
  unitId: PropTypes.string,
  sequenceId: PropTypes.string,
  courseId: PropTypes.string.isRequired,
  unitNavigationHandler: PropTypes.func.isRequired,
  nextSequenceHandler: PropTypes.func.isRequired,
  previousSequenceHandler: PropTypes.func.isRequired,
};

Sequence.defaultProps = {
  sequenceId: null,
  unitId: null,
};

export default Sequence;
