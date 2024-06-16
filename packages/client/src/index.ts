import { Observable, Subscriber } from 'rxjs';
import io, { Socket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';

const observableMap = {} as { [key: string]: Observable<any> };

interface MethodConfig {
  method: string;
  timeout?: number;
}

interface ObservableMethodConfig {
  method: string;
  timeout?: number;
  interArrivalTimeout?: number;
}

interface ReactiveRpcClientConfig {
  url?: string;
  path?: string;
}

class ReactiveRpcClient {
  private config: ReactiveRpcClientConfig;
  private socket: Socket;

  constructor(config?: ReactiveRpcClientConfig) {
    this.config = config || {};

    let url =
      this.config.url || window.location.protocol + '//' + window.location.host;

    this.socket = io(url, {
      path: this.config.path,
    });
  }

  close() {
    this.socket.close();
  }

  makeMethod<R extends (...args: any[]) => Promise<any>>(config: MethodConfig) {
    const m = async (...args: any[]) => {
      let id = uuid();

      let p = new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
          reject('timeout');
        }, config.timeout ?? 15000);

        let subscriber: Subscriber<any> | null = null;

        let observe = (_subscriber: Subscriber<any>) => {
          subscriber = _subscriber;
        };

        this.socket.on('jsonrpc', resp => {
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

        this.socket.emit('jsonrpc', {
          jsonrpc: '2.0',
          params: args,
          id: id,
          method: config.method,
        });
      });

      return p;
    };

    return m as any as R;
  }

  makeObservableMethod<R extends (...args: any[]) => Observable<any>>(
    config: ObservableMethodConfig
  ) {
    const m = (...args: any[]) => {
      let id = uuid();

      let subscriber: Subscriber<any> | null = null;

      let observe = (_subscriber: Subscriber<any>) => {
        subscriber = _subscriber;
      };

      let timeout: NodeJS.Timeout | null = setTimeout(() => {
        this.socket.removeListener('jsonrpc', handler);

        subscriber && subscriber.error(new Error('timeout'));
      }, config.timeout ?? 15000);

      let o = new Observable(observe);

      let handler = (resp: any) => {
        if (!resp) return;
        if (resp.id !== id) {
          return;
        }

        if (timeout) {
          clearTimeout(timeout);

          timeout = null;
        }

        if (config.interArrivalTimeout && config.interArrivalTimeout > 0) {
          timeout = setTimeout(() => {
            this.socket.removeListener('jsonrpc', handler);

            subscriber && subscriber.error(new Error('timeout'));
          }, config.interArrivalTimeout);
        }

        if (resp.error) {
          // remove handler when error occure
          this.socket.removeListener('jsonrpc', handler);

          subscriber && subscriber.error(resp.error);
        }

        if (resp.result.type === 'observable') {
          // first message arrive
        } else if (resp.result.type === 'event') {
          subscriber && subscriber.next(resp.result.value);
        } else if (resp.result.type === 'event:complete') {
          subscriber && subscriber.complete();

          subscriber = null;

          // remove handler when event:complete arrive
          this.socket.removeListener('jsonrpc', handler);
        }
      };

      this.socket.on('jsonrpc', handler);

      this.socket.emit('jsonrpc', {
        jsonrpc: '2.0',
        params: args,
        id: id,
        method: config.method,
      });

      return o;
    };

    return m as any as R;
  }
}

export { ReactiveRpcClient };
export default ReactiveRpcClient;
