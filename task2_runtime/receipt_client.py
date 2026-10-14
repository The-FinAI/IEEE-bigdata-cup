"""Local administrator bridge; never expose credentials in public artifacts."""
import json
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse

CONFIG=Path('/Users/Carolyn/Documents/Codex/2026-09-03/qin/outputs/receipt-local.json')

def settings(base=None):
    value=dict(base or {})
    if CONFIG.exists():
        if CONFIG.stat().st_mode & 0o077:raise RuntimeError('Receipt credentials file must be private (0600)')
        value.update(json.loads(CONFIG.read_text()))
    return value

def administrator(config,path,method='GET',body=None):
    address=config.get('RECEIPT_API_URL','').rstrip('/')
    parsed=urlparse(address)
    if parsed.scheme!='https' or not (parsed.hostname or '').endswith('.workers.dev') or parsed.path or parsed.query or parsed.fragment or parsed.username:
        raise RuntimeError('Verified Cloudflare workers.dev URL required')
    token=config.get('RECEIPT_ADMIN_TOKEN','')
    if not isinstance(token,str) or len(token)<32:raise RuntimeError('Local receipt administrator credential missing')
    request=Request(address+path,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'FinReason-Local-Organizer/1.0','Accept':'application/json'},data=json.dumps(body).encode() if body is not None else None)
    with urlopen(request,timeout=25) as response:return json.load(response)
