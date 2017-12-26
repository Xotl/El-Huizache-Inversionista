'use stric';
import BigNumber from "bignumber.js";


// Globals
const
    MAX_NUM_OF_PRICE_ELEMENTS = 15,
    ARRIBA = 'ARRIBA',
    ABAJO = 'ABAJO',
    DENTRO = 'DENTRO',
    initialState = {
        fees: null,
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
        },
        cajita_eth: {
            high: null,
            low: null,
            topCajita: null,
            bottomCajita: null,
            currentPosition: null,
            gapCajita: null,
            precioDeRecuperacion: null
        },
        cajita_xrp: {
            high: null,
            low: null,
            topCajita: null,
            bottomCajita: null,
            gapCajita: null,
            currentPosition: null,
            precioDeRecuperacion: null
        }
    }


// Actions
const
    NEW_PRICE_REPORTED = 'el-huizache-inversionista/inversion/NEW_PRICE_REPORTED',
    NEW_TRANSACTION_REPORTED = 'el-huizache-inversionista/inversion/NEW_TRANSACTION_REPORTED',
    UPDATE_FEES = 'el-huizache-inversionista/inversion/UPDATE_FEES'



// Action Creators
export const newTransactionReported = (amount, price, currency) => ({
    type: NEW_TRANSACTION_REPORTED,
    amount, price, currency
})

export const updateFees = (fees) => ({
    type: UPDATE_FEES,
    fees
})



// Reducer Helpers
const statisticsCalculation = (state, newPrice) => {

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
        priceHistory,
        marketPrice: newPrice
    })
}

const cajitaCalculation = (state, { amount, price, currency }, statistics, fees) => {
    const 
        { high, low, topCajita, bottomCajita, currentPosition: prevPosition } = state,
        marketPrice = new BigNumber(price),
        precioDeRecuperacion = marketPrice.times( BigNumber(1).minus(fees.fee_decimal) ).times( BigNumber(1).minus(fees.fee_decimal) )

    if ( prevPosition === null ) {
        // First run
        const newTopCajita = marketPrice.minus(statistics.standardDeviation)
        return Object.assign({}, state, {
            high: marketPrice,
            low: marketPrice,
            topCajita: newTopCajita,
            bottomCajita: newTopCajita,
            gapCajita: new BigNumber(0),
            currentPosition: price,// Lo guarda como string
            precioDeRecuperacion: precioDeRecuperacion.toFixed(2, BigNumber.ROUND_DOWN)
        })
    }

    const 
        posActualRespectoCajita = marketPrice.greaterThan(topCajita) ?
                                        ARRIBA : ( marketPrice.lessThan(bottomCajita) ? ABAJO : DENTRO ),
        prevPositionRespectoCajita = BigNumber(prevPosition).greaterThan(topCajita) ?
                                        ARRIBA : ( marketPrice.lessThan(bottomCajita) ? ABAJO : DENTRO )


    let newHigh = high, newLow = low
    
    if ( posActualRespectoCajita === ARRIBA ) {
        newHigh = marketPrice.greaterThan( high ) ? marketPrice : high
        newLow = newHigh
    }
    else if ( posActualRespectoCajita === ABAJO ) {
        newLow = marketPrice.lessThan( low ) ? marketPrice : low
    }


    
    let 
        newTopCajita = newHigh.minus(statistics.standardDeviation),
        newBottomCajita = newLow.plus(statistics.standardDeviation),
        newGapCajita = newTopCajita.minus(newBottomCajita)

    return Object.assign({}, state, {
        high: newHigh,
        low: newLow,
        topCajita: newTopCajita,
        bottomCajita: newBottomCajita,
        gapCajita: newGapCajita.greaterThan(0) ? newGapCajita : new BigNumber(0),
        currentPosition: statistics.marketPrice,
        precioDeRecuperacion: precioDeRecuperacion.toFixed(2, BigNumber.ROUND_DOWN)
    })
}


// Reducer
export default function reducer(state = initialState, action = {}) {

    switch (action.type) {
        case NEW_TRANSACTION_REPORTED:
            const statistics = statisticsCalculation( state[action.currency], action.price )
            return Object.assign({}, state, {
                [action.currency]: statistics,
                [`cajita_${action.currency}`]: cajitaCalculation(
                    state[`cajita_${action.currency}`], action, statistics, state.fees[`${action.currency}_mxn`]
                )
            })
        
        case UPDATE_FEES:
            return Object.assign({}, state, {
                fees: action.fees.reduce(
                    (res, { book, fee_percent, fee_decimal }) => Object.assign( res, { [book]: { fee_percent, fee_decimal } } ),
                    {}
                )
            })

        default: return state
    }
}


// Side effects
export const printPriceDetailsEpic = (action$, store) => 
    action$
        .ofType(NEW_TRANSACTION_REPORTED)
        .do( ({ currency, price }) => {
            const { inversion: { eth, xrp, cajita_eth, cajita_xrp } } = store.getState()
            console.log(
`Market
    Etherium (${eth.priceHistory.length}) => 
        Cajita: High ${cajita_eth.high}, Low ${cajita_eth.low}, Top ${cajita_eth.topCajita}, Bottom ${cajita_eth.bottomCajita}, Gap: ${cajita_eth.gapCajita}, Precio Retorno:  ${cajita_eth.precioDeRecuperacion}
        Precio: ${eth.marketPrice}mxn, Promedio ${eth.avarage}mxn, Desv. Est.: ${eth.standardDeviation}
    Ripple (${xrp.priceHistory.length}) => 
        Cajita: High ${cajita_xrp.high}, Low ${cajita_xrp.low}, Top ${cajita_xrp.topCajita}, Bottom ${cajita_xrp.bottomCajita}, Gap: ${cajita_xrp.gapCajita}, Precio Retorno:  ${cajita_xrp.precioDeRecuperacion}
        Precio: ${xrp.marketPrice}mxn, Promedio ${xrp.avarage}mxn, Desv. Est.: ${xrp.standardDeviation}`
            )
        } )
        .ignoreElements()