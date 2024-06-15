import { nanoid } from "nanoid";
import { Observable, Subscriber } from "rxjs";
import { io } from "socket.io-client";

const socket = io();

const rpcMap = {};

const observableMap = {} as { [key: string]: Observable<any> };

interface MethodConfig {
  method: string;
  timeout?: number;
}

export function makeMethod<R extends (...args: any[]) => Promise<any>> (
  config: MethodConfig
) {
  async function m (...args: any[]) {
    let id = nanoid();

    let p = new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject('timeout');
      }, config.timeout ?? 15000);

      let subscriber: Subscriber<any> | null = null;

      let observe = (_subscriber: Subscriber<any>) => {
        subscriber = _subscriber;
      };

      socket.on('jsonrpc', resp => {
        if (resp.id !== id) {
          return;
        }

        clearTimeout(timeout);

        if (resp.error) {
          reject(resp.error);
        }

        if (
          ['observable', 'event', 'event:complete'].includes(resp.result.type)
        ) {
          if (!observableMap[resp.result.id]) {
            let o = new Observable(observe);

            observableMap[resp.result.id] = o;

            resolve(o);
            subscriber && subscriber.next(resp.result.value);
          } else if (resp.result.type === 'event') {
            subscriber && subscriber.next(resp.result.value);
          } else if (resp.result.type === 'event:complete') {
            subscriber && subscriber.complete();

            subscriber = null;
          }
        } else {
          resolve(resp.result.value);
        }
      });

      socket.emit('jsonrpc', {
        jsonrpc: '2.0',
        params: args,
        id: id,
        method: config.method,
      });
    });

    return p;
  }

  return m as any as R;
}

export function makeObservableMethod<R extends (...args: any[]) => Observable<any>> (
  config: MethodConfig
) {
  function m (...args: any[]) {
    let id = nanoid();

    let subscriber: Subscriber<any> | null = null;

    let observe = (_subscriber: Subscriber<any>) => {
      subscriber = _subscriber;
    };

    let timeout = setTimeout(() => {
      subscriber && subscriber.error(new Error('timeout'));
    }, config.timeout ?? 15000);

    let o = new Observable(observe);

    socket.on('jsonrpc', resp => {
      if (resp.id !== id) {
        return;
      }

      clearTimeout(timeout);

      if (resp.error) {
        subscriber && subscriber.error(resp.error);
      }

      if (resp.result.type === 'event' || resp.result.type === 'observable') {
        subscriber && subscriber.next(resp.result.value);
      } else if (resp.result.type === 'event:complete') {
        console.log('check');
        subscriber && subscriber.complete();

        subscriber = null;
      }
    });

    socket.emit('jsonrpc', {
      jsonrpc: '2.0',
      params: args,
      id: id,
      method: config.method,
    });

    return o;
  }

  return m as any as R;
}
