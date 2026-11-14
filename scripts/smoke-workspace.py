#!/usr/bin/env python3
"""Exercise the built Go server through every independent Next.js proxy, then stop all processes."""
import json,os,signal,subprocess,tempfile,time,urllib.request,urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def get(url):
    try:
        with urllib.request.urlopen(url,timeout=4) as response:return response.status,response.read()
    except urllib.error.HTTPError as e:return e.code,e.read()
def wait(url,process):
    for _ in range(100):
        if process.poll() is not None:raise RuntimeError('server exited before readiness')
        try:return get(url)
        except (OSError,TimeoutError):time.sleep(.1)
    raise RuntimeError(f'timed out: {url}')
with tempfile.TemporaryDirectory(prefix='wolly-smoke-') as tmp:
    binary=Path(tmp)/'api';processes=[];logs=[]
    subprocess.run(['go','build','-o',str(binary),'./cmd/api'],cwd=root/'backend/go',check=True)
    try:
        log=open(Path(tmp)/'api.log','w+');logs.append(log)
        api=subprocess.Popen([str(binary)],env={**os.environ,'WOLLY_HTTP_ADDRESS':'127.0.0.1:18080'},stdout=log,stderr=log,start_new_session=True);processes.append(api)
        assert wait('http://127.0.0.1:18080/api/v1/health/live',api)[0]==200
        assert get('http://127.0.0.1:18080/api/v1/health/ready')[0]==503
        for index,name in enumerate(['storefront','creator-hub','backoffice','blog']):
            port=18100+index;log=open(Path(tmp)/f'{name}.log','w+');logs.append(log)
            web=subprocess.Popen(['npm','exec','--workspace',f'@wolly/{name}','--','next','start','--port',str(port)],cwd=root,env={**os.environ,'WOLLY_API_ORIGIN':'http://127.0.0.1:18080'},stdout=log,stderr=log,start_new_session=True);processes.append(web)
            origin=f'http://127.0.0.1:{port}'
            assert wait(origin,web)[0]==200
            status,body=get(origin+'/api/v1/capabilities');data=json.loads(body)['data']
            assert status==200 and data['contractVersion']=='v1' and all(not m['enabled'] for m in data['modules'])
            assert get(origin+'/api/v1/health/ready')[0]==503
            assert get(origin+'/api/v1/unimplemented')[0]==404
            os.killpg(web.pid,signal.SIGTERM);web.wait(timeout=5);processes.remove(web)
            print(f'{name}: page, proxy, disabled capabilities, unavailable business readiness and rejected unknown route passed')
    except Exception:
        for log in logs:
            log.flush();log.seek(0);print(log.read()[-3000:])
        raise
    finally:
        for process in processes:
            if process.poll() is None:
                os.killpg(process.pid,signal.SIGTERM)
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);process.wait()
        for log in logs:log.close()
