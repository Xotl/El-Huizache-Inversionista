'use stric';

import { connectToBitso } from "./bisto"
import configureStore from './redux/configureStore'
import { incomingMessageBitso } from './redux/modules/bitso'


const store = configureStore()
const observable = connectToBitso(store)


// const incomingMessage = (data) => {

    // store.dispatch( incomingMessageBitso(data.book, data.type, data.payload) )

    // const { book, type, payload } = data
    
    // if (typeof payload !== 'object') {
    //     return console.log(`Payload de "${type}" para "${book}" viene con "${payload}"`)
    // }
    
    // const { a: amount, r: rate, v: value, t: sell } = payload

    // switch (type) {
    //     case 'trades':
    //         payload.forEach(
    //             (elem) => {
    //                 const { a: amount, r: rate, v: value, t: sell } = elem
    //                 console.log(`${sell ? 'Vendiendo' : 'Comprando'} ${amount} de ${book} a ${rate} por ${value}`)
    //             }
    //         )
    //         break;
        
    //     case 'diff-orders':
    //     case 'orders':
    //     default:
    //         // console.log(`Algo raro "${type}"`)
    //         break;

    // }
// }

observable.subscribe(
    message => store.dispatch( incomingMessageBitso(message.book, message.type, message.payload) ),
    err => {},
    () => console.log('this is the end')
  );