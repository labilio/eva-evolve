/* Chat events are read through the existing message source. Membership remains
 * the only owner of read state; this adapter stores received event IDs only. */
(function(root) {
  'use strict';
  function createSource({storage, membership, conversations, events}) {
    const key='eva:chat-notification-delivery:v1';
    let delivered=new Map(),error=null;
    try { const value=JSON.parse(storage.getItem(key)||'[]'); if(Array.isArray(value))delivered=new Map(value.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&Array.isArray(row[1]))); } catch (_) {}
    const allowed=(id,actor)=>actor===membership.actorId()&&membership.canReadForwardSource(id,actor);
    let catalogActor,catalogRevision,catalog=new Map();
    function records(actor,refresh=false){
      const revision=membership.getSnapshot();
      if(refresh||actor!==catalogActor||revision!==catalogRevision){
        catalog=new Map(conversations(actor).filter(record=>allowed(record.id,actor)).map(record=>[record.id,record]));
        catalogActor=actor;catalogRevision=revision;
      }
      return catalog;
    }
    membership.connectNotificationSource({supports:(id,actor)=>records(actor).has(id),events:(id,actor)=>allowed(id,actor)?events(id,actor):[],seed:(id,actor)=>records(actor).get(id)?.seed||0});
    function list(actor) {
      if(actor!==membership.actorId())return [];
      let changed=false;
      const result=[...records(actor,true).values()].map(record=>{
        const deliveryKey=JSON.stringify([actor,record.id]);
        const ids=new Set(delivered.get(deliveryKey)||[]);
        const incoming=membership.conversationNotifications(record.id,actor);
        for(const event of incoming)if(event.unread&&!ids.has(event.id)){ids.add(event.id);changed=true;}
        if(changed)delivered.set(deliveryKey,[...ids]);
        return {...record,type:record.parentId?'message':record.direct?'message':'chat',events:incoming.filter(event=>ids.has(event.id))};
      });
      if(changed){try{storage.setItem(key,JSON.stringify([...delivered]));error=null;}catch(_){error='消息提醒接收记录未能保存，刷新后状态可能变化';}}
      return result;
    }
    return {id:'chat',list,getError:()=>error,canRead:(group,actor)=>allowed(group.id,actor)&&records(actor).has(group.id),
      markRead(group,ids,read,actor){if(!this.canRead(group,actor))throw new Error('你已无法访问此会话');membership.markConversationNotifications(group.id,actor,ids,read);},
      subscribe(listener){list(membership.actorId());return membership.subscribe(()=>{list(membership.actorId());listener();});}
    };
  }
  root.EvaActivityChats=Object.freeze({createSource});
})(window);
