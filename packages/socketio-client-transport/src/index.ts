import { ClientTransport } from '@reactive-rpc/core';

import io, { SocketOptions, ManagerOptions , Socket as IOSocket } from 'socket.io-client';

type ReservedEvs = 'connect' | 'disconnect' | 'connect_error';
type Evt = Exclude<string, ReservedEvs>;

interface SocketIOClientTransportOpts extends SocketOptions, ManagerOptions {
  url?: string;
}

class SocketIOClientTransport implements ClientTransport {

  private socket: IOSocket;

  constructor(opts?: Partial<SocketIOClientTransportOpts>) {
    let url = window.location.protocol + '//' + window.location.host;

    if(opts && opts.url) {
      url = opts.url;

      delete opts.url;
    }

    this.socket = io(url, opts);
  }

  removeListener<Ev extends string>(evt: Ev, listener: (...args: []) => void): void {
    this.socket.removeListener(evt, listener as any);
  }

  close(): void {
    this.socket.close();
  }

  on(evt: Evt, listener: (...args: any[]) => void): void {
    this.socket.on(evt, listener);
  }

  emit<Ev extends string>(evt: Ev, ...args: any[]): void {
    this.socket.emit(evt, ...args);
  }
}

function makeSocketIOClientTransport(opts?: Partial<SocketIOClientTransportOpts>) {
  return new SocketIOClientTransport(opts);
}

export default makeSocketIOClientTransport;
