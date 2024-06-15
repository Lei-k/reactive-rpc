import { io } from '/socket.io/socket.io.esm.min.js';

const socket = io();

import { nanoid } from '/nanoid/nanoid.js';


const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

const rpcMap = {};

const observableMap = {}

async function chat(msg) {
  let id = nanoid();

  let p = new Promise((resolve, reject) => {
    let timeout = setTimeout(() => {
      reject('timeout')
    }, 1000);

    socket.on('jsonrpc', resp => {
      if(resp.id !== id) {
        return;
      }

      clearTimeout(timeout);

      if(resp.error) {
        reject(resp.error);
      }

      if(['observable', 'event', 'event:complete'].includes(resp.result.type)) {



      } else {
        resolve(resp.result.value);
      }
    });

    socket.emit('jsonrpc', {
      jsonrpc: '2.0',
      params: [msg],
      id: id,
      method: 'chat'
    });
  })

  return p;
}

async function submitMessage(msg) {
  try {
    let result = await chat(msg);
    const item = document.createElement('li');
    item.textContent = JSON.stringify(result);
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  } catch(err) {
    console.error(err);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (input.value) {
    submitMessage(input.value);

    input.value = '';
  }
});
