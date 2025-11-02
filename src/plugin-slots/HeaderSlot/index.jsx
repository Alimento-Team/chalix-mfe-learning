import PropTypes from 'prop-types';
import { PluginSlot } from '@openedx/frontend-plugin-framework';

// Chalix header is rendered at the top level in index.jsx
// This slot is now empty to prevent duplicate headers
const HeaderSlot = ({
  courseOrg, courseNumber, courseTitle, showUserDropdown,
}) => (
  <PluginSlot
    id="org.openedx.frontend.layout.header_learning.v1"
    idAliases={['header_slot']}
    slotOptions={{
      mergeProps: true,
    }}
    pluginProps={{
      courseOrg,
      courseNumber,
      courseTitle,
      showUserDropdown,
    }}
  >
    {/* Empty slot - Chalix header is rendered globally in index.jsx */}
    {null}
  </PluginSlot>
);

HeaderSlot.propTypes = {
  courseOrg: PropTypes.string,
  courseNumber: PropTypes.string,
  courseTitle: PropTypes.string,
  showUserDropdown: PropTypes.bool,
};

HeaderSlot.defaultProps = {
  courseOrg: null,
  courseNumber: null,
  courseTitle: null,
  showUserDropdown: true,
};

export default HeaderSlot;
