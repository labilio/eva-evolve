import React from 'react';
import {typography} from './063-ui-theme.js';

// Layout only: children keep their own internal padding and typography.
// No outer spacing, pixel overrides, or host-dependent descendant resets.
export function ContentStack({children}) {
 return <div className="eva-content-stack">{children}</div>;
}
ContentStack.Section=function ContentSection({description,children}) {
 return <div className="eva-content-section">
  {description != null && description !== '' && <div className="eva-content-section-description" style={typography.auxiliary}>{description}</div>}
  {children}
 </div>;
};
