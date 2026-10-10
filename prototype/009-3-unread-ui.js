/* Shared unread presentation contract for React and the remaining native rail.
 * Business stores own counts; this module owns normalization and native markup. */
(function () {
  'use strict';
  function normalize(count) {
    const value = Math.floor(Number(count));
    return Number.isFinite(value) && value > 0 ? {value, display:value > 99 ? '99+' : value} : null;
  }
  function escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function badgeHTML({count, label='', unit='条未读消息', className='wk-conv-compact-badge', attributes={}}) {
    const unread = normalize(count);
    if (!unread) return '';
    const extra = Object.entries(attributes).filter(([name]) => /^data-[a-z0-9-]+$/.test(name))
      .map(([name,value]) => ' '+name+'="'+escape(value)+'"').join('');
    return '<span class="'+escape(className)+'" data-eva-unread="true"'+extra+
      (label ? ' data-eva-unread-label="'+escape(label)+'"' : '')+
      ' aria-label="'+escape(unread.value+' '+unit)+'">'+escape(label ? label+' '+unread.display : unread.display)+'</span>';
  }
  window.EvaUnreadUI = Object.freeze({normalize, badgeHTML});
})();
