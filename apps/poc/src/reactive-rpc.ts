import { Server } from 'http';
import { Observable, debounce, interval, throttle } from 'rxjs';
import SocketIO from 'socket.io';

type JSONRPCRequestBody = {
  method: string,
  params: any[],
  jsonrpc: '2.0',
  id: number | string
}

type JSONRPCResponseBody = {
  result: any,
  error: {
    code: number,
    message: string,
    data: any
  },
  jsonrpc: '2.0',
  id: number | string
}

enum JSONRPCErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

enum JSONRPCErrorMessage {
  ParseError = 'Parse Error',
  InvalidRequest = 'Invalid Request',
  MethodNotFound = 'Method not found',
  InvalidParams = 'Invalid params',
  InternalError = 'Internal error'
}

type JSONRPCID = string | number;

class JSONRPCError extends Error {
  code: JSONRPCErrorCode;
  message: JSONRPCErrorMessage;

  constructor(code: JSONRPCErrorCode, message: JSONRPCErrorMessage) {
    super();

    this.code = code;
    this.message = message;
  }
}

interface JSONRPCMethodConfig {
  method: string,
  debounce?: number,
  throttle?: number,
  handler: (...args: any[]) => any
}

function validateJSONRPCRequestBody (reqbody: JSONRPCRequestBody) {
  const { method, params, jsonrpc } = reqbody;

  if (!method || !params || !jsonrpc) {
    return new JSONRPCError(JSONRPCErrorCode.InvalidParams, JSONRPCErrorMessage.InvalidParams)
  }

  if (!['2.0'].includes(jsonrpc)) {
    return new JSONRPCError(JSONRPCErrorCode.InvalidParams, JSONRPCErrorMessage.InvalidParams)
  }

  if (!(params instanceof Array)) {
    return new JSONRPCError(JSONRPCErrorCode.InvalidParams, JSONRPCErrorMessage.InvalidParams)
  }

  if (typeof method !== 'string') {
    return new JSONRPCError(JSONRPCErrorCode.InvalidParams, JSONRPCErrorMessage.InvalidParams)
  }
}

export function ReactiveRpc (server: Server) {
  const io = new SocketIO.Server(server);

  let rpcMap = {} as { [key: string]: JSONRPCMethodConfig }

  function registRpc (config: JSONRPCMethodConfig) {
    rpcMap[config.method] = config;
  }

  function respJsonRpcError (socket: SocketIO.Socket, id: JSONRPCID, rpcError: JSONRPCError) {
    let errResp = {
      jsonrpc: '2.0',
      error: {
        code: rpcError.code,
        message: rpcError.message
      },
      id: id
    }

    socket.emit('jsonrpc', errResp)
  }

  io.on('connection', socket => {
    console.log(`socket[${socket.id}] connected`);

    socket.on('disconnect', () => {
      console.log(`socket[${socket.id}] disconnected`);
    });

    socket.on('chat message', (msg) => {
      console.log('message: ' + msg);

      io.emit('chat message', msg);
    });

    socket.on('jsonrpc', async (reqbody: JSONRPCRequestBody) => {
      console.log('receieve rpc: ' + JSON.stringify(reqbody));

      let err = validateJSONRPCRequestBody(reqbody);

      if (err) {
        respJsonRpcError(socket, reqbody.id, err);

        return;
      }

      if (rpcMap[reqbody.method]) {
        try {
          let config = rpcMap[reqbody.method];

          let result = await config.handler(...reqbody.params);

          if (result instanceof Observable) {
            let subscriber = {
              next: (result: any) => {
                socket.emit('jsonrpc', {
                  jsonrpc: '2.0',
                  result: {
                    type: 'event',
                    value: result
                  },
                  id: reqbody.id
                })
              },
              complete: () => {
                socket.emit('jsonrpc', {
                  jsonrpc: '2.0',
                  result: {
                    type: 'event:complete',
                    value: null
                  },
                  id: reqbody.id
                })
              }
            }

            socket.emit('jsonrpc', {
              jsonrpc: '2.0',
              result: {
                type: 'observable',
                value: null
              },
              id: reqbody.id
            })

            if (config.throttle) {
              result = result.pipe(throttle(() => interval(config.throttle)))
            }

            if (config.debounce) {
              result = result.pipe(debounce(() => interval(config.debounce)))
            }

            result.subscribe(subscriber);
          } else {
            socket.emit('jsonrpc', {
              jsonrpc: '2.0',
              result: {
                type: 'unobservable',
                value: result
              },
              id: reqbody.id
            })
          }
        } catch (err) {
          let rpcError = new JSONRPCError(JSONRPCErrorCode.InternalError, JSONRPCErrorMessage.InternalError);

          respJsonRpcError(socket, reqbody.id, rpcError);
        }
      } else {
        let rpcError = new JSONRPCError(JSONRPCErrorCode.MethodNotFound, JSONRPCErrorMessage.MethodNotFound);

        respJsonRpcError(socket, reqbody.id, rpcError);
      }
    })
  })

  return {
    regist: registRpc
  };
}
