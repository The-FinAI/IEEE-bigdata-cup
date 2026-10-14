import copy,json,os,sys,unittest
from pathlib import Path
from datetime import timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from protocol import *
from run_node import initial,settle,public_rows,chart_svg,run

class PipelineTests(unittest.TestCase):
    def fixture(self):
        s=initial();rid=round_id(0);ident='private-id'
        s['published'][rid]={'published_at':RELEASES[0].isoformat()}
        s['baselines'][rid]={'action':{'stock1':'NVDA','stock2':'GOOG','action':'LS'},'sealed_at':(deadline(0)-timedelta(minutes=1)).isoformat()}
        inbox={'teams':{ident:{'name':'Team A','token_hash':'PRIVATE'}},'submissions':{rid:{ident:{'team_name':'Team A','stock1':'NVDA','stock2':'GOOG','action':'LS','accepted_at':(deadline(0)-timedelta(minutes=2)).isoformat(),'receipt_id':'PRIVATE'}}}}
        p={t:100 for t in TICKERS};q={**p,'NVDA':110}
        return s,inbox,p,q
    def test_fourteen_nodes_and_deadlines(self):
        self.assertEqual(len(EVENTS),14);self.assertEqual(deadline(11).hour,8)
        self.assertEqual(EVENTS[13].hour,10);self.assertEqual(EVENTS[13].minute,30)
        run(14,check=True)
    def test_scoring_compounding_and_idempotence(self):
        s,inbox,p,q=self.fixture();settle(s,inbox,0,p,q)
        self.assertAlmostEqual(s['teams']['private-id']['equity'],1.05)
        self.assertAlmostEqual(s['baseline']['equity'],1.05)
        settle(s,inbox,0,p,q);self.assertEqual(len(s['settled']),1)
        self.assertEqual(pair_return(None,p,q),0);self.assertEqual(pair_return({'stock1':'NVDA','stock2':'GOOG','action':'F'},p,q),0)
    def test_no_missing_price_or_retroactive_baseline(self):
        s,inbox,p,q=self.fixture()
        with self.assertRaises(RuntimeError):settle(s,inbox,0,{**p,'NVDA':None},q)
        s['baselines'][round_id(0)]['sealed_at']=(deadline(0)+timedelta(seconds=1)).isoformat()
        with self.assertRaises(RuntimeError):settle(s,inbox,0,p,q)
    def test_public_allowlist_and_chart_escape(self):
        s,inbox,p,q=self.fixture();settle(s,inbox,0,p,q)
        rows=public_rows(s)
        self.assertTrue(all(set(r)=={'team_name','cumulative_return','is_baseline'} for r in rows))
        self.assertNotIn('PRIVATE',json.dumps(rows));self.assertNotIn('stock1',json.dumps(rows))
        s['teams']['private-id']['name']='<script>alert(1)</script>'
        chart=chart_svg(s);self.assertNotIn('<script>',chart);self.assertIn('&lt;script&gt;',chart)
    def test_wrong_node_time_is_rejected(self):
        from unittest.mock import patch
        from datetime import datetime
        with patch('run_node.datetime') as clock:
            clock.now.return_value=datetime(2026,10,13,12,tzinfo=NY)
            with self.assertRaises(RuntimeError):run(1)

if __name__=='__main__':unittest.main()
