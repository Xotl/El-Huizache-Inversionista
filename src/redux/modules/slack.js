'use stric';
import Rx from 'rxjs';
import Fetch from '../utils/fetch';

// Constants
const 
    OAUTH_TOKEN = process.env.OAUTH_TOKEN,
    SLACK_CHANNEL = process.env.SLACK_CHANNEL,
    SLACK_BASE_URL = 'https://slack.com/api'


// Utils

// Actions
const
    POST_MESSAGE = 'el-huizache-inversionista/slack/POST_MESSAGE',
    POST_MESSAGE_SUCCESS = 'el-huizache-inversionista/slack/POST_MESSAGE_SUCCESS',
    POST_MESSAGE_ERROR = 'el-huizache-inversionista/slack/POST_MESSAGE_ERROR'


// Reducer
export default function reducer(state = {}, action = {}) {
    return state
}


// Action Creators
export const postMessage = (text, channel = SLACK_CHANNEL) => ({
    type: POST_MESSAGE,
    text, channel
})

export const postMessageSuccess = (details) => ({
    type: POST_MESSAGE_SUCCESS,
    details
})

export const postMessageError = () => ({
    type: POST_MESSAGE_ERROR
})


// Side effects
export const postMessageEpic = action$ => 
    action$
        .ofType(POST_MESSAGE)
        .mergeMap(
            ({ text, channel }) => Rx.Observable.fromPromise(
                Fetch({
                    uri: `${SLACK_BASE_URL}/chat.postMessage`,
                    qs: { text, channel },
                    headers: { Authorization: `Bearer ${OAUTH_TOKEN}` }
                })
            )
        )
        .map( ({ payload }) => postMessageSuccess(payload) )

export const postMessageSuccessEpic = action$ => 
    action$
        .ofType(POST_MESSAGE_SUCCESS)
        .do( ({ details }) => console.log('Mensaje enviado', details) )
        .ignoreElements()