/* One task-level subscription store. Explicit opt-out survives automatic events. */
(function(root){
  'use strict';
  function createStore({storage,membership}){
    const key='eva:task-subscriptions:v1',listeners=new Set();
    let data={projects:{},seeded:{}},revision=0;
    try{const saved=JSON.parse(storage.getItem(key));if(saved?.projects&&saved?.seeded)data=saved;}catch{}
    function commit(next,strict=false){
      try{storage.setItem(key,JSON.stringify(next));}catch(error){if(strict)throw new Error('订阅设置未能保存，请检查浏览器存储后重试');}
      data=next;revision++;listeners.forEach(fn=>fn());
    }
    const copy=()=>JSON.parse(JSON.stringify(data));
    const usersFor=(id,project)=>{
      const clone=membership.cloneRecords().find(item=>item.id===id);
      if(clone&&(clone.active===false||!membership.canRead(project,clone.id)))return [];
      const user=clone?clone.ownerId:id;
      return user&&membership.canRead(project,user)?[user]:[];
    };
    function participants(issue,comments=[]){
      const ids=[issue.creator_id,issue.source_id,issue.assignee_id];
      const mention=text=>{for(const match of String(text||'').matchAll(/\[[^\]\n]*\]\(mention:\/\/(?:member|agent)\/([^\s)]+)\)/g))ids.push(match[1]);};
      mention(issue.description);
      comments.filter(c=>!c.deleted&&!c.deleted_at&&c.author_type!=='system').forEach(c=>{ids.push(c.author_id);mention(c.content);});
      return new Set(ids.flatMap(id=>usersFor(id,issue.workspace_id)));
    }
    function add(next,issue,comments){
      const project=issue.workspace_id;
      for(const user of participants(issue,comments)){
        const tasks=((next.projects[project]??={})[user]??={});
        if(!Object.hasOwn(tasks,issue.id))tasks[issue.id]='auto';
      }
    }
    const api={
      subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>revision,
      seed(project,issues,comments){if(data.seeded[project])return;const next=copy();issues.filter(t=>t.workspace_id===project).forEach(t=>add(next,t,comments[t.id]||[]));next.seeded[project]=true;commit(next);},
      record(issue,comments=[]){const next=copy();add(next,issue,comments);if(JSON.stringify(next)!==JSON.stringify(data))commit(next);},
      has(issue){const actor=membership.actorId();return membership.canRead(issue.workspace_id,actor)&&['auto','manual'].includes(data.projects[issue.workspace_id]?.[actor]?.[issue.id]);},
      set(issue,value){const actor=membership.actorId();if(!membership.canRead(issue.workspace_id,actor))throw new Error('你已无法访问此项目');const next=copy();((next.projects[issue.workspace_id]??={})[actor]??={})[issue.id]=value?'manual':'off';commit(next,true);},
      reconcile(){const next=copy();for(const [project,users] of Object.entries(next.projects))for(const user of Object.keys(users))if(!membership.canRead(project,user)){for(const id of Object.keys(users[user]))users[user][id]='off';}if(JSON.stringify(next)!==JSON.stringify(data))commit(next);}
    };
    membership.subscribe(api.reconcile);api.reconcile();return api;
  }
  root.EvaTaskSubscriptions=Object.freeze({createStore});
})(window);
