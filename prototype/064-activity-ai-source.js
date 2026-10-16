/* Read-through adapter for Eva's separate AI conversation stores. Only received
 * event IDs are kept here; messages, drafts and read state stay with their owner. */
(function(root){
  'use strict';
  function createSource({storage,actorId,records,subscribeChanges}){
    const key='eva:ai-notification-delivery:v1';
    let delivered=new Map(),dirty=false,error=null;
    try{const value=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(value))delivered=new Map(value.filter(item=>Array.isArray(item)&&typeof item[0]==='string'&&Array.isArray(item[1])));}catch(_){}
    const available=actor=>actor===actorId()?records(actor):[];
    function list(actor){
      const result=available(actor).map(record=>{
        const deliveryKey=JSON.stringify([actor,record.id]),ids=new Set(delivered.get(deliveryKey)||[]);
        const incoming=record.notifications();
        for(const event of incoming)if(event.unread&&!ids.has(event.id)){ids.add(event.id);dirty=true;}
        delivered.set(deliveryKey,[...ids]);
        const {notifications,markNotifications,...row}=record;
        return {...row,events:incoming.filter(event=>ids.has(event.id))};
      });
      if(dirty)try{storage.setItem(key,JSON.stringify([...delivered]));dirty=false;error=null;}catch(_){error='AI 提醒接收记录未能保存，刷新后状态可能变化';}
      return result;
    }
    return {id:'ai',list,getError:()=>error,
      canRead:(group,actor)=>available(actor).some(record=>record.id===group.id),
      markRead(group,ids,read,actor){const record=available(actor).find(record=>record.id===group.id);if(!record)throw new Error('原 AI 会话已删除或当前不可访问');record.markNotifications(ids,read);},
      subscribe(listener){list(actorId());return subscribeChanges(()=>{list(actorId());listener();});}
    };
  }
  root.EvaActivityAI=Object.freeze({createSource});
})(window);
