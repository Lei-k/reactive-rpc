import { Transport, Socket } from '@reactive-rpc/core';

import { Server } from 'http';
import SocketIO from 'socket.io';

interface SocketIOTransportOpts extends SocketIO.ServerOptions {}

class SocketIOTransport implements Transport {
  private io: SocketIO.Server;

  constructor(server: Server, opts?: SocketIOTransportOpts) {
    this.io = new SocketIO.Server(server, opts)
  }

  on(evt: 'connection', listener: (socket: Socket) => void): void {
    this.io.on(evt, (_s) => {
      listener(_s);
    });
  }
}

function makeSocketIOTransport(server: Server, opts?: SocketIOTransportOpts) {
  if(!opts) return new SocketIOTransport(server);

  return new SocketIOTransport(server, opts);
}

export default makeSocketIOTransport;
