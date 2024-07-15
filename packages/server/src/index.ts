import {
  JSONRPCError,
  JSONRPCErrorCode,
  JSONRPCErrorMessage,
  JSONRPCID,
  JSONRPCMethodConfig,
  JSONRPCRequestBody,
  Socket,
  Transport,
  validateJSONRPCRequestBody,
} from '@reactive-rpc/core';
import assert from 'assert';
import { Observable, debounce, interval, throttle } from 'rxjs';

export interface ReactiveRpcServerOpts {
  [key: string]: any,
  endpoint: string
}

const defaultOpts: ReactiveRpcServerOpts = {
  endpoint: 'rxrpc'
}

export class ReactiveRpcServer {
  private transport?: Transport;
  private rpcMap: { [key: string]: JSONRPCMethodConfig };
  private opts: ReactiveRpcServerOpts;

  private endpoint: string;

  constructor(opts: ReactiveRpcServerOpts = defaultOpts) {
    this.rpcMap = {};

    this.opts = opts;

    for(let key in defaultOpts) {
      if(!this.opts[key]) {
        this.opts = defaultOpts[key];
      }
    }

    this.endpoint = this.opts.endpoint;
  }

  useTransport(transport: Transport) {
    assert(this.transport == null, 'can not set transport twice!');

    this.transport = transport;

    this.setupTransport();
  }

  registerMethod(config: JSONRPCMethodConfig) {
    this.rpcMap[config.method] = config;
  }

  private respJsonRpcError(
    socket: Socket,
    id: JSONRPCID,
    rpcError: JSONRPCError
  ) {
    let errResp = {
      jsonrpc: '2.0',
      error: {
        code: rpcError.code,
        message: rpcError.message,
      },
      id: id,
    };

    socket.emit(this.endpoint, errResp);
  }

  private wrapUnaryResp(
    socket: Socket,
    reqbody: JSONRPCRequestBody,
    result: any
  ) {
    socket.emit(this.endpoint, {
      jsonrpc: '2.0',
      result: {
        type: 'unary',
        value: result,
      },
      id: reqbody.id,
    });
  }

  private wrapObservableResp(
    socket: Socket,
    config: JSONRPCMethodConfig,
    reqbody: JSONRPCRequestBody,
    result: Observable<any>
  ) {
    let observer = {
      next: (result: any) => {
        socket.emit(this.endpoint, {
          jsonrpc: '2.0',
          result: {
            type: 'event',
            value: result,
          },
          id: reqbody.id,
        });
      },
      complete: () => {
        socket.emit(this.endpoint, {
          jsonrpc: '2.0',
          result: {
            type: 'event:complete',
            value: null,
          },
          id: reqbody.id,
        });
      },
      error: (err: any) => {
        socket.emit(this.endpoint, {
          jsonrpc: '2.0',
          result: {
            type: 'event:error',
            value: err,
          },
          id: reqbody.id,
        });
      },
    };

    socket.emit(this.endpoint, {
      jsonrpc: '2.0',
      result: {
        type: 'observable',
        value: null,
      },
      id: reqbody.id,
    });

    if (config.throttle) {
      result = result.pipe(throttle(() => interval(config.throttle)));
    }

    if (config.debounce) {
      result = result.pipe(debounce(() => interval(config.debounce)));
    }

    result.subscribe(observer);
  }

  private wrapResp(
    socket: Socket,
    config: JSONRPCMethodConfig,
    reqbody: JSONRPCRequestBody,
    result: any
  ) {
    if (result instanceof Observable) {
      this.wrapObservableResp(socket, config, reqbody, result);
    } else {
      this.wrapUnaryResp(socket, reqbody, result);
    }
  }

  private setupTransport() {
    assert(this.transport != null, 'must set transport first.');

    this.transport.on('connection', socket => {
      console.log(`socket[${socket.id}] connected`);

      socket.on(this.endpoint, async (reqbody: JSONRPCRequestBody) => {
        console.log('receieve rpc: ' + JSON.stringify(reqbody));

        let err = validateJSONRPCRequestBody(reqbody);

        if (err) {
          this.respJsonRpcError(socket, reqbody.id, err);

          return;
        }

        if (!this.rpcMap[reqbody.method]) {
          let rpcError = new JSONRPCError(
            JSONRPCErrorCode.MethodNotFound,
            JSONRPCErrorMessage.MethodNotFound
          );

          this.respJsonRpcError(socket, reqbody.id, rpcError);

          return;
        }

        try {
          let config = this.rpcMap[reqbody.method];

          let result = await config.handler(...reqbody.params);

          this.wrapResp(socket, config, reqbody, result);
        } catch (err) {
          let rpcError = new JSONRPCError(
            JSONRPCErrorCode.InternalError,
            JSONRPCErrorMessage.InternalError
          );

          this.respJsonRpcError(socket, reqbody.id, rpcError);
        }
      });
    });
  }
}
