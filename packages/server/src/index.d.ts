import { JSONRPCMethodConfig, Transport } from '@reactive-rpc/core';
export interface ReactiveRpcServerOpts {
    [key: string]: any;
    endpoint: string;
}
export declare class ReactiveRpcServer {
    private transport?;
    private rpcMap;
    private opts;
    private endpoint;
    constructor(opts?: ReactiveRpcServerOpts);
    useTransport(transport: Transport): void;
    registerMethod(config: JSONRPCMethodConfig): void;
    private respJsonRpcError;
    private wrapUnaryResp;
    private wrapObservableResp;
    private wrapResp;
    private setupTransport;
}
//# sourceMappingURL=index.d.ts.map