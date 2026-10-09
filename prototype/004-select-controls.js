/* Eva Select：原生 Semi 管理交互，公共适配只负责选项呈现。 */
(function(root){
  'use strict';
  const cache=new WeakMap();
  function option(React,Check,item){
    const {className,style,disabled,focused,selected,onClick,onMouseEnter,label,icon,content}=item;
    return React.createElement('div',{
      className:[className,'semi-dropdown-item','eva-select-option',selected?'semi-dropdown-item-active':''].filter(Boolean).join(' '),
      style,onClick:disabled?undefined:onClick,onMouseEnter,role:'option','aria-selected':!!selected,'aria-disabled':!!disabled,
      'data-focused':focused?'true':undefined
    },icon?React.createElement('span',{className:'semi-dropdown-item-icon'},icon):null,
    React.createElement('span',{className:'eva-select-option__content'},content??label),
    selected?React.createElement(Check,{size:14,className:'eva-select-option__check','aria-hidden':true}):null);
  }
  function create(React,Select,Check,ChevronDown){
    if(cache.has(Select))return cache.get(Select);
    const Control=React.forwardRef(function EvaSelect({dropdownClassName='',renderOptionItem,renderSelectedItem,...props},ref){
      return React.createElement(Select,{
        ...props,ref,dropdownClassName:['eva-select-menu',dropdownClassName].filter(Boolean).join(' '),
        arrowIcon:props.arrowIcon??React.createElement(ChevronDown,{size:16}),
        renderOptionItem:renderOptionItem??(item=>option(React,Check,item)),
        renderSelectedItem:renderSelectedItem??(item=>{
          const content=React.createElement('span',{className:'eva-select-value'},item.icon,item.content??item.label);
          return props.multiple?{isRenderInTag:true,content}:content;
        })
      });
    });
    Control.Option=Select.Option;Control.OptGroup=Select.OptGroup;cache.set(Select,Control);return Control;
  }
  root.EvaSelectControls=Object.freeze({create,option});
})(window);
