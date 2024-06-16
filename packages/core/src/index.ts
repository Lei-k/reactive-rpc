export type JSONRPCRequestBody = {
  method: string;
  params: any[];
  jsonrpc: '2.0';
  id: number | string;
};

export type JSONRPCResponseBody = {
  result: any;
  error: {
    code: number;
    message: string;
    data: any;
  };
  jsonrpc: '2.0';
  id: number | string;
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

export type JSONRPCID = string | number;

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
