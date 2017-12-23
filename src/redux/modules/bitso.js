'use stric';
// import 'rxjs/add/operator/ofType';
// import 'rxjs/add/operator/map';
// import 'rxjs/add/operator/do';
// import 'rxjs/add/operator/ignoreElements';
import 'rxjs';



// Constnts
const
    ETHERIUM_SYMBOL = 'eth',
    RIPPLE_SYMBOL = 'xrp',
    InitialState = {
        connectedToBitso: false,
        marketValueOfEtherium: null,
        marketValueOfRipple: null
    }


// Actions
const
    BOOK_SUBSCRIBED = 'el-huizache-inversionista/bitso/BOOK_SUBSCRIBED',
    INCOMING_MESSAGE = 'el-huizache-inversionista/bitso/INCOMING_MESSAGE',
    TRADE_BUY_RECEIVED = 'el-huizache-inversionista/bitso/TRADE_BUY_RECEIVED',
    TRADE_SELL_RECEIVED = 'el-huizache-inversionista/bitso/TRADE_SELL_RECEIVED',
    CONNECTION_TO_BITSO_OPEN = 'el-huizache-inversionista/bitso/CONNECTION_TO_BITSO_OPEN',
    CONNECTION_TO_BITSO_CLOSED = 'el-huizache-inversionista/bitso/CONNECTION_TO_BITSO_CLOSED'



// Reducer
export default function reducer(state = InitialState, action = {}) {

    switch (action.type) {
        case TRADE_BUY_RECEIVED:
        case TRADE_SELL_RECEIVED:

            switch (action.major) {
                case ETHERIUM_SYMBOL: return Object.assign({}, state, { marketValueOfEtherium: action.rate })
                case RIPPLE_SYMBOL: return Object.assign({}, state, { marketValueOfRipple: action.rate })
                default: return state
            }
        
        case CONNECTION_TO_BITSO_OPEN: return Object.assign({}, state, { connectedToBitso: true })
        case CONNECTION_TO_BITSO_CLOSED: return Object.assign({}, state, { connectedToBitso: false })
            
        default: return state
    }
}



// Action Creators
export const incomingMessageBitso = (book, messageType, payload) => ({
    type: INCOMING_MESSAGE,
    book,
    messageType,
    payload
})

export const tradeBuyReceived = (amount, rate, value, major, minor) => ({
    type: TRADE_BUY_RECEIVED,
    amount, rate, value, major, minor
})

export const tradeSellReceived = (amount, rate, value, major, minor) => ({
    type: TRADE_SELL_RECEIVED,
    amount, rate, value, major, minor
})

export const connectionToBitsoClosed = () => ({
    type: CONNECTION_TO_BITSO_CLOSED
})

export const connectionToBitsoOpen = () => ({
    type: CONNECTION_TO_BITSO_OPEN
})


// Side effects
export const incomingMessageBitsoEpic = action$ => 
    action$
        .ofType(INCOMING_MESSAGE)
        .filter( 
            ({ messageType, book, payload }) => 
                    messageType === 'trades' && payload instanceof Array && typeof book !== 'undefined'
        )
        .mergeMap(
            ({ messageType, book, payload }) => {
                const { major, minor } = book.split('_').reduce( (major, minor) => ({ major, minor }) )
                return payload.map(
                    ({ a: amount, r: rate, v: value, t: sell }) => ({ messageType, amount, rate, value, sell, major, minor, book })
                )
            }
        )
        .map(
            ({ messageType, amount, rate, value, sell, major, minor, book }) => {
                if (sell) {
                    return tradeSellReceived(amount, rate, value, major, minor)
                }

                return tradeBuyReceived(amount, rate, value, major, minor)
            }
        )

export const printMarketPriceEpic = (action$, store) => 
        action$
            .ofType(TRADE_BUY_RECEIVED, TRADE_SELL_RECEIVED)
            .do( () => {
                const { bitso: { marketValueOfEtherium: eth, marketValueOfRipple: xrp } } = store.getState()
                console.log(`Market => Etherium: ${eth} mxn, Ripple ${xrp} mxn`)
            } )
            .ignoreElements()

export const tradeBuyEpic = action$ => 
    action$
        .ofType(TRADE_BUY_RECEIVED)
        .do( ({ amount, rate, value, major, minor }) => {
            console.log(`Alguien compró ${amount}${major} a $${rate}${minor} con valor de $${value}${minor}`)
        } )
        .ignoreElements()

export const tradeSellEpic = action$ => 
    action$
        .ofType(TRADE_SELL_RECEIVED)
        .do( ({ amount, rate, value, major, minor }) => {
            console.log(`Alguien vendió ${amount}${major} a $${rate}${minor} con valor de $${value}${minor}`)
        } )
        .ignoreElements()
        