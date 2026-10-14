"""One local event only: data -> Dataset; receipts <- Space; CR -> main website.

Private state and the OpenAI key remain outside the checkout. No cloud scorer.
"""
import argparse,base64,fcntl,html,json,math,os,subprocess
from datetime import datetime,timedelta
from pathlib import Path
from urllib.request import urlopen
from huggingface_hub import HfApi,hf_hub_download,CommitOperationAdd
from protocol import *
from collect import prices,news,local_models,summarize,choose_baseline

ROOT=Path('/Users/Carolyn/Documents/Codex/2026-09-03/qin')
PRIVATE=ROOT/'outputs/trading-local'
ENV=ROOT/'outputs/trading-private.env'
DATASET='CarolynJiang/Market-Neutral-Hedging-live-trading'
INBOX='CarolynJiang/market-neutral-hedging-private-state'
GITHUB='The-FinAI/IEEE-bigdata-cup'

def save(state):
    p=PRIVATE/'state.json';temp=p.with_suffix('.tmp')
    temp.write_text(json.dumps(state,ensure_ascii=False,indent=2));temp.chmod(0o600);temp.replace(p)

def initial():return {'published':{},'baselines':{},'settled':[],'teams':{},'baseline':{'equity':1.0,'history':[]},'website_events':[],'rows':[]}

def load_receipts(settings,instant):
    address=settings.get('RECEIPT_API_URL')
    if not address or not address.startswith('https://'):raise RuntimeError('Receipt Space not deployed; team actions unavailable, CR pending')
    with urlopen(address.rstrip('/')+'/health',timeout=20) as r:health=json.load(r)
    if health.get('ok') is not True or health.get('role')!='receipts-only':raise RuntimeError('Receipt service not verified')
    api=HfApi();info=api.repo_info(INBOX,repo_type='dataset')
    if not info.private:raise RuntimeError('Receipt inbox is not private')
    p=hf_hub_download(INBOX,'inbox.json',repo_type='dataset',revision=info.sha)
    inbox=json.loads(Path(p).read_text())
    if inbox.get('schema')!='finreason.task2.receipts/1':raise RuntimeError('Invalid receipt ledger')
    return inbox

def settle(state,inbox,i,entry,exit):
    rid=round_id(i)
    if rid in state['settled']:return
    if len(state['settled'])!=i:raise RuntimeError('Earlier settlement missing; never skip or fabricate it')
    sealed=state['baselines'].get(rid)
    if not sealed or datetime.fromisoformat(sealed['sealed_at'])>deadline(i):raise RuntimeError('No timely sealed Codex baseline; CR pending')
    if not valid_prices(entry) or not valid_prices(exit):raise RuntimeError('Missing valuation prices; CR pending')
    accepted=inbox['submissions'].get(rid,{})
    for identity,record in accepted.items():
        at=datetime.fromisoformat(record['accepted_at'])
        release=state['published'].get(rid)
        if not release or not datetime.fromisoformat(release['published_at'])<=at<=deadline(i) or not valid_action(record):raise RuntimeError('Invalid receipt audit record')
        if identity not in inbox['teams'] or inbox['teams'][identity]['name']!=record['team_name']:raise RuntimeError('Receipt identity mismatch')
    # Register teams only after their first real acceptance; no future participants.
    for identity,team in inbox['teams'].items():
        if any(identity in records and datetime.fromisoformat(records[identity]['accepted_at'])<=deadline(i) for records in inbox['submissions'].values()):
            state['teams'].setdefault(identity,{'name':team['name'],'equity':1.0,'history':[{'round':n,'cumulative_return':0.0} for n in range(1,i+1)]})
    for identity,team in state['teams'].items():
        r=pair_return(accepted.get(identity),entry,exit);team['equity']*=1+r
        team['history'].append({'round':i+1,'cumulative_return':team['equity']-1})
    base=state['baseline'];base['equity']*=1+pair_return(sealed['action'],entry,exit)
    base['history'].append({'round':i+1,'cumulative_return':base['equity']-1})
    state['settled'].append(rid)
    # Immutable local audit inputs, never uploaded to a public location.
    state.setdefault('audit',{})[rid]={'entry':entry,'exit':exit,'receipts':accepted}

def public_rows(state):
    rows=[{'team_name':t['name'],'cumulative_return':t['equity']-1,'is_baseline':False} for t in state['teams'].values()]
    if state['baseline']['history']:rows.append({'team_name':'Codex baseline','cumulative_return':state['baseline']['equity']-1,'is_baseline':True})
    if len({r['team_name'] for r in rows})!=len(rows) or any(not math.isfinite(r['cumulative_return']) for r in rows):raise RuntimeError('Invalid public aggregate')
    return sorted(rows,key=lambda r:(-r['cumulative_return'],r['team_name']))

def chart_svg(state):
    series=[(t['name'],t['history'],False) for t in state['teams'].values()]+[('Codex baseline',state['baseline']['history'],True)]
    values=[0]+[p['cumulative_return']*100 for _,hist,_ in series for p in hist]
    lo,hi=min(values),max(values)
    if lo==hi:lo-=1;hi+=1
    padding=(hi-lo)*.1;lo-=padding;hi+=padding
    x=lambda n:80+n/12*840;y=lambda v:350-(v-lo)/(hi-lo)*290
    parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 %d" role="img"><title>Final cumulative returns</title><rect width="100%%" height="100%%" fill="white"/>'%(440+22*len(series))]
    for j in range(6):
        v=lo+(hi-lo)*j/5
        parts.append(f'<path d="M80 {y(v)}H920" stroke="#e7e7e7"/><text x="70" y="{y(v)+4}" text-anchor="end" font-size="13">{v:.1f}%</text>')
    parts.append(f'<path d="M80 {y(0)}H920" stroke="#aaa"/>')
    for n in range(13):parts.append(f'<text x="{x(n)}" y="377" text-anchor="middle" font-size="13">{n}</text>')
    parts.append('<text x="500" y="409" text-anchor="middle">Completed decision rounds · Cumulative return (%)</text>')
    colors=['#26786d','#cf852e','#496fa6','#ad5964','#77629a','#7b944e','#119daa','#de691d','#a6509b','#38459d']
    for j,(name,hist,isbase) in enumerate(series):
        color='#333' if isbase else colors[j%len(colors)]
        points=' '.join(f'{x(p["round"]):.2f},{y(p["cumulative_return"]*100):.2f}' for p in [{'round':0,'cumulative_return':0}]+hist)
        dash='8 5' if isbase else 'none'
        parts.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="2.5" stroke-dasharray="{dash}"/><text x="80" y="{440+j*22}" fill="{color}" font-size="14">{html.escape(name)}</text>')
    return ''.join(parts)+'</svg>'

def gh(path,body=None,method=None):
    cmd=['gh','api',path]
    if body is not None:cmd+=['--method',method or 'POST','--input','-']
    r=subprocess.run(cmd,input=json.dumps(body) if body is not None else None,text=True,capture_output=True,check=True)
    return json.loads(r.stdout)

def publish_website(snapshot,chart=None):
    # One atomic Git commit contains only an allow-listed snapshot and final SVG.
    ref=gh(f'repos/{GITHUB}/git/ref/heads/main');parent=ref['object']['sha']
    base=gh(f'repos/{GITHUB}/git/commits/{parent}')['tree']['sha']
    files={'app/task2/live-state.json':json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n'}
    if chart is not None:files['public/task2/final-cr.svg']=chart
    tree=[]
    for path,content in files.items():
        blob=gh(f'repos/{GITHUB}/git/blobs',{'content':content,'encoding':'utf-8'})
        tree.append({'path':path,'mode':'100644','type':'blob','sha':blob['sha']})
    newtree=gh(f'repos/{GITHUB}/git/trees',{'base_tree':base,'tree':tree})
    commit=gh(f'repos/{GITHUB}/git/commits',{'message':f'Task 2 scheduled website event {snapshot["event"]}/14','tree':newtree['sha'],'parents':[parent]})
    gh(f'repos/{GITHUB}/git/refs/heads/main',{'sha':commit['sha'],'force':False},'PATCH')

def publish_data(state,i,prows,nrows):
    import pyarrow as pa
    import pyarrow.parquet as pq
    api=HfApi();prefix=RELEASES[i].strftime('%Y-%m-%d_%H-%M')+'_NY_';ops=[];links={}
    for kind,rows in [('price',prows),('news',nrows)]:
        path=PRIVATE/(prefix+kind+'.parquet');pq.write_table(pa.Table.from_pylist(rows),path,compression='zstd');path.chmod(0o600)
        name='data/'+path.name;ops.append(CommitOperationAdd(path_in_repo=name,path_or_fileobj=str(path)))
        links[kind+'_url']=f'https://huggingface.co/datasets/{DATASET}/resolve/main/{name}?download=true'
    release={'round_id':round_id(i),'published_at':datetime.now(NY).isoformat(),**links}
    manifest={'schema':'finreason.task2.releases/1','timezone':'America/New_York','published_rounds':list(state['published'].values())+[release]}
    ops.append(CommitOperationAdd(path_in_repo='releases.json',path_or_fileobj=json.dumps(manifest).encode()))
    api.create_commit(DATASET,repo_type='dataset',operations=ops,commit_message=f'Publish round {i+1} news and prices only')
    state['published'][round_id(i)]=release;save(state)

def open_receipt_round(state):
    api=HfApi();info=api.repo_info(INBOX,repo_type='dataset')
    if not info.private:raise RuntimeError('Private receipt store required')
    api.upload_file(repo_id=INBOX,repo_type='dataset',path_in_repo='control.json',path_or_fileobj=json.dumps({'published':list(state['published'])}).encode(),parent_commit=info.sha,commit_message='Authorize only locally published receipt rounds')

def run(event,check=False):
    if not 1<=event<=14:raise ValueError('Event must be 1–14')
    instant=datetime.now(NY);target=EVENTS[event-1]
    if check:
        print(f'Event {event}: {target.isoformat()}; data={event<=12}; ranking={event>=2}; final_chart={event==14}')
        return
    if not target<=instant<=target+timedelta(minutes=25):raise RuntimeError('Not within this node execution period; historical events are not silently replayed')
    PRIVATE.mkdir(mode=0o700,parents=True,exist_ok=True);PRIVATE.chmod(0o700)
    with (PRIVATE/'run.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        state=json.loads((PRIVATE/'state.json').read_text()) if (PRIVATE/'state.json').exists() else initial()
        if event in state['website_events']:print('Node already published; no duplicate update');return
        errors=[];_,settings=local_models(ENV);api=HfApi()
        if event<=12:
            i=event-1;rid=round_id(i)
            try:
                cache=PRIVATE/f'release-{i+1}.json'
                if cache.exists():data=json.loads(cache.read_text())
                else:
                    client,settings=local_models(ENV);p,prows=prices(RELEASES[i]);groups=news(i)
                    nrows=summarize(client,settings.get('NEWS_MODEL','gpt-4.1-mini'),groups,i)
                    data={'prices':p,'price_rows':prows,'news_rows':nrows}
                    cache.write_text(json.dumps(data,ensure_ascii=False));cache.chmod(0o600)
                if rid not in state['published']:publish_data(state,i,data['price_rows'],data['news_rows'])
                open_receipt_round(state)
                if rid not in state['baselines']:
                    if datetime.now(NY)>deadline(i) or not valid_prices(data['prices']):raise RuntimeError('No timely complete inputs for Codex baseline')
                    client,settings=local_models(ENV);action=choose_baseline(client,settings.get('CODEX_MODEL','gpt-5.3-codex'),data['prices'],data['news_rows'])
                    if not valid_action(action) or datetime.now(NY)>deadline(i):raise RuntimeError('Baseline validation or sealing deadline failed')
                    state['baselines'][rid]={'action':action,'sealed_at':datetime.now(NY).isoformat(),'model':settings.get('CODEX_MODEL','gpt-5.3-codex')};save(state)
            except Exception as exc:errors.append('Data/baseline pending: '+type(exc).__name__)
        if 2<=event<=13:
            i=event-2
            try:
                inbox=load_receipts(settings,instant)
                entry,_=prices(deadline(i));exit,_=prices(EVENTS[event-1])
                settle(state,inbox,i,entry,exit);save(state)
            except Exception as exc:errors.append('CR pending: '+type(exc).__name__)
        final=event==14 and len(state['settled'])==12 and len(state['baseline']['history'])==12
        rows=public_rows(state)
        ranking=('Final settlement verified.' if final else f'{len(state["settled"])} of 12 rounds verified.')
        if event>=2 and len(state['settled'])<min(event-1,12):ranking+=' Incomplete inputs or receipt service unavailable; ranking is pending, not a zero-return result.'
        if event==14 and not final:errors.append('Final chart withheld: all 12 verified settlements required')
        snapshot={'schema':'finreason.task2.website/1','event':event,'updated_at':datetime.now(NY).isoformat(),'data_status':f'{len(state["published"])} of 12 data batches published.'+(' Some input stages are pending.' if errors else ''),'submission_status':'Actions are accepted only after the receipt Space deployment is verified.','ranking_status':ranking,'final':final,'chart':'/IEEE-bigdata-cup/task2/final-cr.svg' if final else None,'releases':list(state['published'].values()),'rows':rows}
        if errors:snapshot['ranking_status']+=' '+'; '.join(errors)
        publish_website(snapshot,chart_svg(state) if final else None)
        state['website_events'].append(event);save(state)
        print(f'Website event {event}/14 published; data batches={len(state["published"])}; settled rounds={len(state["settled"])}; final={final}')
        if errors:print('Pending stages: '+'; '.join(errors))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--event',type=int,required=True);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    run(args.event,args.check)
