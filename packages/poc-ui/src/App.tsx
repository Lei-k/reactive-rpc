import './App.css';

import { useEffect } from 'react';

import { Observable, concatMap, filter, finalize, fromEvent } from 'rxjs';

import { makeObservableMethod } from './lib/reactive-rpc';

const chat = makeObservableMethod<(msg: string) => Observable<any>>({
  method: 'chat',
  timeout: 15000,
});

function App() {
  useEffect(() => {
    const form = document.getElementById('form');
    const input = document.getElementById('input') as HTMLInputElement;
    const messages = document.getElementById('messages');

    if (!messages) return;

    if (!form) return;

    if (!input) return;

    const appendText = (text: string) => {
      const item = document.createElement('li');
      item.textContent = text;
      //@ts-ignore
      messages.appendChild(item);

      window.scrollTo(0, document.body.scrollHeight);
    };

    let sub = fromEvent(form, 'submit')
      .pipe(
        filter(event => input.value !== ''),
        concatMap(evt => {
          evt.preventDefault();
          let msg = input.value;
          input.value = '';
          return chat(msg).pipe(
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

    return () => {
      sub.unsubscribe();
    };

    // async function submitMessage(msg: string) {
    //   try {
    //     let result = chat(msg);

    //     console.log(result);

    //     result.subscribe({
    //       next: result => {
    //         const item = document.createElement('li');
    //         item.textContent = result + '';
    //         //@ts-ignore
    //         messages.appendChild(item);

    //         window.scrollTo(0, document.body.scrollHeight);
    //       },
    //       complete: () => {
    //         const item = document.createElement('li');
    //         item.textContent = JSON.stringify('done!');
    //         //@ts-ignore
    //         messages.appendChild(item);

    //         window.scrollTo(0, document.body.scrollHeight);
    //       },
    //     });
    //   } catch (err) {
    //     console.error(err);
    //   }
    // }

    // form.addEventListener('submit', e => {
    //   e.preventDefault();

    //   //@ts-ignore
    //   if (input.value) {
    //     //@ts-ignore
    //     submitMessage(input.value);

    //     //@ts-ignore
    //     input.value = '';
    //   }
    // });
  }, []);
  return (
    <div className='App'>
      <ul id='messages'></ul>
      <form id='form' action=''>
        <input id='input' autoComplete='off' />
        <button>Send</button>
      </form>
    </div>
  );
}

export default App;
