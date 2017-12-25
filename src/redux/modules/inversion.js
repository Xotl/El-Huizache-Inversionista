'use stric';
import BigNumber from "bignumber.js";


// Globals
const
    MAX_NUM_OF_PRICE_ELEMENTS = 15,
    initialState = {
        eth: {
            marketPrice: null,
            standardDeviation: null,
            avarage: null,
            priceHistory: []
        },
        xrp: {
            marketPrice: null,
            standardDeviation: null,
            avarage: null,
            priceHistory: []
        }
    }


// Actions
const
    NEW_PRICE_REPORTED = 'el-huizache-inversionista/inversion/NEW_PRICE_REPORTED',
    NEW_TRANSACTION_REPORTED = 'el-huizache-inversionista/inversion/NEW_TRANSACTION_REPORTED'



// Action Creators
export const newPriceReported = (price, currency, oldPrice) => ({
    type: NEW_PRICE_REPORTED,
    price, currency, oldPrice
})

export const newTransactionReported = (amount, price, currency) => ({
    type: NEW_TRANSACTION_REPORTED,
    amount, price, currency
})



// Reducer Helpers
const newTransactionCalculation = (state, newPrice) => {

    const priceHistory = state.priceHistory.slice()// Clona el array
    priceHistory.unshift( new BigNumber(newPrice) )// Agrega el precio al principio del array

    if (priceHistory.length > MAX_NUM_OF_PRICE_ELEMENTS) {
        priceHistory.length = MAX_NUM_OF_PRICE_ELEMENTS
    }

    const 
        avarage = priceHistory.reduce( (sum, price) => price.plus(sum), 0).dividedBy(priceHistory.length),
        standardDeviation = priceHistory.reduce( (sum, price) => price.minus(avarage).pow(2).plus(sum), 0).dividedBy(priceHistory.length).sqrt()

    return Object.assign({}, state, {
        standardDeviation: standardDeviation.toFixed(2),
        avarage: avarage.toFixed(2),
        priceHistory
    })
}

const priceUdpdated = (state, newPrice) => Object.assign({}, state, {
    marketPrice: newPrice
})


// Reducer
export default function reducer(state = initialState, action = {}) {

    switch (action.type) {
        case NEW_TRANSACTION_REPORTED:
            return Object.assign({}, state, {
                [action.currency]: newTransactionCalculation( state[action.currency], action.price )
            })

        case NEW_PRICE_REPORTED:
            return Object.assign({}, state, {
                [action.currency]: priceUdpdated( state[action.currency], action.price )
            })
        
        default: return state
    }
}


// Side effects
export const printPriceDetailsEpic = (action$, store) => 
    action$
        .ofType(NEW_TRANSACTION_REPORTED)
        .do( ({ currency, price }) => {
            const { inversion: { eth, xrp } } = store.getState()
            console.log(
`Market
    Etherium => 
        Pool de datos ${eth.priceHistory.length}: ${eth.priceHistory}
        Precio: ${eth.marketPrice}mxn, Promedio ${eth.avarage}mxn, Desv. Est.: ${eth.standardDeviation}
    Ripple => 
        Pool de datos ${xrp.priceHistory.length}: ${xrp.priceHistory}
        Precio: ${xrp.marketPrice}mxn, Promedio ${xrp.avarage}mxn, Desv. Est.: ${xrp.standardDeviation}`
            )
        } )
        .ignoreElements()