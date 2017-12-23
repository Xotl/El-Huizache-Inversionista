'use stric';

import { combineEpics } from 'redux-observable'
import { combineReducers } from 'redux'
import bitso, { incomingMessageBitsoEpic, printMarketPriceEpic, tradeBuyEpic, tradeSellEpic } from './bitso'

export const rootEpic = combineEpics(
  incomingMessageBitsoEpic, printMarketPriceEpic //tradeBuyEpic, tradeSellEpic
);

export const rootReducer = combineReducers({
  bitso
});