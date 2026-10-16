/* Shared IM read-state provider. Membership owns persistence and permissions;
 * this connection is independent of the task activity inbox. */
(function(root) {
  'use strict';
  function connect({membership, conversations, events}) {
    const allowed=(id,actor)=>actor===membership.actorId()&&membership.canReadForwardSource(id,actor);
    let catalogActor,catalogRevision,catalog=new Map();
    function records(actor){
      const revision=membership.getSnapshot();
      if(actor!==catalogActor||revision!==catalogRevision){
        catalog=new Map(conversations(actor).filter(record=>allowed(record.id,actor)).map(record=>[record.id,record]));
        catalogActor=actor;catalogRevision=revision;
      }
      return catalog;
    }
    const provider={
      supports:(id,actor)=>records(actor).has(id),
      events:(id,actor)=>allowed(id,actor)&&records(actor).has(id)?events(id,actor):[],
      seed:(id,actor)=>records(actor).get(id)?.seed||0
    };
    membership.connectNotificationSource(provider);
    return provider;
  }
  root.EvaChatNotifications=Object.freeze({connect});
})(window);
