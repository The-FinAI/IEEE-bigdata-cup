import copy,json,os,sys,unittest
from pathlib import Path
from datetime import timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from protocol import *
from run_node import initial,settle,public_rows,chart_svg,run,release_tasks,submission_records

class PipelineTests(unittest.TestCase):
    def test_release_folder_contains_two_files_in_one_commit(self):
        import tempfile
        from unittest.mock import patch,Mock
        import run_node
        with tempfile.TemporaryDirectory() as directory:
            api=Mock();state=initial()
            with patch.object(run_node,'PRIVATE',Path(directory)),patch.object(run_node,'HfApi',return_value=api),patch.object(run_node,'save'):
                run_node.publish_data(state,0,[{'ticker':'NVDA','price':100.0}],[{'ticker':'NVDA','summary':'Test-only fixture'}])
            api.create_commit.assert_called_once()
            paths=[op.path_in_repo for op in api.create_commit.call_args.kwargs['operations']]
            self.assertEqual(paths,['data/2026-10-14_09-30_NY/price.parquet','data/2026-10-14_09-30_NY/news.parquet','releases.json'])
            self.assertEqual(state['published'][round_id(0)]['folder_url'],'https://huggingface.co/datasets/CarolynJiang/Market-Neutral-Hedging-live-trading/tree/main/data/2026-10-14_09-30_NY')
    def test_receipt_projection_excludes_admin_only_payload(self):
        s,inbox,p,q=self.fixture();inbox['schema']='finreason.task2.receipts/1'
        result=submission_records(inbox,RELEASES[1])
        self.assertEqual(result['status'],'verified')
        self.assertEqual(set(result['rows'][0]),{'team_name','round_id','accepted_at','status'})
        text=json.dumps(result)
        for private in ['stock1','stock2','action','token_hash','receipt_id','PRIVATE','private-id']:
            self.assertNotIn(private,text)
    def test_all_publication_states_and_independent_success(self):
        s=initial()
        self.assertEqual(len(release_tasks(s,0)),12)
        self.assertTrue(all(r['status']=='scheduled' for r in release_tasks(s,0)))
        self.assertEqual(release_tasks(s,2)[0]['status'],'pending')
        s['data_attempts']={round_id(0):'failed'}
        self.assertEqual(release_tasks(s,2)[0]['status'],'failed')
        s['published'][round_id(0)]={'published_at':RELEASES[0].isoformat()}
        rows=release_tasks(s,2)
        self.assertEqual(rows[0]['status'],'published')
        self.assertEqual(rows[1]['status'],'pending')
        self.assertEqual(rows[2]['status'],'scheduled')
        self.assertTrue(all(r['status']!='scheduled' for r in release_tasks(s,14)))
        self.assertTrue(all(set(r)=={'round_id','status','message'} for r in rows))
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
