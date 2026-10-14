"""Shared deadlines and scoring; no network access or credentials."""
import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
NY = ZoneInfo('America/New_York')
TICKERS = ['NVDA','GOOG','META','MSFT','JPM','AMZN','AAPL','AMD','WMT','TSLA']
RELEASES = [datetime(2026,10,d,h,30,tzinfo=NY) for d in (14,15) for h in (9,10,11,12,14,15)]
EVENTS = RELEASES + [datetime(2026,10,16,9,30,tzinfo=NY),datetime(2026,10,16,10,30,tzinfo=NY)]
def round_id(i): return RELEASES[i].strftime('%Y-%m-%d_%H:%M')
def deadline(i): return RELEASES[i+1]-timedelta(minutes=5) if i<11 else datetime(2026,10,16,8,tzinfo=NY)
def news_start(i): return (RELEASES[i]-timedelta(days=1)).replace(hour=15,minute=30) if i%6==0 else RELEASES[i-1]
def valid_action(p): return isinstance(p,dict) and p.get('stock1') in TICKERS and p.get('stock2') in TICKERS and p['stock1']!=p['stock2'] and p.get('action') in ('LS','SL','F')
def valid_prices(p): return set(p)==set(TICKERS) and all(type(v) in (int,float) and math.isfinite(v) and v>0 for v in p.values())
def pair_return(action,entry,exit):
    if not valid_prices(entry) or not valid_prices(exit): raise ValueError('Incomplete price snapshot')
    if action is None: return 0.0
    if not valid_action(action): raise ValueError('Invalid accepted action')
    if action['action']=='F': return 0.0
    a,b=action['stock1'],action['stock2']
    return (1 if action['action']=='LS' else -1)*.5*(exit[a]/entry[a]-exit[b]/entry[b])
