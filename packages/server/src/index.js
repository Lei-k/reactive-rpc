"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactiveRpcServer = void 0;
const core_1 = require("@reactive-rpc/core");
const assert_1 = __importDefault(require("assert"));
const rxjs_1 = require("rxjs");
const defaultOpts = {
    endpoint: 'rxrpc'
};
class ReactiveRpcServer {
    constructor(opts = defaultOpts) {
        this.rpcMap = {};
        this.opts = opts;
        for (let key in defaultOpts) {
            if (!this.opts[key]) {
                this.opts = defaultOpts[key];
            }
        }
        this.endpoint = this.opts.endpoint;
    }
    useTransport(transport) {
        (0, assert_1.default)(this.transport == null, 'can not set transport twice!');
        this.transport = transport;
        this.setupTransport();
    }
    registerMethod(config) {
        this.rpcMap[config.method] = config;
    }
    respJsonRpcError(socket, id, rpcError) {
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
    wrapUnaryResp(socket, reqbody, result) {
        socket.emit(this.endpoint, {
            jsonrpc: '2.0',
            result: {
                type: 'unary',
                value: result,
            },
            id: reqbody.id,
        });
    }
    wrapObservableResp(socket, config, reqbody, result) {
        let observer = {
            next: (result) => {
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
            error: (err) => {
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
            result = result.pipe((0, rxjs_1.throttle)(() => (0, rxjs_1.interval)(config.throttle)));
        }
        if (config.debounce) {
            result = result.pipe((0, rxjs_1.debounce)(() => (0, rxjs_1.interval)(config.debounce)));
        }
        result.subscribe(observer);
    }
    wrapResp(socket, config, reqbody, result) {
        if (result instanceof rxjs_1.Observable) {
            this.wrapObservableResp(socket, config, reqbody, result);
        }
        else {
            this.wrapUnaryResp(socket, reqbody, result);
        }
    }
    setupTransport() {
        (0, assert_1.default)(this.transport != null, 'must set transport first.');
        this.transport.on('connection', socket => {
            console.log(`socket[${socket.id}] connected`);
            socket.on(this.endpoint, (reqbody) => __awaiter(this, void 0, void 0, function* () {
                console.log('receieve rpc: ' + JSON.stringify(reqbody));
                let err = (0, core_1.validateJSONRPCRequestBody)(reqbody);
                if (err) {
                    this.respJsonRpcError(socket, reqbody.id, err);
                    return;
                }
                if (!this.rpcMap[reqbody.method]) {
                    let rpcError = new core_1.JSONRPCError(core_1.JSONRPCErrorCode.MethodNotFound, core_1.JSONRPCErrorMessage.MethodNotFound);
                    this.respJsonRpcError(socket, reqbody.id, rpcError);
                    return;
                }
                try {
                    let config = this.rpcMap[reqbody.method];
                    let result = yield config.handler(...reqbody.params);
                    this.wrapResp(socket, config, reqbody, result);
                }
                catch (err) {
                    let rpcError = new core_1.JSONRPCError(core_1.JSONRPCErrorCode.InternalError, core_1.JSONRPCErrorMessage.InternalError);
                    this.respJsonRpcError(socket, reqbody.id, rpcError);
                }
            }));
        });
    }
}
exports.ReactiveRpcServer = ReactiveRpcServer;
