import { ReactiveRpcClient } from '@reactive-rpc/client';
import makeSocketIOClientTransport from '@reactive-rpc/socketio-client-transport';
import { Observable } from 'rxjs';

const client = new ReactiveRpcClient();

client.useTransport(makeSocketIOClientTransport({
  url: 'http://localhost:3000'
}))

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
