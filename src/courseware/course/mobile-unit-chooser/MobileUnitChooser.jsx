import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  IconButton,
  Sheet,
} from '@openedx/paragon';
import {
  MenuOpen as MenuOpenIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@openedx/paragon/icons';

import SidebarSection from '../sidebar/sidebars/course-outline/components/SidebarSection';
import SidebarSequence from '../sidebar/sidebars/course-outline/components/SidebarSequence';
import { useCourseOutlineSidebar } from '../sidebar/sidebars/course-outline/hooks';
import './MobileUnitChooser.scss';

const MobileUnitChooser = ({
  currentUnitId,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isDisplaySequenceLevel, setDisplaySequenceLevel] = useState(true);
  const previousUnitIdRef = useRef(currentUnitId);

  const {
    courseId,
    sections,
    sequences,
    activeSequenceId,
    shouldDisplayFullScreen,
    isActiveEntranceExam,
  } = useCourseOutlineSidebar();

  // Only show on mobile when sidebar is in full-screen drawer mode
  // shouldDisplayFullScreen is true when viewport width < breakpoints.extraLarge.minWidth (1200px)
  if (!shouldDisplayFullScreen || isActiveEntranceExam) {
    return null;
  }

  const resolvedSectionId = selectedSection
    || Object.keys(sections).find(
      (sectionId) => sections[sectionId].sequenceIds.includes(activeSequenceId),
    );

  const sectionsIds = Object.keys(sections);
  const sequenceIds = sections[resolvedSectionId]?.sequenceIds || [];
  const backButtonTitle = sections[resolvedSectionId]?.title;

  const handleBackToSectionLevel = useCallback(() => {
    setDisplaySequenceLevel(true);
    setSelectedSection(null);
  }, []);

  const handleSelectSection = useCallback((sectionId) => {
    setDisplaySequenceLevel(false);
    setSelectedSection(sectionId);
  }, []);

  // Auto-close sheet when unit is selected (detected via currentUnitId change)
  useEffect(() => {
    if (previousUnitIdRef.current !== currentUnitId && isOpen) {
      setIsOpen(false);
      handleBackToSectionLevel();
    }
    previousUnitIdRef.current = currentUnitId;
  }, [currentUnitId, isOpen, handleBackToSectionLevel]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    handleBackToSectionLevel();
  }, []);

  return (
    <div className="mobile-unit-chooser-trigger-wrapper">
      <IconButton
        alt={intl.formatMessage({ id: 'learner_dashboard.open_unit_chooser', defaultMessage: 'Open unit selector' })}
        className="mobile-unit-chooser-trigger text-dark"
        iconAs={MenuOpenIcon}
        onClick={handleOpen}
        aria-label="Open unit selector"
      />

      <Sheet
        show={isOpen}
        onClose={handleClose}
        position="right"
        className="mobile-unit-chooser-sheet"
      >
        <div className="mobile-unit-chooser-content" role="dialog" aria-label={intl.formatMessage({ id: 'learner_dashboard.select_unit', defaultMessage: 'Select Unit' })}>
          <div className="mobile-unit-chooser-header d-flex justify-content-between align-items-center">
            <span className="h5 mb-0 text-dark-500">
              {intl.formatMessage({ id: 'learner_dashboard.select_unit', defaultMessage: 'Select Unit' })}
            </span>
            <IconButton
              alt={intl.formatMessage({ id: 'learner_dashboard.close_unit_chooser', defaultMessage: 'Close unit selector' })}
              iconAs={CloseIcon}
              className="text-dark"
              onClick={handleClose}
              aria-label="Close unit selector"
            />
          </div>

          {/* Back button to section level */}
          {!isDisplaySequenceLevel && backButtonTitle && (
            <div className="mobile-unit-chooser-subheader">
              <Button
                variant="link"
                iconBefore={ChevronRightIcon}
                className="mobile-unit-chooser-back-btn p-0 mb-0 text-left text-dark-500"
                onClick={handleBackToSectionLevel}
              >
                {backButtonTitle}
              </Button>
            </div>
          )}

          {/* Sections or Sequences list */}
          <ol className="list-unstyled mobile-unit-chooser-list">
            {isDisplaySequenceLevel
              ? sequenceIds.map((sequenceId) => (
                <li key={sequenceId} className="mobile-unit-chooser-sequence-item">
                  <SidebarSequence
                    courseId={courseId}
                    sequence={sequences[sequenceId]}
                    defaultOpen={sequenceId === activeSequenceId}
                    activeUnitId={currentUnitId}
                  />
                </li>
              ))
              : sectionsIds.map((sectionId) => (
                <li key={sectionId} className="mobile-unit-chooser-section-item">
                  <SidebarSection
                    courseId={courseId}
                    section={sections[sectionId]}
                    handleSelectSection={handleSelectSection}
                  />
                </li>
              ))}
          </ol>
        </div>
      </Sheet>
    </div>
  );
};

MobileUnitChooser.propTypes = {
  currentUnitId: PropTypes.string,
};

MobileUnitChooser.defaultProps = {
  currentUnitId: null,
};

export default MobileUnitChooser;
