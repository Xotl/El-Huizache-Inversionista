'use stric';
import BigNumber from "bignumber.js";
import { postMessage } from './slack';


// Globals
const
    MAX_NUM_OF_PRICE_ELEMENTS = 15,
    ARRIBA = 'ARRIBA',
    ABAJO = 'ABAJO',
    DENTRO = 'DENTRO',
    VENDER = 'VENDER',
    COMPRAR = 'COMPRAR',
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
            gapCajita: null
        },
        cajita_xrp: {
            high: null,
            low: null,
            topCajita: null,
            bottomCajita: null,
            currentPosition: null,
            gapCajita: null
        },
        strategy_eth: {
            precioDeRecuperacion: null,
            posActualRespectoCajita: null,
            prevPositionRespectoCajita: null,
            currentStrategy: VENDER
        },
        strategy_xrp: {
            precioDeRecuperacion: null,
            posActualRespectoCajita: null,
            prevPositionRespectoCajita: null,
            currentStrategy: VENDER
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
        marketPrice = new BigNumber(price)

    if ( prevPosition === null ) {
        // First run
        const newTopCajita = marketPrice.minus(statistics.standardDeviation)
        return Object.assign({}, state, {
            high: marketPrice,
            low: marketPrice,
            topCajita: newTopCajita,
            bottomCajita: newTopCajita,
            gapCajita: new BigNumber(0),
            currentPosition: price// Lo guarda como string
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
        newBottomCajita = newLow.plus(statistics.standardDeviation)

    return Object.assign({}, state, {
        high: newHigh,
        low: newLow,
        topCajita: newTopCajita,
        bottomCajita: newBottomCajita.lessThan(newTopCajita) ? newBottomCajita : newTopCajita,
        gapCajita: newTopCajita.greaterThan(newBottomCajita) ? newTopCajita.minus(newBottomCajita) : new BigNumber(0),
        currentPosition: statistics.marketPrice
    })
}


// Reducer
export default function reducer(state = initialState, action = {}) {

    switch (action.type) {
        case NEW_TRANSACTION_REPORTED:
            const 
                statistics = statisticsCalculation( state[action.currency], action.price ),
                cajita = cajitaCalculation( state[`cajita_${action.currency}`], action, statistics, state.fees[`${action.currency}_mxn`] ),
                marketPrice = new BigNumber(action.price)

            return Object.assign({}, state, {
                [action.currency]: statistics,
                [`cajita_${action.currency}`]: cajita,
                [`strategy_${action.currency}`]: {
                    precioDeRecuperacion: marketPrice.times( BigNumber(1).minus(state.fees[`${action.currency}_mxn`].fee_decimal) ).times( BigNumber(1).minus(state.fees[`${action.currency}_mxn`].fee_decimal) ).toFixed(2, BigNumber.ROUND_DOWN),
                    posActualRespectoCajita: marketPrice.greaterThan(cajita.topCajita) ?
                                        ARRIBA : ( marketPrice.lessThan(cajita.bottomCajita) ? ABAJO : DENTRO ),
                    prevPositionRespectoCajita: BigNumber(state[`cajita_${action.currency}`].currentPosition || marketPrice).greaterThan(cajita.topCajita) ?
                                        ARRIBA : ( marketPrice.lessThan(cajita.bottomCajita) ? ABAJO : DENTRO )
                 }
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
        .map( ({ currency, price }) => {
            const { inversion: { 
                eth, xrp, cajita_eth, cajita_xrp, strategy_eth, strategy_xrp,
                [`strategy_${currency}`]: { precioDeRecuperacion, posActualRespectoCajita, prevPositionRespectoCajita },
                [currency]: stats
            } } = store.getState()
            console.log(
`Market
    Etherium (${eth.priceHistory.length}) => 
        Cajita: High ${cajita_eth.high}, Low ${cajita_eth.low}, Top ${cajita_eth.topCajita}, Bottom ${cajita_eth.bottomCajita}, Gap: ${cajita_eth.gapCajita}, Precio Retorno: ${strategy_eth.precioDeRecuperacion}
        Precio: ${eth.marketPrice}mxn, Promedio ${eth.avarage}mxn, Desv. Est.: ${eth.standardDeviation}
    Ripple (${xrp.priceHistory.length}) => 
        Cajita: High ${cajita_xrp.high}, Low ${cajita_xrp.low}, Top ${cajita_xrp.topCajita}, Bottom ${cajita_xrp.bottomCajita}, Gap: ${cajita_xrp.gapCajita}, Precio Retorno: ${strategy_xrp.precioDeRecuperacion}
        Precio: ${xrp.marketPrice}mxn, Promedio ${xrp.avarage}mxn, Desv. Est.: ${xrp.standardDeviation}`
            )


            const marketPrice = new BigNumber(price)
            
            if (stats.priceHistory.length > 10 && posActualRespectoCajita !== prevPositionRespectoCajita ) {
                switch (true) {
                    case posActualRespectoCajita === DENTRO && prevPositionRespectoCajita === ARRIBA:
                        return postMessage(`Se salió el "${currency}" de la cajita a un precio de ${price}mxn`)
                        
                    case posActualRespectoCajita === DENTRO && prevPositionRespectoCajita === ABAJO:
                    case posActualRespectoCajita === ARRIBA && prevPositionRespectoCajita === DENTRO:
                        return postMessage(`Momento de vender "${currency}"  porque va a la baja con un precio de $${price}mxn`)


                    case posActualRespectoCajita === ABAJO && prevPositionRespectoCajita === DENTRO:
                        return postMessage(`Hora de comprar "${currency}" a un precio de $${price}mxn`)

                    case posActualRespectoCajita === ARRIBA && prevPositionRespectoCajita === ABAJO:
                    case posActualRespectoCajita === ABAJO && prevPositionRespectoCajita === ARRIBA:
                        return postMessage(`Caso raro de "${currency}" (${prevPositionRespectoCajita} => ${posActualRespectoCajita}) a un precio de $${price}mxn`)
                }
            }
        } )
        .filter( action => action !== undefined )