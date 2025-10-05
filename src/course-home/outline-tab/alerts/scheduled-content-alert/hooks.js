import React from 'react';

// The scheduled content alert was removed by product request. Keep the lazy import
// in place in case we need to re-enable it later, but do not register the alert
// with the global messaging system so the banner will not render.
const ScheduledContentAlert = React.lazy(() => import('./ScheduledCotentAlert'));

const useScheduledContentAlert = (_courseId) => {
  // Intentionally do not call useAlert or register the alert. Returning an
  // empty object keeps callers that destructure the return value working.
  return {};
};

export default useScheduledContentAlert;
