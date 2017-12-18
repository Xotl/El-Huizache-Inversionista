'use stric';
// import 'rxjs/add/operator/ofType';
// import 'rxjs/add/operator/map';
// import 'rxjs/add/operator/do';
// import 'rxjs/add/operator/ignoreElements';
import 'rxjs';



// Actions
const
    BOOK_SUBSCRIBED = 'el-huizache-inversionista/bitso/BOOK_SUBSCRIBED',
    INCOMING_MESSAGE = 'el-huizache-inversionista/bitso/INCOMING_MESSAGE'




// Reducers

const buysReducer = (state = {}, { messageType, book, payload }) => {
    console.log(messageType, book, payload)
    switch (true) {
        case payload !== 'object': return state
        case messageType === 'trades':
            payload.forEach(
                (elem) => {
                    const { a: amount, r: rate, v: value, t: sell } = elem

                    console.log(`${sell ? 'Vendiendo' : 'Comprando'} ${amount} de ${book} a ${rate} por ${value}`)
                }
            )
            return state

            
        default: return state
    }
}

const sellsReducer = (state, { messageType }) => {
    switch (messageType) {
        case 'trades':

            
        default: return state
    }
}

export default function reducer(state = {}, action = {}) {

    switch (action.type) {
        case INCOMING_MESSAGE:
            return Object.assign({}, state, {
                sells: sellsReducer(state.sells, action),
                buys: buysReducer(state.buys, action)
            })
    
        default: return state
    }
}



// Action Creators
export const incomingMessageBitso = (book, messageType, message) => ({
    type: INCOMING_MESSAGE,
    messageType,
    message
})



// Side effects
export const incomingMessageBitsoEpic = action$ => 
    action$
        .ofType(INCOMING_MESSAGE)
        .do( action => console.log('Action procesada', action.type) )
        .ignoreElements()

    // action$.ofType(INCOMING_MESSAGE)
    //     .map(({ book, messageType, message }) => {
    //         switch (messageType) {
    //             case 'trades':
    //                 console.log(`Trade ${book} => `, payload)
    //                 break;

    //             case 'diff-orders':
    //                 console.log('Diff', payload)
    //                 break;

    //             case 'orders':
    //                 console.log('Orders', payload)
    //                 break;

    //             default:
    //                 console.log(`Algo raro "${messageType}"`, payload)
    //                 break;
    //         }
    //     })
// }