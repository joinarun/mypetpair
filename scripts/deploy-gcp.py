#!/usr/bin/env python3
"""Deploy the reviewed MyPetPair pilot. Never prints secret values or changes default project.

Run only after tests, secret scan and GitHub publication. Requires gcloud authenticated
with project provisioning permissions. Creates billable Cloud SQL resources described
in docs/ARCHITECTURE.md. Existing database passwords are never silently rotated.
"""
import argparse, json, os, pathlib, secrets, subprocess, tempfile, urllib.request, urllib.error, time
PROJECT='mypetpair'
NUMBER='248924650823'
REGION='us-central1'
INSTANCE='mypetpair-pilot'
RUNTIME=f'mypetpair-runtime@{PROJECT}.iam.gserviceaccount.com'
BUILDER=f'mypetpair-build@{PROJECT}.iam.gserviceaccount.com'
ROOT=pathlib.Path(__file__).resolve().parents[1]
LOCAL=ROOT/'.local'; LOCAL.mkdir(mode=0o700,exist_ok=True); LOCAL.chmod(0o700)

def run(*args, capture=False, tolerate=False):
    cmd=['gcloud',*args,f'--project={PROJECT}','--quiet']
    p=subprocess.run(cmd,text=True,stdout=subprocess.PIPE if capture else None,stderr=subprocess.PIPE if capture else None)
    if p.returncode and not tolerate:
        if capture: print((p.stderr or '').strip())
        raise RuntimeError('gcloud command failed: '+' '.join(args[:3]))
    return p.stdout.strip() if capture and p.returncode==0 else None

def exists(*args): return run(*args,capture=True,tolerate=True) is not None

def secret(name):
    return run('secrets','versions','access','latest',f'--secret={name}',capture=True)

def save_secret(name,value):
    path=LOCAL/(name+'.secret'); path.write_text(value); path.chmod(0o600)
    try:
        if not exists('secrets','describe',name,'--format=value(name)'):
            run('secrets','create',name,'--replication-policy=automatic',f'--data-file={path}')
        else: run('secrets','versions','add',name,f'--data-file={path}')
    finally: path.unlink(missing_ok=True)

def grant_sa(sa,role):
    run('projects','add-iam-policy-binding',PROJECT,f'--member=serviceAccount:{sa}',f'--role={role}','--condition=None','--format=none')

def provision():
    info=json.loads(run('projects','describe',PROJECT,'--format=json(projectId,projectNumber)',capture=True))
    if str(info['projectNumber']) != NUMBER: raise RuntimeError('Project identity mismatch')
    run('services','enable','run.googleapis.com','sqladmin.googleapis.com','secretmanager.googleapis.com','artifactregistry.googleapis.com','cloudbuild.googleapis.com','compute.googleapis.com','iam.googleapis.com','cloudresourcemanager.googleapis.com')
    for name,sa in [('mypetpair-runtime',RUNTIME),('mypetpair-build',BUILDER)]:
        if not exists('iam','service-accounts','describe',sa,'--format=value(email)'):
            run('iam','service-accounts','create',name,f'--display-name={name}')
    grant_sa(RUNTIME,'roles/cloudsql.client')
    for role in ['roles/artifactregistry.writer','roles/logging.logWriter','roles/storage.objectViewer']:
        grant_sa(BUILDER,role)
    if not exists('artifacts','repositories','describe','mypetpair',f'--location={REGION}','--format=value(name)'):
        run('artifacts','repositories','create','mypetpair',f'--location={REGION}','--repository-format=docker','--description=MyPetPair application images')
    if not exists('secrets','describe','mypetpair-invitation','--format=value(name)'):
        save_secret('mypetpair-invitation',secrets.token_urlsafe(32))
    for name in ['mypetpair-db-password','mypetpair-invitation']:
        if name=='mypetpair-db-password' and not exists('secrets','describe',name,'--format=value(name)'):
            save_secret(name,secrets.token_urlsafe(36))
        run('secrets','add-iam-policy-binding',name,f'--member=serviceAccount:{RUNTIME}','--role=roles/secretmanager.secretAccessor','--format=none')
    if not exists('sql','instances','describe',INSTANCE,'--format=value(name)'):
        run('sql','instances','create',INSTANCE,f'--region={REGION}','--database-version=POSTGRES_17','--edition=ENTERPRISE','--tier=db-f1-micro','--storage-size=10GB','--storage-type=SSD','--availability-type=zonal','--backup-start-time=03:00','--retained-backups-count=7','--deletion-protection','--assign-ip')
    dbs=json.loads(run('sql','databases','list',f'--instance={INSTANCE}','--format=json(name)',capture=True))
    if not any(x['name']=='mypetpair' for x in dbs): run('sql','databases','create','mypetpair',f'--instance={INSTANCE}')
    users=json.loads(run('sql','users','list',f'--instance={INSTANCE}','--format=json(name)',capture=True))
    if not any(x['name']=='mypetpair' for x in users):
        flags=LOCAL/'db-user-flags.json'; flags.write_text(json.dumps({'password':secret('mypetpair-db-password'),'instance':INSTANCE})); flags.chmod(0o600)
        try: run('sql','users','create','mypetpair',f'--flags-file={flags}')
        finally: flags.unlink(missing_ok=True)
    print('Provisioned pilot infrastructure; SQL connector has no authorized public networks. Secrets stored in Secret Manager.')

def build():
    dirty=subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()
    if dirty: raise RuntimeError('Commit reviewed source before building; working tree is not clean')
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    published=subprocess.check_output(['git','ls-remote','origin','refs/heads/main'],cwd=ROOT,text=True).split()
    if not published or published[0] != sha: raise RuntimeError('Push exact main commit to GitHub before building')
    image=f'{REGION}-docker.pkg.dev/{PROJECT}/mypetpair/app:{sha[:12]}'
    submitted=json.loads(run('builds','submit',str(ROOT),'--config='+str(ROOT/'cloudbuild.yaml'),f'--substitutions=_IMAGE={image}',f'--region={REGION}',f'--service-account=projects/{PROJECT}/serviceAccounts/{BUILDER}','--default-buckets-behavior=regional-user-owned-bucket','--async','--format=json',capture=True))
    if isinstance(submitted,list): submitted=submitted[0]
    if not submitted.get('id'): raise RuntimeError('Build submitted but missing ID; inspect Cloud Build')
    state={'image':image,'commit':sha,'buildId':submitted['id']}
    (LOCAL/'deployment.json').write_text(json.dumps(state,indent=2))
    print(json.dumps(state))

def deploy():
    state=json.loads((LOCAL/'deployment.json').read_text())
    status=run('builds','describe',state['buildId'],f'--region={REGION}','--format=value(status)',capture=True)
    if status!='SUCCESS': raise RuntimeError('Build not successful yet: '+str(status))
    admin=''
    if (LOCAL/'operator.json').exists(): admin=json.loads((LOCAL/'operator.json').read_text())['id']
    env={'DB_URL':f'jdbc:postgresql:///mypetpair?cloudSqlInstance={PROJECT}:{REGION}:{INSTANCE}&socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlRefreshStrategy=lazy','DB_USERNAME':'mypetpair','APP_INVITATION_REQUIRED':'true','APP_SEED':'false','APP_ADMIN_OWNER_IDS':admin,'CORS_ALLOWED_ORIGINS':''}
    path=LOCAL/'run-env.json'; path.write_text(json.dumps(env)); path.chmod(0o600)
    run('run','deploy','mypetpair',f'--region={REGION}',f'--image={state["image"]}',f'--service-account={RUNTIME}',f'--add-cloudsql-instances={PROJECT}:{REGION}:{INSTANCE}',f'--env-vars-file={path}','--set-secrets=DB_PASSWORD=mypetpair-db-password:latest,APP_INVITATION_CODE=mypetpair-invitation:latest','--memory=1Gi','--cpu=1','--min-instances=0','--max-instances=2','--concurrency=20','--timeout=60','--allow-unauthenticated','--port=8080')
    url=run('run','services','describe','mypetpair',f'--region={REGION}','--format=value(status.url)',capture=True)
    state['url']=url; (LOCAL/'deployment.json').write_text(json.dumps(state,indent=2))
    print('Application URL: '+url)

def bootstrap():
    state=json.loads((LOCAL/'deployment.json').read_text()); url=state['url']
    if (LOCAL/'operator.json').exists(): print('Operator already recorded; no bootstrap repeated.'); return
    pwd=secrets.token_urlsafe(24)
    payload={'email':'operator@mypetpair.example','password':pwd,'displayName':'MyPetPair operator','adultConfirmed':True,'termsAccepted':True,'invitationCode':secret('mypetpair-invitation')}
    req=urllib.request.Request(url+'/api/auth/register',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
    result=json.loads(urllib.request.urlopen(req,timeout=60).read())
    # Revoke one-time bootstrap session immediately. Password is retained only in Secret Manager.
    urllib.request.urlopen(urllib.request.Request(url+'/api/auth/logout',data=b'',headers={'Authorization':'Bearer '+result['token']},method='POST'),timeout=30).read()
    save_secret('mypetpair-operator-password',pwd)
    operator={'id':result['user']['id'],'email':'operator@mypetpair.example'}
    (LOCAL/'operator.json').write_text(json.dumps(operator,indent=2))
    run('run','services','update','mypetpair',f'--region={REGION}',f'--update-env-vars=APP_ADMIN_OWNER_IDS={operator["id"]}')
    print('Operator provisioned; login email operator@mypetpair.example; password in Secret Manager mypetpair-operator-password. No credential printed.')

parser=argparse.ArgumentParser(); parser.add_argument('stage',choices=['provision','build','deploy','bootstrap']); args=parser.parse_args()
{'provision':provision,'build':build,'deploy':deploy,'bootstrap':bootstrap}[args.stage]()
