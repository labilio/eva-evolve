import {space, typography} from './063-ui-theme.js';
export {typography as dialogText} from './063-ui-theme.js';
// Semi's public Modal Sass tokens. Arco supplies the approved spacing reference;
// Eva's color, radius and font-family tokens are deliberately not replaced.
export const modalTheme = Object.freeze({
 'spacing-modal_content-paddingX':'0',
 'spacing-modal_header-marginY':'0',
 'spacing-modal_header-paddingY':`calc((var(--eva-space-12) - ${typography.title.lineHeight} - 1px) / 2)`,
 'spacing-modal_header-paddingX':space.content,
 'width-modal_header-border':'1px',
 'color-modal_header-border':'var(--semi-color-border)',
 'spacing-modal_body-padding':`${space.section} ${space.content}`,
 'spacing-modal_footer-marginY':'0',
 'spacing-modal_footer-paddingY':space.compact,
 'spacing-modal_footer-paddingX':space.content,
 'width-modal_footer-border':'1px',
 'color-modal_footer-border':'var(--semi-color-border)',
 'spacing-modal_footer_button-marginLeft':space.actions,
});
