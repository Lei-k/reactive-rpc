import {
  JSONRPCError,
  JSONRPCErrorCode,
  JSONRPCErrorMessage,
  JSONRPCID,
  JSONRPCMethodConfig,
  JSONRPCRequestBody,
  validateJSONRPCRequestBody,
} from '@reactive-rpc/core';
import { Server } from 'http';
import { Observable, debounce, interval, throttle } from 'rxjs';

import SocketIO from 'socket.io';

export class ReactiveRpcServer {
  private io: SocketIO.Server;
  private rpcMap: { [key: string]: JSONRPCMethodConfig };

  constructor(server: Server) {
    this.io = new SocketIO.Server(server);
    this.rpcMap = {};

    this.setupIO();
  }

  registerMethod(config: JSONRPCMethodConfig) {
    this.rpcMap[config.method] = config;
  }

  private respJsonRpcError(
    socket: SocketIO.Socket,
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

    socket.emit('jsonrpc', errResp);
  }

  private wrapUnaryResp(
    socket: SocketIO.Socket,
    reqbody: JSONRPCRequestBody,
    result: any
  ) {
    socket.emit('jsonrpc', {
      jsonrpc: '2.0',
      result: {
        type: 'unary',
        value: result,
      },
      id: reqbody.id,
    });
  }

  private wrapObservableResp(
    socket: SocketIO.Socket,
    config: JSONRPCMethodConfig,
    reqbody: JSONRPCRequestBody,
    result: Observable<any>
  ) {
    let observer = {
      next: (result: any) => {
        socket.emit('jsonrpc', {
          jsonrpc: '2.0',
          result: {
            type: 'event',
            value: result,
          },
          id: reqbody.id,
        });
      },
      complete: () => {
        socket.emit('jsonrpc', {
          jsonrpc: '2.0',
          result: {
            type: 'event:complete',
            value: null,
          },
          id: reqbody.id,
        });
      },
      error: (err: any) => {
        socket.emit('jsonrpc', {
          jsonrpc: '2.0',
          result: {
            type: 'event:error',
            value: err,
          },
          id: reqbody.id,
        });
      },
    };

    socket.emit('jsonrpc', {
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
    socket: SocketIO.Socket,
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

  private setupIO() {
    this.io.on('connection', socket => {
      console.log(`socket[${socket.id}] connected`);

      socket.on('jsonrpc', async (reqbody: JSONRPCRequestBody) => {
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
