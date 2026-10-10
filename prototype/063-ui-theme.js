// Shared Eva control typography. Personal conversation typography remains in GDS.
// Colors/radii/space keep their existing single source: 047 + 049 + 057.
export const typography = Object.freeze({
 title:Object.freeze({fontSize:16,fontWeight:'var(--eva-fw-medium)',lineHeight:'25.144px'}),
 fieldLabel:Object.freeze({fontSize:14,fontWeight:'var(--eva-fw-medium)',lineHeight:'22px'}),
 section:Object.freeze({fontSize:14,fontWeight:'var(--eva-fw-medium)',lineHeight:'22px'}),
 body:Object.freeze({fontSize:14,fontWeight:'var(--eva-fw-regular)',lineHeight:'22px'}),
 auxiliary:Object.freeze({fontSize:12,fontWeight:'var(--eva-fw-regular)',lineHeight:'18px'}),
 compactButton:Object.freeze({fontSize:12,fontWeight:'var(--eva-fw-regular)',lineHeight:'18.858px'}),
 button:Object.freeze({fontSize:14,fontWeight:'var(--eva-fw-regular)',lineHeight:'22px'}),
});

export const space = Object.freeze({content:'var(--eva-space-5)',section:'var(--eva-space-6)',actions:'var(--eva-space-3)',compact:'var(--eva-space-4)'});
export const popconfirmTheme = Object.freeze({
 'radius-popconfirm-popover':'var(--eva-radius-panel)',
 'width-popconfirm-maxWidth':'350px',
 'width-popconfirm-icon':'18px',
 'spacing-popconfirm_header_icon-marginRight':'var(--eva-space-2)',
 'spacing-popconfirm_header_title-marginBottom':'var(--eva-space-1)',
 'spacing-popconfirm-top':space.compact,
 'spacing-popconfirm-bottom':space.compact,
 'spacing-popconfirm_footer-marginTop':space.compact,
 'spacing-popconfirm_footer_btn-marginRight':'var(--eva-space-2)',
 'spacing-popconfirm_popover_with_arrow_inner-padding':'var(--eva-space-4)',
 'spacing-popconfirm_popover_with_arrow_inner_rtl-padding':'var(--eva-space-4)',
 'font-popconfirm_header_title-fontWeight':String(typography.title.fontWeight),
 'color-popconfirm_body-text':'var(--semi-color-text-1)',
});

// Scoped CSS variables also color Semi's native arrow inside the same portal.
export const floatingSurface = Object.freeze({
 '--semi-color-bg-3':'var(--eva-surface-primary)',
 '--semi-color-border':'var(--eva-border-faint)',
 fontFamily:'var(--eva-font-sans)',
 ...typography.body,
 color:'var(--eva-text-primary)',
 backgroundColor:'var(--eva-surface-primary)',
 borderRadius:'var(--eva-radius-panel)',
 boxShadow:'var(--eva-shadow-floating), var(--eva-shadow-hairline)',
 backdropFilter:'none',
});

// Arco layout defaults; Eva continues to own colors, radius and font family.
export const floatingLayout = Object.freeze({maxWidth:'min(350px, calc(100vw - 32px))',maxHeight:'calc(100dvh - var(--topbar-height, 36px) - 32px)',overflowY:'auto',overflowWrap:'anywhere'});
export const floatingButton = Object.freeze({...typography.compactButton,padding:'0 11px',borderWidth:1,borderStyle:'solid',borderColor:'transparent'});

export const popoverLayout = Object.freeze({padding:'var(--eva-space-3) var(--eva-space-4)',titleGap:'var(--eva-space-1)'});

// Arco Form default size, distinct from Popconfirm's built-in mini buttons.
// Sources: Form/style/token.less, Button/style/token.less, style/theme/global.less.
export const floatingFormButton = Object.freeze({...typography.button,padding:'0 15px',borderWidth:1,borderStyle:'solid',borderColor:'transparent'});
export const floatingFormTheme = Object.freeze({
 'font-form_label-fontWeight':'var(--eva-fw-regular)',
 'spacing-form_label-marginBottom':'var(--eva-space-2)',
 'spacing-form_label_posLeft-marginBottom':'var(--eva-space-2)',
 'spacing-form_field_vertical-paddingTop':'0px',
 'spacing-form_field_vertical-paddingBottom':'0px',
});

// Composition roles are explicit: a form stays standard-sized in any host.
export const composition = Object.freeze({
 form:Object.freeze({controlSize:'default',button:floatingFormButton,fieldGap:'var(--eva-space-5)',actionGap:'var(--eva-space-5)',buttonGap:'var(--eva-space-2)'}),
 confirmation:Object.freeze({controlSize:'small',button:floatingButton}),
});

// Card layout follows the adopted Arco density; appearance uses Eva tokens.
export const cardTheme = Object.freeze({
 'spacing-card-padding':'var(--eva-space-4)',
 'radius-card':'var(--eva-radius-control)',
 'font-card_title-fontWeight':String(typography.title.fontWeight),
 'font-card_title-fontSize':typography.title.fontSize+'px',
 'font-card_title-lineHeight':typography.title.lineHeight,
 'font-card_default-fontSize':typography.body.fontSize+'px',
 'font-card_default-fontWeight':String(typography.body.fontWeight),
 'font-card_default-lineHeight':typography.body.lineHeight,
});

// Preserve the accepted explanation-list hierarchy; all callers share it.
export const infoListText = Object.freeze({
 title:Object.freeze({...typography.section,lineHeight:'20px'}),
 description:Object.freeze({...typography.body,fontSize:13,lineHeight:'20px'}),
});
export const infoListTheme = Object.freeze({
 'spacing-list_item-paddingX':'0px',
 'spacing-list_item-paddingY':'0px',
 'spacing-list_header-marginRight':'var(--eva-space-3)',
 'spacing-list_header-marginLeft':'var(--eva-space-3)',
});
