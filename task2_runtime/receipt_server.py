"""Space ONLY accepts actions and issues durable private receipts. No scoring."""
import hashlib,hmac,json,os,re,secrets,threading
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI,HTTPException,Request,Header
from fastapi.responses import FileResponse
from huggingface_hub import HfApi,hf_hub_download
from protocol import NY,RELEASES,deadline,round_id,valid_action

STORE=os.environ['STORE_REPO'];api=HfApi(token=os.environ.get('HF_TOKEN'));LOCK=threading.RLock()
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
def read_inbox(context=None):
    info=api.repo_info(STORE,repo_type='dataset')
    if not info.private:raise RuntimeError('Receipt storage must be private')
    path=hf_hub_download(STORE,(context or {}).get('path','inbox.json'),repo_type='dataset',revision=info.sha,token=os.environ.get('HF_TOKEN'))
    return json.loads(Path(path).read_text()),info.sha
def current_context():
    # Publication readiness is controlled locally; scoring never runs here.
    if not os.environ.get('HF_TOKEN'):
        return {'index':None,'mode':'live','session_id':'live','path':'inbox.json','deadline':None}
    path=hf_hub_download(STORE,'control.json',repo_type='dataset',force_download=True,token=os.environ.get('HF_TOKEN'))
    control=json.loads(Path(path).read_text());instant=datetime.now(NY)
    test=control.get('rehearsal',{})
    if test.get('enabled') and re.fullmatch(r'[a-f0-9]{16}',test.get('id','')) and instant<RELEASES[0]:
        close=datetime.fromisoformat(test['expires_at'])
        if instant<close:return {'index':0,'mode':'rehearsal','session_id':test['id'],'path':'rehearsal/'+test['id']+'/inbox.json','deadline':close}
    i=next((i for i in range(12) if round_id(i) in control.get('published',[]) and RELEASES[i]<=instant<=deadline(i)),None)
    return {'index':i,'mode':'live','session_id':'live','path':'inbox.json','deadline':deadline(i) if i is not None else None}
def active():return current_context()['index']
@app.get('/')
def page():return FileResponse(Path(__file__).with_name('receipt.html'))
@app.get('/health')
def health():
    if not os.environ.get('HF_TOKEN'):
        return {'ok':False,'role':'receipts-only','scoring':'organizer-local','storage_configured':False,'reason':'Administrator must configure a restricted HF_TOKEN secret; submissions remain closed'}
    read_inbox()
    context=current_context()
    return {'ok':True,'role':'receipts-only','scoring':'organizer-local','mode':context['mode']}
@app.get('/status')
def status():
    context=current_context();i=context['index']
    return {'round_id':round_id(i) if i is not None else None,'deadline':context['deadline'].isoformat() if i is not None else None,'mode':context['mode'],'session_id':context['session_id']}
@app.post('/submissions')
async def submit(request:Request,x_team_token:str|None=Header(default=None)):
    raw=await request.body()
    if len(raw)>4096:raise HTTPException(413,'Too large')
    try:p=json.loads(raw)
    except ValueError:raise HTTPException(422,'Invalid JSON')
    if not isinstance(p,dict) or set(p)!={'team_name','stock1','stock2','action','round_id'} or not valid_action(p):raise HTTPException(422,'Four valid fields and an active round are required')
    name=p['team_name'].strip() if isinstance(p['team_name'],str) else ''
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 _.-]{1,79}',name) or name.casefold()=='codex baseline':raise HTTPException(422,'Invalid unique Team Name')
    identity=hashlib.sha256(name.casefold().encode()).hexdigest();token=None
    with LOCK:
        context=current_context();i=context['index']
        if i is None or p['round_id']!=round_id(i):raise HTTPException(409,'Round closed')
        state,sha=read_inbox(context);team=state['teams'].get(identity)
        if team:
            digest=hashlib.sha256((x_team_token or '').encode()).hexdigest()
            if name!=team['name'] or not hmac.compare_digest(digest,team['token_hash']):raise HTTPException(403,'Use the original team browser/token')
        else:
            if len(state['teams'])>=500:raise HTTPException(429,'Capacity reached')
            token=secrets.token_urlsafe(32)
            state['teams'][identity]={'name':name,'token_hash':hashlib.sha256(token.encode()).hexdigest()}
        if identity in state['submissions'].get(round_id(i),{}):raise HTTPException(409,'Only one accepted submission per round; no revisions')
        at=datetime.now(NY)
        if at>context['deadline']:raise HTTPException(409,'Round closed')
        receipt=secrets.token_hex(16)
        record={**p,'team_name':name,'accepted_at':at.isoformat(),'receipt_id':receipt,'mode':context['mode']}
        state['submissions'].setdefault(round_id(i),{})[identity]=record
        # Parent commit makes concurrent requests fail safely instead of overwriting.
        try:api.upload_file(repo_id=STORE,repo_type='dataset',path_in_repo=context['path'],path_or_fileobj=json.dumps(state).encode(),parent_commit=sha,commit_message='Accept one private pair-action receipt')
        except Exception:raise HTTPException(503,'Receipt not confirmed; retry only if no acceptance receipt was received')
    return {'accepted':True,'receipt_id':receipt,'round_id':p['round_id'],'accepted_at':at.isoformat(),**({'team_token':token} if token else {})}
