'use stric';

import WebSocket from "ws"
import Rx from 'rxjs';
import { incomingMessageBitso } from './redux/modules/bitso'



const
    // Globals
    BITSO_ENDPOINT = 'wss://ws.bitso.com',
    SUBSCRIPTIONS = [
        { action: 'subscribe', book: 'eth_mxn', type: 'trades' },
        // { action: 'subscribe', book: 'eth_mxn', type: 'diff-orders' },
        // { action: 'subscribe', book: 'eth_mxn', type: 'orders' },

        { action: 'subscribe', book: 'xrp_mxn', type: 'trades' },
        // { action: 'subscribe', book: 'xrp_mxn', type: 'diff-orders' },
        // { action: 'subscribe', book: 'xrp_mxn', type: 'orders' }
    ]


export const connectToBitso = ({  dispatch }) => {
    const observable = Rx.Observable.create(
        observer => {
            const websocket = new WebSocket(BITSO_ENDPOINT)

            websocket.on('close', observer.complete)
            websocket.on('error', observer.error)
            websocket.on('message', message => observer.next(JSON.parse(message)))

            websocket.on('open', () => {
                SUBSCRIPTIONS.forEach(
                    subscription => websocket.send(JSON.stringify(subscription))
                )
            })
        }
    )

    observable.subscribe(
        message => dispatch( incomingMessageBitso(message.book, message.type, message.payload) ),
        err => console.error(err),
        () => console.log('Connection ended!')
    );

    return observable
}

export default connectToBitso 