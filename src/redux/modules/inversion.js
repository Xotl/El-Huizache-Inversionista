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

    initialStatisticsState = {
        marketPrice: null,
        standardDeviation: null,
        avarage: null,
        priceHistory: [],
        high: null,
        low: null
    },

    initialCajitaState = {
        high: null,
        low: null,
        topCajita: null,
        bottomCajita: null,
        currentPosition: null,
        gapCajita: null
    },

    initialState = {/*
        {
            [CURRENCY] : {
                fees: {
                    fee_decimal, fee_percent
                }
                strategy: {
                    precioDeRecuperacion: null,
                    posActualRespectoCajita: null,
                    prevPositionRespectoCajita: null,
                    currentStrategy: VENDER
                }
                statistics: {
                    marketPrice: null,
                    standardDeviation: null,
                    avarage: null,
                    priceHistory: []
                }
                cajita: {
                    high: null,
                    low: null,
                    topCajita: null,
                    bottomCajita: null,
                    currentPosition: null,
                    gapCajita: null
                }
            }
        }
    */}


// Actions
const
    NEW_PRICE_REPORTED = 'el-huizache-inversionista/inversion/NEW_PRICE_REPORTED',
    NEW_TRANSACTION_REPORTED = 'el-huizache-inversionista/inversion/NEW_TRANSACTION_REPORTED',
    UPDATE_FEES = 'el-huizache-inversionista/inversion/UPDATE_FEES'



// Action Creators
export const newTransactionReported = (vendor, amount, price, book) => ({
    type: NEW_TRANSACTION_REPORTED,
    vendor, amount, price, book
})

export const updateFees = (book, fee_decimal, fee_percent) => ({
    type: UPDATE_FEES,
    book, fee_decimal, fee_percent
})



// Reducer Helpers
const statisticsCalculation = (state = initialStatisticsState, newPrice) => {

    const 
        priceHistory = state.priceHistory.slice(),// Clona el array
        price = new BigNumber(newPrice)

    priceHistory.unshift( price )// Agrega el precio al principio del array

    if (priceHistory.length > MAX_NUM_OF_PRICE_ELEMENTS) {
        priceHistory.length = MAX_NUM_OF_PRICE_ELEMENTS
    }



    const 
        oldHigh = state.high || newPrice,
        oldLow = state.low || newPrice,
        avarage = priceHistory.reduce( (sum, price) => price.plus(sum), 0).dividedBy(priceHistory.length),
        standardDeviation = priceHistory.reduce( (sum, price) => price.minus(avarage).pow(2).plus(sum), 0).dividedBy(priceHistory.length).sqrt()

    return Object.assign({}, state, {
        standardDeviation: standardDeviation,
        avarage: avarage,
        priceHistory,
        marketPrice: newPrice,
        high: price.greaterThan(oldHigh) ? newPrice : oldHigh,
        low: price.lessThan(oldLow) ? newPrice : oldLow
    })
}

const cajitaCalculation = (state = initialCajitaState, statistics, fees) => {
    const 
        { high, low, topCajita, bottomCajita, currentPosition: prevPosition } = state,
        marketPrice = new BigNumber(statistics.marketPrice)
        // comisionHigh = fee

    if ( prevPosition === null ) {
        // First run
        const newTopCajita = marketPrice.minus(statistics.standardDeviation)
        return Object.assign({}, state, {
            high: marketPrice,
            low: marketPrice,
            topCajita: newTopCajita,
            bottomCajita: newTopCajita,
            gapCajita: new BigNumber(0),
            currentPosition: statistics.marketPrice// Lo guarda como string
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
                currentBookState = state[action.book] || {},
                marketPrice = new BigNumber(action.price),
                statistics = statisticsCalculation( currentBookState.statistics, action.price ),
                cajita = cajitaCalculation(currentBookState.cajita, statistics, currentBookState.fees )


            return Object.assign({}, state, {
                [action.book]: Object.assign({}, state[action.book], {
                    statistics, cajita,
                    strategy: {
                        precioDeRecuperacion: marketPrice.times( BigNumber(1).minus(currentBookState.fees.fee_decimal) ).times( BigNumber(1).minus(currentBookState.fees.fee_decimal) ).toFixed(2, BigNumber.ROUND_DOWN),
                        posActualRespectoCajita: marketPrice.greaterThan(cajita.topCajita) ?
                                            ARRIBA : ( marketPrice.lessThan(cajita.bottomCajita) ? ABAJO : DENTRO ),
                        prevPositionRespectoCajita: BigNumber(cajita.currentPosition || marketPrice).greaterThan(cajita.topCajita) ?
                                            ARRIBA : ( marketPrice.lessThan(cajita.bottomCajita) ? ABAJO : DENTRO )
                     }
                })
            })
        
        case UPDATE_FEES:
            return Object.assign({}, state, {
                [action.book]: {
                    fees: { fee_decimal: action.fee_decimal, fee_percent: action.fee_percent }
                }
            })

        default: return state
    }
}


// Side effects
export const printPriceDetailsEpic = (action$, store) => 
    action$
        .ofType(NEW_TRANSACTION_REPORTED)
        .map( () => {
            const { inversion: state } = store.getState()
            const currenStatus = Object.keys(state).filter( book => !!state[book].statistics ).map(book => {
                const { statistics, cajita, strategy } = state[book]
                return `  ${book} (${statistics.priceHistory.length}) =>\n` +
                    `    Cajita: High ${cajita.high}, Low ${cajita.low}, Top ${cajita.topCajita.toFixed(2)}, Bottom ${cajita.bottomCajita.toFixed(2)}, Gap: ${cajita.gapCajita.toFixed(2)}, Precio Retorno: ${strategy.precioDeRecuperacion}\n` +
                    `    Precio: ${statistics.marketPrice}mxn, Promedio ${statistics.avarage.toFixed(2)}mxn, Desv. Est.: ${statistics.standardDeviation.toFixed(2)}, High: ${statistics.high}, Low: ${statistics.low}`
            })

            return console.log( `Market\n${currenStatus.join('\n')}` )


            // Lógica de inversión

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