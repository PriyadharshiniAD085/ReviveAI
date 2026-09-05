import os,requests
from dotenv import load_dotenv
load_dotenv()
class RazorpayService:
 def __init__(self):
  self.key_id=os.getenv('RAZORPAY_KEY_ID');self.secret=os.getenv('RAZORPAY_KEY_SECRET');self.base_url=os.getenv('RAZORPAY_API_URL','https://api.razorpay.com/v1')
 def configured(self): return bool(self.key_id and self.secret)
 def get_payments(self,count=100):
  if not self.configured():return {'configured':False,'items':[],'message':'Razorpay TEST keys are not configured'}
  r=requests.get(f'{self.base_url}/payments',auth=(self.key_id,self.secret),params={'count':count},timeout=20);r.raise_for_status();return {'configured':True,'items':r.json().get('items',[])}
 def status(self):
  try:
   x=self.get_payments(1);return {'connected':True,'mode':'TEST','payments_found':len(x['items'])}
  except Exception as e:return {'connected':False,'mode':'TEST','error':str(e)}
