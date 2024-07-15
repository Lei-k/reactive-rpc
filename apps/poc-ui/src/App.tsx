import './App.css';

import { useEffect } from 'react';

import {
  Observable,
  debounce,
  finalize,
  fromEvent,
  interval,
  mergeMap,
} from 'rxjs';

import { ReactiveRpcClient } from '@reactive-rpc/client';
import makeSocketIOClientTransport from '@reactive-rpc/socketio-client-transport';

const client = new ReactiveRpcClient();

client.useTransport(makeSocketIOClientTransport());

const processFile = client.makeObservableMethod<() => Observable<any>>({
  method: 'processFile',
  timeout: 15000,
});

const plateRecognize = client.makeObservableMethod<() => Observable<any>>({
  method: 'plateRecognize',
  timeout: 15000,
});

function initProcessFileBtn() {
  const btn = document.getElementById('process-file-btn') as HTMLButtonElement;
  const messages = document.getElementById('messages');

  if (!btn) return;
  if (!messages) return;

  const appendText = (text: string) => {
    const item = document.createElement('li');
    item.textContent = text;
    //@ts-ignore
    messages.appendChild(item);

    window.scrollTo(0, document.body.scrollHeight);
  };

  let sub = fromEvent(btn, 'click')
    .pipe(
      debounce(() => interval(100)),
      mergeMap(evt => {
        return processFile().pipe(
          finalize(() => {
            appendText('done!');
          })
        );
      })
    )
    .subscribe({
      next: result => {
        appendText(result + '');
      },
      error: err => {
        console.error(err);
      },
    });

  return sub;
}

function initPlateRecognizeBtn() {
  const btn = document.getElementById(
    'plate-recognize-btn'
  ) as HTMLButtonElement;
  const messages = document.getElementById('messages');

  if (!btn) return;
  if (!messages) return;

  const appendText = (text: string) => {
    const item = document.createElement('li');
    item.textContent = text;
    //@ts-ignore
    messages.appendChild(item);

    window.scrollTo(0, document.body.scrollHeight);
  };

  let sub = fromEvent(btn, 'click')
    .pipe(
      debounce(() => interval(100)),
      mergeMap(evt => {
        return plateRecognize().pipe(
          finalize(() => {
            appendText('done!');
          })
        );
      })
    )
    .subscribe({
      next: result => {
        appendText(result + '');
      },
      error: err => {
        console.error(err);
      },
    });

  return sub;
}

function App() {
  useEffect(() => {
    let processFileSub = initProcessFileBtn();
    let plateRecognizeSub = initPlateRecognizeBtn();

    return () => {
      processFileSub?.unsubscribe();
      plateRecognizeSub?.unsubscribe();
    };
  }, []);

  return (
    <div className='App'>
      <ul id='messages'></ul>

      <div id='form'>
        <button id='process-file-btn'>Process File</button>
        <button id='plate-recognize-btn'>Plate Recognize</button>
      </div>
    </div>
  );
}

export default App;
