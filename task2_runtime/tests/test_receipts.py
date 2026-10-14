import copy,os,sys,unittest
from pathlib import Path
from datetime import timedelta
from unittest.mock import patch
os.environ.setdefault('STORE_REPO','private-test/receipts')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import receipt_server as s
from protocol import RELEASES,round_id,deadline

class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.inbox={'schema':'finreason.task2.receipts/1','teams':{},'submissions':{}}
        self.patches=[patch.object(s,'active',return_value=0),patch.object(s,'read_inbox',side_effect=lambda:(copy.deepcopy(self.inbox),'parent')),patch.object(s,'datetime'),patch.object(s.api,'upload_file',side_effect=self.persist)]
        self.mocks=[p.start() for p in self.patches];self.mocks[2].now.return_value=RELEASES[0]+timedelta(minutes=10)
        self.client=TestClient(s.app);self.payload={'team_name':'Test Team','stock1':'NVDA','stock2':'GOOG','action':'LS','round_id':round_id(0)}
    def tearDown(self):
        for p in self.patches:p.stop()
    def persist(self,**kw):
        import json
        self.assertEqual(kw['parent_commit'],'parent')
        self.inbox=json.loads(kw['path_or_fileobj'])
    def test_accept_once_and_private_identity(self):
        r=self.client.post('/submissions',json=self.payload);self.assertEqual(r.status_code,200)
        token=r.json()['team_token'];self.assertTrue(r.json()['accepted'])
        self.assertEqual(self.client.post('/submissions',json=self.payload).status_code,403)
        self.assertEqual(self.client.post('/submissions',json=self.payload,headers={'X-Team-Token':token}).status_code,409)
        self.assertEqual(len(self.inbox['submissions'][round_id(0)]),1)
        self.assertEqual(self.client.get('/leaderboard').status_code,404)
        self.assertEqual(self.client.get('/admin/state').status_code,404)
    def test_invalid_choices_do_not_consume_quota(self):
        for p in [{**self.payload,'stock2':'NVDA'},{**self.payload,'stock1':'BA'},{**self.payload,'action':'both'}]:
            self.assertEqual(self.client.post('/submissions',json=p).status_code,422)
        self.assertFalse(self.inbox['teams']);self.assertFalse(self.inbox['submissions'])
    def test_cutoff_and_storage_failure_no_receipt(self):
        self.mocks[2].now.return_value=deadline(0)+timedelta(seconds=1)
        self.assertEqual(self.client.post('/submissions',json=self.payload).status_code,409)
        self.mocks[2].now.return_value=RELEASES[0]+timedelta(minutes=10)
        self.mocks[3].side_effect=RuntimeError('storage unavailable')
        self.assertEqual(self.client.post('/submissions',json=self.payload).status_code,503)
        self.assertFalse(self.inbox['teams'])

if __name__=='__main__':unittest.main()
