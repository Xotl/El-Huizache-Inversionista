'use stric';

import { connectToBitso } from "./bisto"
import configureStore from './redux/configureStore'


const store = configureStore()
connectToBitso(store)
