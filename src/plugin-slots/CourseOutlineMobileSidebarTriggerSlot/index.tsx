import React from 'react';

import { PluginSlot } from '@openedx/frontend-plugin-framework';

import CourseOutlineTrigger from '../../courseware/course/sidebar/sidebars/course-outline/CourseOutlineTrigger';

export const CourseOutlineMobileSidebarTriggerSlot : React.FC = () => (
  // PHASE 2 UPDATE: Mobile unit chooser is now rendered separately in Sequence.jsx
  // via MobileUnitChooser component as the single mobile entry point.
  // This slot renders the desktop sidebar trigger only (isMobileView={false})
  // to avoid duplicate burger buttons on mobile.
  <PluginSlot
    id="org.openedx.frontend.learning.course_outline_mobile_sidebar_trigger.v1"
    idAliases={['course_outline_mobile_sidebar_trigger_slot']}
    slotOptions={{
      mergeProps: true,
    }}
  >
    <CourseOutlineTrigger isMobileView={false} />
  </PluginSlot>
);
