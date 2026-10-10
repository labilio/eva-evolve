import React from 'react';

// Semi 2.103 renders the dialog role on the portal shell, but offers no prop
// for its accessible name. Bind only that attribute when content mounts;
// visibility, keyboard handling and focus return remain native Semi behavior.
export function useFloatingLabel(hasTitle, accessibleName, description=false) {
 const titleId=React.useId(),descriptionId=React.useId();
 const labelRef=React.useCallback(node=>{
  const dialog=node?.closest('[role="dialog"]');
  if (!dialog) return;
  if (hasTitle) {
   dialog.setAttribute('aria-labelledby',titleId);
   dialog.removeAttribute('aria-label');
  } else if (accessibleName) {
   dialog.removeAttribute('aria-labelledby');
   dialog.setAttribute('aria-label',accessibleName);
  } else {
   dialog.removeAttribute('aria-labelledby');
   dialog.removeAttribute('aria-label');
  }
  if(description)dialog.setAttribute('aria-describedby',descriptionId);
  else dialog.removeAttribute('aria-describedby');
 },[hasTitle,accessibleName,titleId,description,descriptionId]);
 return {titleId,descriptionId,labelRef};
}
