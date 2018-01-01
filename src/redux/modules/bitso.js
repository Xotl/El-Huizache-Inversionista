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
import { postMessage } from './slack';



// Constants
const
    BITSO_API_KEY = process.env.BITSO_API_KEY,
    BITSO_API_SECRET = process.env.BITSO_API_SECRET,
    VENDOR_NAME = 'BITSO',

    BITSO_BALANCE_API_PATH = '/v3/balance/',
    BITSO_FEES_API_PATH = '/v3/fees/',

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

    InitialState = {
        connectedToBitso: false,
    }



// Utils
const generateAuthorizationHeader = (request_path, requestMethod = 'GET') => {
    const
        nonce = new Date().getTime(),
        signature = Crypto.createHmac('sha256', BITSO_API_SECRET).update(nonce + requestMethod + request_path).digest('hex')

    return `Bitso ${BITSO_API_KEY}:${nonce}:${signature}`
}

const generateObservableBitsoGetRequestFromAction = ({request_path, authorizationHeader }) => 
    Rx.Observable.fromPromise( Fetch({
        uri: `${BITSO_BASE_URL}${request_path}`,
        headers: { Authorization: authorizationHeader }
    }) 
)


// Actions
const
    GET_BITSO_FEES = 'el-huizache-inversionista/bitso/GET_BITSO_FEES',
    GET_BITSO_FEES_SUCCESS = 'el-huizache-inversionista/bitso/GET_BITSO_FEES_SUCCESS',
    GET_BITSO_FEES_ERROR = 'el-huizache-inversionista/bitso/GET_BITSO_FEES_ERROR',

    GET_BITSO_BALANCE = 'el-huizache-inversionista/bitso/GET_BITSO_BALANCE',
    GET_BITSO_BALANCE_SUCCESS = 'el-huizache-inversionista/bitso/GET_BITSO_BALANCE_SUCCESS',
    GET_BITSO_BALANCE_ERROR = 'el-huizache-inversionista/bitso/GET_BITSO_BALANCE_ERROR',

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
    request_path: BITSO_FEES_API_PATH,
    authorizationHeader: generateAuthorizationHeader(BITSO_FEES_API_PATH)
})

export const getBitsoFeesSuccess = (fees) => ({
    type: GET_BITSO_FEES_SUCCESS,
    fees
})

export const getBitsoFeesError = (error) => ({
    type: GET_BITSO_FEES_ERROR,
    error
})

export const getBitsoBalance = () => ({
    type: GET_BITSO_BALANCE,
    request_path: BITSO_BALANCE_API_PATH,
    authorizationHeader: generateAuthorizationHeader(BITSO_BALANCE_API_PATH)
})

export const getBitsoBalanceSuccess = (response) => ({
    type: GET_BITSO_BALANCE_SUCCESS,
    fundings: response.payload.payload.balances
})

export const getBitsoBalanceError = (error) => ({
    type: GET_BITSO_BALANCE_ERROR,
    error
})

// Reducer
export default function reducer(state = InitialState, action = {}) {

    switch (action.type) {
        case CONNECTION_TO_BITSO_OPEN: return Object.assign({}, state, { connectedToBitso: true })
        case CONNECTION_TO_BITSO_CLOSED: return Object.assign({}, state, { connectedToBitso: false })

        default: return state
    }
}



// Side effects
export const connectToBitsoEpic = action$ =>
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

export const onConnectionToBitsoOpen = action$ =>
    action$
        .ofType(CONNECTION_TO_BITSO_OPEN)
        .mergeMap(
            ({ socket }) => {
                console.log(`Connection to Bitso open at ${(new Date).toString()}!`)
                BITSO_SUBSCRIPTIONS.forEach(
                    subscription => socket.send(JSON.stringify(subscription))
                )
                return [ subscribedToBitso(), getBitsoFees() ]
            }
        )

export const onConnectionToBitsoClosed = action$ =>
    action$
        .ofType(CONNECTION_TO_BITSO_CLOSED)
        .map( () => {
            const msg = `Connection to Bitso closed at ${(new Date).toString()}!`
            console.log(msg)
            return postMessage(msg)
        })

export const incomingMessageBitsoEpic = (action$, store) =>
    action$
        .ofType(INCOMING_MESSAGE)
        .filter(
            ({ messageType, book, payload }) =>
                messageType === 'trades' && payload instanceof Array && typeof book !== 'undefined'
        )
        .mergeMap(
            ({ messageType, book, payload }) => payload.map(
                ({ a: amount, r: rate, v: value, t: sell }) => ({ messageType, amount, rate, value, sell, book })
            )
        )
        // .filter( ({ amount, book }) => amount !== undefined && book !== undefined )
        .map( ({ messageType, amount, rate, value, sell, book }) => 
            newTransactionReported(VENDOR_NAME, amount, rate, book, !!sell)
        )

export const getBitsoFeesEpic = action$ =>
    action$
        .ofType(GET_BITSO_FEES)
        .mergeMap( generateObservableBitsoGetRequestFromAction )
        .mergeMap( ({ payload: { payload: { fees } } }) =>  [ getBitsoFeesSuccess(fees) ].concat(
            fees.map(fee => updateFees(fee.book, fee.fee_decimal, fees.fee_percent) )
        ) )

export const getBitsoBalanceEpic = action$ =>
    action$
        .ofType(GET_BITSO_BALANCE)
        .mergeMap( generateObservableBitsoGetRequestFromAction )
        .map( getBitsoBalanceSuccess )
