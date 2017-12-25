'use stric';

import configureStore from './redux/configureStore'
import { conectTotBitso } from "./redux/modules/bitso";


const store = configureStore()
store.dispatch( conectTotBitso() )