
(function (root) {
  'use strict';

  var SIZE = 72;
  var MUTED_COLORS = [
    '#6f75a8', '#5f7f9a', '#5e8b80', '#8a739a', '#9a7b56',
    '#a5696d', '#708c67', '#66789e', '#557a94', '#9b805b'
  ];
  var GROUP_ICON = [
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>',
    '<path d="M16 3.128a4 4 0 0 1 0 7.744"></path>',
    '<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>',
    '<circle cx="9" cy="7" r="4"></circle>'
  ].join('');
  // Lucide Network: https://github.com/lucide-icons/lucide/blob/main/icons/network.svg
  var SQUAD_ICON = '<rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path>';
  var AUTOMATION_ICON = [
    '<path d="M12 8V4H8"></path>',
    '<rect x="4" y="8" width="16" height="12" rx="2"></rect>',
    '<path d="M2 14h2M20 14h2M9 13v2M15 13v2"></path>'
  ].join('');
  var cache = new Map();
  var groupAppearanceResolver = () => null;
  var personResolver = id => root.__EVA_PEOPLE?.find(p => p.id === id);

  function hash(value) {
    var result = 0;
    var text = String(value || 'avatar');
    for (var index = 0; index < text.length; index += 1) {
      result = ((result << 5) - result + text.charCodeAt(index)) | 0;
    }
    return Math.abs(result);
  }

  function normalizeColor(id, color) {
    if (/^#[0-9a-f]{6}$/i.test(String(color || ''))) return String(color).toLowerCase();
    return MUTED_COLORS[hash(id) % MUTED_COLORS.length];
  }

  function mixWithWhite(color, colorWeight) {
    var ratio = Math.max(0, Math.min(1, colorWeight));
    var channels = [1, 3, 5].map(function (index) {
      var source = Number.parseInt(color.slice(index, index + 2), 16);
      return Math.round(255 + (source - 255) * ratio).toString(16).padStart(2, '0');
    });
    return '#' + channels.join('');
  }

  function dataUri(svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function iconUri(kind, id, color, tone) {
    var main = tone ? tone.accent : normalizeColor(id, color);
    var key = [kind, id, main, tone?.surface, tone?.border].join(':');
    if (cache.has(key)) return cache.get(key);
    var paths = kind === 'squad' ? SQUAD_ICON : kind === 'automation' ? AUTOMATION_ICON : GROUP_ICON;
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">',
      '<circle cx="36" cy="36" r="34.5" fill="', (tone?.surface || mixWithWhite(main, 0.11)), '" stroke="', (tone?.border || mixWithWhite(main, 0.38)), '" stroke-width="1.5"></circle>',
      '<g transform="translate(18 18) scale(1.5)" fill="none" stroke="', main, '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
      paths,
      '</g></svg>'
    ].join('');
    var uri = dataUri(svg);
    cache.set(key, uri);
    return uri;
  }

  function personUri(id) {
    var stableId = String(id || 'unknown-person');
    var profile = personResolver(stableId);
    if (profile?.avatar) return profile.avatar;
    if (/(^|:)(u-wangyilin|u-current-user(?:-[a-z-]+)?|王宜林)$/.test(stableId) && root.__EVA_CURRENT_USER_PORTRAIT) {
      return root.__EVA_CURRENT_USER_PORTRAIT;
    }
    if (/(^|:)(b-wangyilin|b-pilot|EVA 官方|Eva 同学|我的分身（Eva 同学）)$/.test(stableId) && root.__EVA_COLLEAGUE_PORTRAIT) {
      return root.__EVA_COLLEAGUE_PORTRAIT;
    }
    var key = 'person:' + stableId;
    if (cache.has(key)) return cache.get(key);
    var svg = jdenticon.toSvg('eva-demo:' + stableId, SIZE, {
      padding: 0,
      lightness: { color: [0.3, 0.7], grayscale: [0.3, 0.7] }
    });
    var uri = dataUri(svg);
    cache.set(key, uri);
    return uri;
  }

  function groupUri(id, color, theme) {
    var appearance = groupAppearanceResolver(id);
    if (appearance?.avatar) return appearance.avatar;
    var tone = appearance?.project && root.EvaProjectAppearance.get(appearance.project, theme || (root.document && root.getComputedStyle(root.document.documentElement).colorScheme === 'dark' ? 'dark' : 'light'));
    return iconUri('group', String(id || 'unknown-group'), color, tone);
  }

  function squadUri(id) {
    return iconUri('squad', String(id || 'unknown-squad'));
  }

  function automationUri(id, color) {
    return iconUri('automation', String(id || 'unknown-automation'), color);
  }

  // A conversation ID is never a human identity. The adapter supplies the peer ID.
  function conversationUri(channel) {
    if (channel.personId) return personUri(channel.personId);
    if (channel.identityAvatarUrl) return channel.identityAvatarUrl;
    return groupUri(channel.id, channel.color);
  }

  function uri(options) {
    var config = options || {};
    if (config.kind === 'squad') return squadUri(config.id);
    if (config.kind === 'group') return groupUri(config.id, config.color, config.theme);
    if (config.kind === 'automation') return automationUri(config.id, config.color);
    return personUri(config.id);
  }

  root.EvaAvatar = Object.freeze({
    setPersonResolver: function (resolve) { personResolver = resolve; },
    setGroupAppearanceResolver: function (resolve) { groupAppearanceResolver = resolve; },
    uri: uri,
    conversationUri: conversationUri,
    personUri: personUri,
    groupUri: groupUri,
    squadUri: squadUri,
    automationUri: automationUri
  });
})(window);

