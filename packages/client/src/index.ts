import { Observable, Subscriber } from 'rxjs';
import { ClientTransport } from '@reactive-rpc/core';

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
  [key: string]: any,
  endpoint: string
}

const defaultConfig: ReactiveRpcClientConfig = {
  endpoint: 'rxrpc'
}

class ReactiveRpcClient {
  private config: ReactiveRpcClientConfig;
  private transport?: ClientTransport;
  private _id: number;
  private endpoint: string;

  constructor(config: ReactiveRpcClientConfig = defaultConfig) {
    this.config = config;

    for(let key in defaultConfig) {
      if(!this.config[key]) {
        this.config[key] = defaultConfig[key];
      }
    }

    this._id = 0;

    this.endpoint = this.config.endpoint;
  }

  useTransport(transport: ClientTransport) {
    this.transport = transport;
  }

  close() {
    if(!this.transport) return;

    this.transport.close();
  }

  makeMethod<R extends (...args: any[]) => Promise<any>>(config: MethodConfig) {
    const m = async (...args: any[]) => {
      if(!this.transport) {
        throw new Error('please set transport first.')
      }

      let transport: ClientTransport = this.transport;

      this._id = (this._id + 1) % Number.MAX_SAFE_INTEGER;

      let id = this._id;

      let p = new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
          reject('timeout');
        }, config.timeout ?? 15000);

        let subscriber: Subscriber<any> | null = null;

        let observe = (_subscriber: Subscriber<any>) => {
          subscriber = _subscriber;
        };

        transport.on(this.endpoint, resp => {
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

        transport.emit(this.endpoint, {
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
      if(!this.transport) {
        throw new Error('please set transport first.')
      }

      let transport: ClientTransport = this.transport;

      this._id = (this._id + 1) % Number.MAX_SAFE_INTEGER;

      let id = this._id;

      let subscriber: Subscriber<any> | null = null;

      let observe = (_subscriber: Subscriber<any>) => {
        subscriber = _subscriber;
      };

      let timeout: NodeJS.Timeout | null = setTimeout(() => {
        transport.removeListener(this.endpoint, handler);

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
            transport.removeListener(this.endpoint, handler);

            subscriber && subscriber.error(new Error('timeout'));
          }, config.interArrivalTimeout);
        }

        if (resp.error) {
          // remove handler when error occure
          transport.removeListener(this.endpoint, handler);

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
          transport.removeListener(this.endpoint, handler);
        }
      };

      transport.on(this.endpoint, handler);

      transport.emit(this.endpoint, {
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
