'use stric';

import { combineEpics } from 'redux-observable'
import { combineReducers } from 'redux'
import bitso, { incomingMessageBitsoEpic, printMarketPriceEpic, tradeBuyEpic, tradeSellEpic, 
       notifyNewPricesEpic, notifyNewTransactionEpic, getBitsoFeesEpic, getFeesOnConnectionEpic } from './bitso'
import slack, { postMessageEpic, postMessageSuccessEpic } from './slack'
import inversion, { printPriceDetailsEpic } from './inversion'

export const rootEpic = combineEpics(
  // Bitso
  incomingMessageBitsoEpic, notifyNewPricesEpic, notifyNewTransactionEpic, getBitsoFeesEpic, getFeesOnConnectionEpic,// tradeBuyEpic, tradeSellEpic

  // Slack
  postMessageEpic, postMessageSuccessEpic,

  // Inversion
  printPriceDetailsEpic
);

export const rootReducer = combineReducers({
  bitso, slack, inversion
});