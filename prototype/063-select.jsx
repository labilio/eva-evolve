import React from 'react';
import Select from '@douyinfe/semi-ui/lib/es/select';
import {Form} from './063-forms.jsx';

import {EvaLucideIcon as Lucide} from './063-lucide-icon.jsx';
const Check = props => <Lucide {...props} name="check"/>;
const ChevronDown = props => <Lucide {...props} name="chevron-down"/>;

// Use exactly the same option renderer as the existing Eva Select. Field values,
// validation, keyboard navigation and popup lifecycle remain owned by Semi Form.
export function EvaFormSelect(props) {
  const Select=window.EvaSelectControls.create(React,Form.Select,Check,ChevronDown);
  return <Select {...props}/>;
}

export function EvaSelect(props) {
 const Control=window.EvaSelectControls.create(React,Select,Check,ChevronDown);
 return <Control {...props}/>;
}
