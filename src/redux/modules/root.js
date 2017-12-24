'use stric';

import { combineEpics } from 'redux-observable'
import { combineReducers } from 'redux'
import bitso, { incomingMessageBitsoEpic, printMarketPriceEpic, tradeBuyEpic, tradeSellEpic } from './bitso'
import slack, { postMessageEpic, postMessageSuccessEpic } from './slack'

export const rootEpic = combineEpics(
  // Bitso
  incomingMessageBitsoEpic, printMarketPriceEpic, //tradeBuyEpic, tradeSellEpic

  // Slack
  postMessageEpic, postMessageSuccessEpic
);

export const rootReducer = combineReducers({
  bitso, slack
});