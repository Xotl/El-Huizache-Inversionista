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



// Reducer helpers
const tradesReducer = (state = {}, { messageType, book, payload }) => {
    return state
}

    
// Reducer
export default function reducer(state = {}, action = {}) {

    switch (action.type) {
        case INCOMING_MESSAGE:
            return tradesReducer(state, action)
    
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



// Side effects
export const incomingMessageBitsoEpic = action$ => 
    action$
        .ofType(INCOMING_MESSAGE)
        .do( ({ messageType, book, payload }) => {

            if ( messageType !== 'trades' || typeof payload !== 'object' || typeof book === 'undefined') {
                return
            }
            
            const { major, minor } = book.split('_').reduce( (major, minor) => ({ major, minor }) )
        
            payload.forEach(
                (elem) => {
                    const { a: amount, r: rate, v: value, t: sell } = elem
        
                    if (sell) {
                        console.log(`Alguien vendió ${amount}${major} a $${rate}${minor}c/u con valor de $${value}${minor}`)
                    }
                    else {
                        console.log(`Alguien compró ${amount}${major} a $${rate}${minor}c/u con valor de $${value}${minor}`)
                    }
                }
            )
        } )
        .ignoreElements()
