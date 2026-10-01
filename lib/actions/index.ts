// Action layer – every data change goes through runAction (BAUVORLAGE §6).
// Stage 1 registers the actions the seed and the intake pipeline need;
// the remaining V1 actions follow with the stage that uses them.
import './area';
import './contacts';
import './hint';
import './instruction';
import './link';
import './matter';
import './note';
import './review';
import './task';

export { runAction, undoAction, type RunOptions } from './run';
export { defineAction, getAction } from './registry';
export { ActionError, type Actor } from './types';
export { answerHint } from './answer';
