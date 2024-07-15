import { ReactiveRpcClient } from '@reactive-rpc/client';
import { Observable } from 'rxjs';

import makeSocketIOTransport from '@reactive-rpc/socketio-client-transport';

const client = new ReactiveRpcClient();

client.useTransport(makeSocketIOTransport({
  url: 'http://localhost:3000'
}));

const processFile = client.makeObservableMethod<() => Observable<any>>({
  method: 'processFile',
  timeout: 15000,
});

const plateRecognize = client.makeObservableMethod<() => Observable<any>>({
  method: 'plateRecognize',
  timeout: 15000,
});

async function main() {
  let sub = processFile().subscribe({
    next: value => {
      console.log(value);
    },
  });

  sub.add(() => {
    sub = plateRecognize().subscribe({
      next: value => {
        console.log(value);
      },
    });

    sub.add(() => {
      client.close();
    });
  });
}

main();
