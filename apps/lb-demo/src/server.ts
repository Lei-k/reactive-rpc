import { createServer } from 'http';

import express from 'express';

import { Observable, merge } from 'rxjs';

import { ReactiveRpcClient } from '@reactive-rpc/client';
import { ReactiveRpcServer } from '@reactive-rpc/server';

const app = express();
const server = createServer(app);

const upstream1 = new ReactiveRpcClient({
  url: 'http://localhost:3001',
});

const upstream2 = new ReactiveRpcClient({
  url: 'http://localhost:3002',
});

const server1 = {
  processFile: upstream1.makeObservableMethod<() => Observable<any>>({
    method: 'processFile',
    timeout: 15000,
  }),
  plateRecognize: upstream1.makeObservableMethod<() => Observable<any>>({
    method: 'plateRecognize',
    timeout: 15000,
  }),
};

const server2 = {
  processFile: upstream2.makeObservableMethod<() => Observable<any>>({
    method: 'processFile',
    timeout: 15000,
  }),
  plateRecognize: upstream2.makeObservableMethod<() => Observable<any>>({
    method: 'plateRecognize',
    timeout: 15000,
  }),
};

async function delay(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

const rpcServer = new ReactiveRpcServer(server);

async function processFile() {
  return merge(server1.processFile(), server2.processFile());
}

async function plateRecognize(rate: any) {
  return merge(server1.plateRecognize(), server2.plateRecognize());
}

rpcServer.registerMethod({
  method: 'processFile',
  handler: processFile,
  //throttle: 100,
  //debounce: 1000
});

rpcServer.registerMethod({
  method: 'plateRecognize',
  handler: plateRecognize,
  //throttle: 100,
  //debounce: 1000
});

server.listen(3000);

console.log(`[lb]: listen at 3000 port`);
