#!/usr/bin/env python3
"""Isolated real HTTP checks for v2. No credential, token or response body output.
Creates synthetic owners/dogs/messages, exercises flags, then deletes test owners.
Use local seeded H2 or --cloud-secrets for the verified MyPetPair GCP service.
"""
import argparse,base64,datetime,hashlib,json,secrets,struct,subprocess,time,urllib.error,urllib.request,uuid
class Failure(Exception): pass
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
parser=argparse.ArgumentParser();parser.add_argument('origin');parser.add_argument('--cloud-secrets',action='store_true');args=parser.parse_args()
origin=args.origin.rstrip('/'); opener=urllib.request.build_opener(NoRedirect()); checks=0; owners=[]; admin=None
password=secrets.token_urlsafe(24)
def check(ok,label):
 global checks
 if not ok: raise Failure(label)
 checks+=1;print('PASS '+label,flush=True)
def call(path,method='GET',body=None,token=None,expected=200,raw=None,ctype=None):
 headers={}
 if token: headers['Authorization']='Bearer '+token
 if body is not None: raw=json.dumps(body).encode();ctype='application/json'
 if ctype: headers['Content-Type']=ctype
 req=urllib.request.Request(origin+path,data=raw,method=method,headers=headers)
 try:
  with opener.open(req,timeout=60) as response: status=response.status; data=response.read(10*1024*1024);mime=response.headers.get('Content-Type','')
 except urllib.error.HTTPError as error: status=error.code;data=error.read();mime='application/json'
 if status!=expected: raise Failure(path.split('?')[0]+' expected '+str(expected)+' got '+str(status))
 if not data: return None
 return json.loads(data) if 'json' in mime else data

def solve(purpose):
 challenge=call('/api/captcha/challenge?purpose='+purpose);p=challenge['parameters'];start=time.monotonic()
 if p['algorithm']!='PBKDF2/SHA-256' or not 1<=p['cost']<=10000: raise Failure('Unexpected CAPTCHA work parameters')
 for counter in range(100000):
  key=hashlib.pbkdf2_hmac('sha256',bytes.fromhex(p['nonce'])+struct.pack('>I',counter),bytes.fromhex(p['salt']),p['cost'],dklen=p['keyLength'])
  if key.hex().startswith(p['keyPrefix']):
   return base64.b64encode(json.dumps({'challenge':challenge,'solution':{'counter':counter,'derivedKey':key.hex(),'time':int((time.monotonic()-start)*1000)}}).encode()).decode()
 raise Failure('CAPTCHA solve exceeded bounded work')
def cloud(*parts):
 r=subprocess.run(['gcloud',*parts,'--project=mypetpair','--quiet'],capture_output=True,timeout=60)
 if r.returncode: raise Failure('GCP read failed')
 return r.stdout.decode().strip()
def signup(label):
 body={'email':'qa-v2-'+uuid.uuid4().hex+'@example.invalid','password':password,'displayName':'Synthetic QA '+label,'phone':'+12025550199','adultConfirmed':True,'termsAccepted':True,'captchaPayload':solve('register')}
 result=call('/api/auth/register','POST',body,expected=201);owners.append(result)
 return result
def dog(owner,sex):
 body={'name':'Synthetic QA '+sex,'sex':sex,'breed':'Synthetic test dog','birthDate':'2022-01-01','city':'Synthetic test location','latitude':12.97,'longitude':77.59,'healthSummary':'Synthetic QA fixture, not a real animal','vetCheckedOn':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'intact':True,'vaccinated':True,'ownershipAttested':True,'available':True}
 result=call('/api/dogs','POST',body,owner['token'],expected=201)
 boundary='mypetpair-'+uuid.uuid4().hex
 data=base64.b64decode('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA')
 raw=('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="synthetic.webp"\r\nContent-Type: image/webp\r\n\r\n').encode()+data+('\r\n--'+boundary+'--\r\n').encode()
 photo=call('/api/dogs/'+result['id']+'/photos','POST',token=owner['token'],expected=201,raw=raw,ctype='multipart/form-data; boundary='+boundary)
 return result,photo,body
try:
 if args.cloud_secrets:
  service=cloud('run','services','describe','mypetpair','--region=us-central1','--format=value(status.url)')
  if origin not in [service,'https://mypetpair-248924650823.us-central1.run.app']: raise Failure('Unapproved credential destination')
  admin_password=cloud('secrets','versions','access','latest','--secret=mypetpair-operator-password');admin_email='operator@mypetpair.example'
 else:
  if origin not in ['http://localhost:8080','http://127.0.0.1:8080']: raise Failure('Use --cloud-secrets for cloud or trusted local seed origin')
  admin_email='moderator@example.invalid';admin_password='Fictional-local-only-42!'
 check(call('/api/health')['status']=='ok','health')
 config=call('/api/config');check(config.get('registrationOpen') is True and config.get('captchaRequired') is True and 'invitationRequired' not in config,'open registration config and no invitation')
 call('/api/auth/login','POST',{'email':admin_email,'password':'not-the-password'},expected=400);check(True,'missing CAPTCHA rejected')
 proof=solve('login');admin=call('/api/auth/login','POST',{'email':admin_email,'password':admin_password,'captchaPayload':proof})
 check(admin['user']['admin'] is True,'operator login with solved CAPTCHA and preserved role')
 call('/api/auth/login','POST',{'email':admin_email,'password':admin_password,'captchaPayload':proof},expected=400);check(True,'CAPTCHA replay rejected')
 call('/api/auth/register','POST',{'email':'invalid-qa@example.invalid','password':password,'displayName':'Synthetic invalid','adultConfirmed':True,'termsAccepted':True,'captchaPayload':solve('register')},expected=400);check(True,'mobile required for signup')
 male=signup('male');female=signup('female');reporters=[signup('reporter') for _ in range(11)]
 check(len(owners)==13,'13 synthetic accounts created without invitation')
 check(not male['user']['emailVerified'] and not male['user']['phoneVerified'],'contacts explicitly unverified')
 md,mp,mbody=dog(male,'MALE');fd,fp,fbody=dog(female,'FEMALE')
 check(call('/api/dogs/'+fd['id'],token=male['token'])['id']==fd['id'],'profile automatically visible without approval')
 jpg=call('/api/photos/'+fp['id'],token=male['token']);check(jpg[:2]==b'\xff\xd8','WebP decoded and reencoded JPEG')
 interest=call('/api/interests','POST',{'maleDogId':md['id'],'femaleDogId':fd['id']},male['token'],201);iid=interest['id'];path='/api/interests/'+iid+'/messages'
 call(path,token=male['token'],expected=409);check(True,'pending chat inaccessible')
 call('/api/interests/'+iid+'/decision','POST',{'action':'ACCEPT'},female['token'])
 contact=call('/api/interests/'+iid+'/contacts',token=male['token']);check('email' not in contact['contact'] and 'phone' not in contact['contact'],'acceptance preserves private contacts')
 message={'body':'Synthetic QA message <b>plain text</b>','clientMessageId':str(uuid.uuid4())}
 sent=call(path,'POST',message,male['token']);retry=call(path,'POST',message,male['token']);check(sent['id']==retry['id'],'retry idempotency')
 call(path,'POST',{**message,'body':'changed duplicate'},male['token'],409);check(True,'conflicting duplicate rejected')
 rows=call('/api/interests',token=female['token']);check(next(x for x in rows if x['id']==iid)['unreadCount']==1,'unread count')
 page=call(path+'?size=1',token=female['token']);check(page['items'][0]['body']==message['body'],'peer reads plain text')
 call(path+'/read','PUT',{'messageId':sent['id']},female['token'],204)
 rows=call('/api/interests',token=female['token']);check(next(x for x in rows if x['id']==iid)['unreadCount']==0,'read marker clears own unread')
 response=call(path,'POST',{'body':'Synthetic QA reply','clientMessageId':str(uuid.uuid4())},female['token'])
 older=call(path+'?beforeId='+str(response['id'])+'&size=1',token=male['token']);check(older['items'][0]['id']==sent['id'],'stable history cursor')
 call(path,token=reporters[0]['token'],expected=404);check(True,'unrelated chat denied')
 call(path,'POST',{'body':'','clientMessageId':str(uuid.uuid4())},male['token'],400);check(True,'empty message rejected')
 call('/api/interests/'+iid+'/decision','POST',{'action':'CLOSE'},female['token']);call(path,token=male['token'],expected=409);check(True,'closed chat denied')
 report=call('/api/messages/'+str(sent['id'])+'/report','POST',{'reason':'HARASSMENT','details':'Synthetic QA scoped evidence'},female['token'],201)
 reports=call('/api/admin/reports',token=admin['token']);evidence=next(r for r in reports if r['id']==report['id']);check(evidence['messageText']==message['body'],'reported evidence available after closure and scoped')
 export=call('/api/me/export',token=male['token']);check(any(m['id']==sent['id'] for m in export['messages']),'participant historical message export')
 flags=[]
 for index,reporter in enumerate(reporters):
  flags.append(call('/api/reports','POST',{'dogId':fd['id'],'reason':'OTHER','details':'Synthetic QA threshold'},reporter['token'],201))
  if index==0:
   duplicate=call('/api/reports','POST',{'dogId':fd['id'],'reason':'OTHER','details':'duplicate test'},reporter['token'],201);check(duplicate['id']==flags[0]['id'],'one reporter deduplicated')
  if index==9: check(call('/api/dogs/'+fd['id'],token=male['token'])['id']==fd['id'],'ten distinct flags do not suspend')
 call('/api/dogs/'+fd['id'],token=male['token'],expected=404);check(True,'eleventh distinct flag hides profile')
 own=call('/api/dogs/'+fd['id'],token=female['token']);check(own['moderation']=='SUSPENDED','automatic suspension persisted')
 call('/api/dogs/'+fd['id'],'PUT',fbody,female['token']);check(call('/api/dogs/'+fd['id'],token=female['token'])['moderation']=='SUSPENDED','edit cannot bypass suspension')
 call('/api/admin/dogs/'+fd['id']+'/photos/'+fp['id'],'DELETE',{'reason':'Synthetic test'},male['token'],403);check(True,'non-operator cannot remove photos through admin API')
 call('/api/admin/dogs/'+fd['id']+'/photos/'+fp['id'],'DELETE',{'reason':'Synthetic QA photo cleanup'},admin['token'],204);check(True,'operator removes photo')
 audit=call('/api/admin/audit',token=admin['token']);check(any(x['action']=='DOG_AUTO_SUSPENDED' for x in audit) and any('PHOTO' in x['action'] for x in audit),'moderation actions audited')
 print('PASS all '+str(checks)+' v2 checks',flush=True)
except Exception as error:
 print('FAIL '+(str(error) if isinstance(error,Failure) else type(error).__name__+' (details suppressed)'),flush=True);raise SystemExit(1)
finally:
 errors=0
 for owner in reversed(owners):
  try:call('/api/me','DELETE',{'password':password},owner['token'],204)
  except Exception:errors+=1
 if admin:
  try:call('/api/auth/logout','POST',token=admin['token'],expected=204)
  except Exception:errors+=1
 print('Synthetic account/session cleanup: '+('complete' if not errors else str(errors)+' failures; operator followup required'),flush=True)
