'use stric';

import { combineEpics } from 'redux-observable'
import { combineReducers } from 'redux'
import bitso, { incomingMessageBitsoEpic } from './bitso'

export const rootEpic = combineEpics(
  incomingMessageBitsoEpic
);

export const rootReducer = combineReducers({
  bitso
});