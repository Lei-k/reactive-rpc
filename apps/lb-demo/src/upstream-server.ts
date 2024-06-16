import { createServer } from 'http';

import express from 'express';

import { Observable, Subscriber } from 'rxjs';

import { ReactiveRpcServer } from '@reactive-rpc/server';
import { exit } from 'process';

if (!process.argv[2]) {
  exit(-1);
}

const serverNumber = process.argv[2];

const app = express();
const server = createServer(app);

async function delay(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

const rpcServer = new ReactiveRpcServer(server);

async function processFile() {
  const observe = async (subscriber: Subscriber<any>) => {
    let progress = 0.0;

    while (progress < 1.0) {
      subscriber.next([serverNumber, 100 * progress]);

      progress += Math.random() * 0.005;

      await delay(20);
    }

    subscriber.next([serverNumber, 100.0]);
    subscriber.complete();
  };

  let observable = new Observable(subscriber => {
    observe(subscriber);
  });

  return observable;
}

async function plateRecognize(rate: any) {
  const observe = async (subscriber: Subscriber<any>) => {
    let start = 'A'.charCodeAt(0);
    let end = 'Z'.charCodeAt(0);

    let counter = 0;

    while (counter < 100) {
      let alphabets = '';

      for (let i = 0; i < 3; i++) {
        alphabets += String.fromCharCode(
          start + Math.floor(Math.random() * (end - start + 1))
        );
      }

      let nums = (Math.floor(Math.random() * 9999) + '').padStart(4, '0');

      let plate = alphabets + nums;

      subscriber.next([serverNumber, plate]);

      await delay(100);

      counter++;
    }

    subscriber.complete();
  };

  let observable = new Observable(subscriber => {
    observe(subscriber);
  });

  return observable;
}

rpcServer.registerMethod({
  method: 'processFile',
  handler: processFile,
  throttle: 100,
  //debounce: 1000
});

rpcServer.registerMethod({
  method: 'plateRecognize',
  handler: plateRecognize,
  throttle: 100,
  //debounce: 1000
});

let port = 3000 + Number(serverNumber);

server.listen(port);
console.log(`[${Number(serverNumber)}]: listen at ${port} port`);
