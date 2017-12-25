'use stric';
// import 'rxjs/add/operator/ofType';
// import 'rxjs/add/operator/map';
// import 'rxjs/add/operator/do';
// import 'rxjs/add/operator/ignoreElements';
import Rx from 'rxjs';
import WebSocket from 'ws'
import Crypto from 'crypto'
import { newPriceReported, newTransactionReported, updateFees } from './inversion'
import Fetch from '../utils/fetch';



// Constnts
const
    BITSO_API_KEY = process.env.BITSO_API_KEY,
    BITSO_API_SECRET = process.env.BITSO_API_SECRET,

    BITSO_SUBSCRIPTIONS = [
        { action: 'subscribe', book: 'eth_mxn', type: 'trades' },
        // { action: 'subscribe', book: 'eth_mxn', type: 'diff-orders' },
        // { action: 'subscribe', book: 'eth_mxn', type: 'orders' },

        { action: 'subscribe', book: 'xrp_mxn', type: 'trades' },
        // { action: 'subscribe', book: 'xrp_mxn', type: 'diff-orders' },
        // { action: 'subscribe', book: 'xrp_mxn', type: 'orders' }
    ],

    BITSO_BASE_URL = 'https://api.bitso.com',
    BITSO_SOCKET_ENDPOINT = 'wss://ws.bitso.com',

    ETHERIUM_SYMBOL = 'eth',
    RIPPLE_SYMBOL = 'xrp',

    InitialState = {
        connectedToBitso: false,
        marketValueOf_eth: null,
        marketValueOf_xrp: null,
    }


// Actions
const
    GET_BITSO_FEES = 'el-huizache-inversionista/bitso/GET_BITSO_FEES',
    GET_BITSO_FEES_SUCCESS = 'el-huizache-inversionista/bitso/GET_BITSO_FEES_SUCCESS',
    GET_BITSO_FEES_ERROR = 'el-huizache-inversionista/bitso/GET_BITSO_FEES_ERROR',

    TRADE_BUY_RECEIVED = 'el-huizache-inversionista/bitso/TRADE_BUY_RECEIVED',
    TRADE_SELL_RECEIVED = 'el-huizache-inversionista/bitso/TRADE_SELL_RECEIVED',


    SUBSCRIBED_TO_BITSO = 'el-huizache-inversionista/bitso/SUBSCRIBED_TO_BITSO',
    INCOMING_MESSAGE = 'el-huizache-inversionista/bitso/INCOMING_MESSAGE',
    CONNECT_TO_BITSO = 'el-huizache-inversionista/bitso/CONNECT_TO_BITSO',
    CONNECTION_TO_BITSO_OPEN = 'el-huizache-inversionista/bitso/CONNECTION_TO_BITSO_OPEN',
    CONNECTION_TO_BITSO_CLOSED = 'el-huizache-inversionista/bitso/CONNECTION_TO_BITSO_CLOSED'


// Action Creators
export const incomingMessageBitso = (book, messageType, payload) => ({
    type: INCOMING_MESSAGE,
    book,
    messageType,
    payload
})

export const tradeBuyReceived = (amount, rate, value, major, minor, marketPrice) => ({
    type: TRADE_BUY_RECEIVED,
    amount, rate, value, major, minor, marketPrice
})

export const tradeSellReceived = (amount, rate, value, major, minor, marketPrice) => ({
    type: TRADE_SELL_RECEIVED,
    amount, rate, value, major, minor, marketPrice
})

export const connectionToBitsoClosed = () => ({
    type: CONNECTION_TO_BITSO_CLOSED
})

export const connectionToBitsoOpen = (socket) => ({
    type: CONNECTION_TO_BITSO_OPEN,
    socket
})

export const conectTotBitso = () => ({
    type: CONNECT_TO_BITSO
})

export const subscribedToBitso = () => ({
    type: SUBSCRIBED_TO_BITSO
})

export const getBitsoFees = () => ({
    type: GET_BITSO_FEES,
    key: BITSO_API_KEY,
    secret: BITSO_API_SECRET,
    nonce: new Date().getTime()
})

export const getBitsoFeesSuccess = (fees) => ({
    type: GET_BITSO_FEES_SUCCESS,
    fees
})

export const getBitsoFeesError = (error) => ({
    type: GET_BITSO_FEES_ERROR,
    error
})



// Reducer
export default function reducer(state = InitialState, action = {}) {

    switch (action.type) {
        case TRADE_BUY_RECEIVED:
        case TRADE_SELL_RECEIVED:
            return Object.assign({}, state, { [`marketValueOf_${action.major}`]: action.rate })

        case CONNECTION_TO_BITSO_OPEN: return Object.assign({}, state, { connectedToBitso: true })
        case CONNECTION_TO_BITSO_CLOSED: return Object.assign({}, state, { connectedToBitso: false })

        default: return state
    }
}



// Side effects
export const connectToBitsoEpic = (action$, store) =>
    action$
        .ofType(CONNECT_TO_BITSO)
        .mergeMap( () => Rx.Observable.create(
            observer => {
                const websocket = new WebSocket(BITSO_SOCKET_ENDPOINT)
                websocket.on('open', () => observer.next( connectionToBitsoOpen(websocket) ))
                websocket.on('error', error => observer.next( connectionToBitsoClosed(error) ))
                websocket.on('close', () => {
                    observer.next( connectionToBitsoClosed() )
                    observer.complete()
                })
                websocket.on('message', message => {
                    message = JSON.parse(message)
                    observer.next( incomingMessageBitso(message.book, message.type, message.payload) )
                })
            }
        ) )

export const onConnectionToBitsoOpen = (action$, store) =>
    action$
        .ofType(CONNECTION_TO_BITSO_OPEN)
        .mergeMap(
            ({ socket }) => {
                BITSO_SUBSCRIPTIONS.forEach(
                    subscription => socket.send(JSON.stringify(subscription))
                )
                return [ subscribedToBitso(), getBitsoFees() ]
            }
        )

export const incomingMessageBitsoEpic = (action$, store) =>
    action$
        .ofType(INCOMING_MESSAGE)
        .filter(
            ({ messageType, book, payload }) =>
                messageType === 'trades' && payload instanceof Array && typeof book !== 'undefined'
        )
        .mergeMap(
            ({ messageType, book, payload }) => {
                const { major, minor } = book.split('_').reduce((major, minor) => ({ major, minor }))
                return payload.map(
                    ({ a: amount, r: rate, v: value, t: sell }) => ({ messageType, amount, rate, value, sell, major, minor, book })
                )
            }
        )
        .map(
            ({ messageType, amount, rate, value, sell, major, minor, book }) => {
                const { bitso: { [`marketValueOf_${major}`]: marketPrice } } = store.getState()
                if (sell) {
                    return tradeSellReceived(amount, rate, value, major, minor, marketPrice)
                }

                return tradeBuyReceived(amount, rate, value, major, minor, marketPrice)
            }
        )

export const notifyNewTransactionEpic = action$ =>
    action$
        .ofType(TRADE_BUY_RECEIVED, TRADE_SELL_RECEIVED)
        .map(({ amount, rate, major }) => newTransactionReported(amount, rate, major))

export const notifyNewPricesEpic = action$ =>
    action$
        .ofType(TRADE_BUY_RECEIVED, TRADE_SELL_RECEIVED)
        .map(({ rate, major, marketPrice }) => {
            if (rate !== marketPrice) {
                return newPriceReported(rate, major, marketPrice);
            }
        })
        .filter(action => action !== undefined)

export const tradeBuyEpic = action$ =>
    action$
        .ofType(TRADE_BUY_RECEIVED)
        .do(({ amount, rate, value, major, minor }) => {
            console.log(`Alguien compró ${amount}${major} a $${rate}${minor} con valor de $${value}${minor}`)
        })
        .ignoreElements()

export const tradeSellEpic = action$ =>
    action$
        .ofType(TRADE_SELL_RECEIVED)
        .do(({ amount, rate, value, major, minor }) => {
            console.log(`Alguien vendió ${amount}${major} a $${rate}${minor} con valor de $${value}${minor}`)
        })
        .ignoreElements()

export const getBitsoFeesEpic = action$ =>
    action$
        .ofType(GET_BITSO_FEES)
        .mergeMap(
            ({ key, secret, nonce }) => {
                const
                    request_path = '/v3/fees/',
                    data = nonce + 'GET' + request_path,
                    signature = Crypto.createHmac('sha256', secret).update(data).digest('hex')

                return Rx.Observable.fromPromise(
                    Fetch({
                        uri: `${BITSO_BASE_URL}${request_path}`,
                        headers: { Authorization: `Bitso ${key}:${nonce}:${signature}` }
                    })
                )
            }
        )
        .mergeMap(({ payload: { payload: { fees } } }) => [ getBitsoFeesSuccess(fees), updateFees(fees) ])
