'use stric';
import WebSocket from "ws"


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
    ],



    // Logic
    incomingMessage = (book, type, payload) => {
        
        switch (type) {
            case 'trades':
                console.log(`Trade ${book} => `, payload)
                break;

            case 'diff-orders':
                console.log('Diff', payload)
                break;

            case 'orders':
                console.log('Orders', payload)
                break;

            default:
                console.log(`Algo raro "${type}"`, payload)
                break;

        }
    }


module.exports = {

    start: () => {
    
        const websocket = new WebSocket(BITSO_ENDPOINT)
    
        websocket.on('open', () => {
            SUBSCRIPTIONS.forEach(
                subscription => websocket.send( JSON.stringify( subscription ) )
            )
        })
    
    
        websocket.on('message', (message) => {
            const data = JSON.parse(message)

            if (typeof data.payload !== 'object') {
                return console.log(`Payload de "${data.type}" para "${data.book}" viene con "${data.payload}"`)
            }

            incomingMessage(data.book, data.type, data.payload);
        })
    
    }

}
