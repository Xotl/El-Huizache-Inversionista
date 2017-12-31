'use stric';

import { combineEpics } from 'redux-observable'
import { combineReducers } from 'redux'
import bitso, { incomingMessageBitsoEpic, printMarketPriceEpic, tradeBuyEpic, tradeSellEpic, 
       notifyNewTransactionEpic, getBitsoFeesEpic, onConnectionToBitsoOpen, connectToBitsoEpic, 
       onConnectionToBitsoClosed, getBitsoBalanceEpic } from './bitso'
import slack, { postMessageEpic, postMessageSuccessEpic } from './slack'
import inversion, { printPriceDetailsEpic } from './inversion'

export const rootEpic = combineEpics(
  // Bitso
  incomingMessageBitsoEpic, getBitsoFeesEpic, onConnectionToBitsoOpen, 
  connectToBitsoEpic, onConnectionToBitsoClosed, getBitsoBalanceEpic,

  // Slack
  postMessageEpic, postMessageSuccessEpic,

  // Inversion
  printPriceDetailsEpic
);

export const rootReducer = combineReducers({
  bitso, slack, inversion
});