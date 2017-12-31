'use stric';

import configureStore from './redux/configureStore'
import { conectTotBitso, getBitsoBalance } from "./redux/modules/bitso";


const store = configureStore()
store.dispatch( conectTotBitso() )
// store.dispatch( getBitsoBalance() )