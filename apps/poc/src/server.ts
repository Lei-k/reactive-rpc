import { createServer } from 'http';



import express from 'express';


import { Observable, Subscriber, interval, throttle } from 'rxjs';

import { createProxyMiddleware } from 'http-proxy-middleware';
import { ReactiveRpc } from './reactive-rpc';

const dev = process.env.NODE_ENV !== 'production';

const app = express();
const server = createServer(app);


app.use('/', createProxyMiddleware({
  target: 'http://localhost:3006'
}))

async function delay (ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms)
  })
}

const rpc = ReactiveRpc(server);


async function uploadFile () {
  const observe = async (subscriber: Subscriber<any>) => {
    let progress = 0.0;

    while (progress < 1.0) {
      subscriber.next(100 * progress);

      progress += Math.random() * 0.005;

      await delay(20);
    }

    subscriber.next(100.0);
    subscriber.complete();
  }


  let observable = new Observable((subscriber) => {
    observe(subscriber);
  });

  return observable;
}

async function recognize (rate: any) {
  const observe = async (subscriber: Subscriber<any>) => {
    let start = 'A'.charCodeAt(0);
    let end = 'Z'.charCodeAt(0);

    let counter = 0;

    while (counter < 100) {
      let alphabets = '';

      for (let i = 0; i < 3; i++) {
        alphabets += String.fromCharCode(start + Math.floor(Math.random() * (end - start + 1)))
      }

      let nums = (Math.floor(Math.random() * 9999) + '').padStart(4, '0');

      let plate = alphabets + nums;

      subscriber.next(plate);

      await delay(100);

      counter++;
    }

    subscriber.complete();
  }


  let observable = new Observable((subscriber) => {
    observe(subscriber);
  });

  return observable.pipe(throttle(() => interval(Number(rate))));
}

rpc.regist({
  method: 'chat',
  handler: uploadFile,
  throttle: 100,
  //debounce: 1000
})

server.listen(3000);
