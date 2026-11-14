"use client";
import {useEffect, useState} from 'react';
import {createApiClient, type CapabilitiesEnvelope} from '@wolly/api-client';
export default function Page() {
 const [data,setData]=useState<CapabilitiesEnvelope|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController(); setError('');setData(null);
 createApiClient('/api/v1').capabilities(AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])).then(setData).catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Connection failed')});
 return ()=>controller.abort();},[attempt]);
 return <main><p className="eyebrow">Wolly · Go rebuild</p><h1>Reader storefront</h1><p>This app is an independent API integration workspace. Product features are being rebuilt.</p>
 {error ? <section role="alert"><p>{error}</p><button onClick={()=>setAttempt(attempt+1)}>Retry connection</button></section> : !data ? <p role="status">Connecting to Wolly…</p> : <section><h2>API connected</h2><p>Contract {data.data.contractVersion}. Business capabilities remain disabled.</p><ul>{data.data.modules.map(item=><li key={item.id}>{item.id} <span>{item.enabled?'Available':'Planned'}</span></li>)}</ul></section>}</main>;
}
