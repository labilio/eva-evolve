/* Product help destinations live here; feature entry points only use topic keys. */
(function(root){
  'use strict';
  const base = 'https://eva-ai-docs.vercel.app/';
  const topics = Object.freeze({home:'', tasks:'team/projects#项目任务', channels:'team/messages', files:'resources/files', automation:'team/projects#project-automation', 'project-info':'team/projects#project-info', settings:'team/projects#项目成员'});
  const localHosts = new Set(['127.0.0.1','localhost','[::1]']);
  function docsBase(){
    // Local review can connect two unpublished prototypes without shipping a local URL.
    if(localHosts.has(root.location.hostname)){
      const override = new URLSearchParams(root.location.search).get('evaDocs');
      if(override){
        try{
          const url = new URL(override);
          if(url.protocol==='http:' && localHosts.has(url.hostname)) return url.origin+'/';
        }catch{}
      }
    }
    return base;
  }
  function url(topic){
    if(!Object.hasOwn(topics,topic)) throw new Error('未知帮助主题：'+topic);
    return new URL(topics[topic],docsBase()).href;
  }
  root.EvaHelp = Object.freeze({url});
})(window);
