export type JSONRPCID = string | number;

export type JSONRPCRequestBody = {
  method: string;
  params: any[];
  jsonrpc: '2.0';
  id: JSONRPCID;
};

export type JSONRPCResponseBody = {
  result: any;
  error: {
    code: number;
    message: string;
    data: any;
  };
  jsonrpc: '2.0';
  id: JSONRPCID;
};

export enum JSONRPCErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

export enum JSONRPCErrorMessage {
  ParseError = 'Parse Error',
  InvalidRequest = 'Invalid Request',
  MethodNotFound = 'Method not found',
  InvalidParams = 'Invalid params',
  InternalError = 'Internal error',
}

export class JSONRPCError extends Error {
  code: JSONRPCErrorCode;
  message: JSONRPCErrorMessage;

  constructor(code: JSONRPCErrorCode, message: JSONRPCErrorMessage) {
    super();

    this.code = code;
    this.message = message;
  }
}

export interface JSONRPCMethodConfig {
  method: string;
  debounce?: number;
  throttle?: number;
  handler: (...args: any[]) => any;
}

export function validateJSONRPCRequestBody(reqbody: JSONRPCRequestBody) {
  const { method, params, jsonrpc } = reqbody;

  if (!method || !params || !jsonrpc) {
    return new JSONRPCError(
      JSONRPCErrorCode.InvalidParams,
      JSONRPCErrorMessage.InvalidParams
    );
  }

  if (!['2.0'].includes(jsonrpc)) {
    return new JSONRPCError(
      JSONRPCErrorCode.InvalidParams,
      JSONRPCErrorMessage.InvalidParams
    );
  }

  if (!(params instanceof Array)) {
    return new JSONRPCError(
      JSONRPCErrorCode.InvalidParams,
      JSONRPCErrorMessage.InvalidParams
    );
  }

  if (typeof method !== 'string') {
    return new JSONRPCError(
      JSONRPCErrorCode.InvalidParams,
      JSONRPCErrorMessage.InvalidParams
    );
  }
}

export interface Socket {
  id: number | string,
  on<Ev extends string>(evt: Ev, listener: (...args: any[]) => void): void,
  emit<Ev extends string>(evt: Ev, ...args: any[]): void
}

export interface Transport {
  on(evt: 'connection', listener: (socket: Socket) => void): void
}

export interface ClientTransport {
  on<Ev extends string>(evt: Ev, listener: (...args: any[]) => void): void,
  emit<Ev extends string>(evt: Ev, ...args: any[]): void,
  close(): void,
  removeListener<Ev extends string>(evt: Ev, listener: (...args: any[]) => void): void
}
