// Action layer – every data change goes through runAction (BAUVORLAGE §6).
// Stage 1 registers the actions the seed and the intake pipeline need;
// the remaining V1 actions follow with the stage that uses them.
import './area';
import './chat';
import './contacts';
import './event';
import './handover';
import './hint';
import './instruction';
import './link';
import './mail';
import './matter';
import './note';
import './push';
import './review';
import './task';

export { runAction, undoAction, type RunOptions } from './run';
export { defineAction, getAction, listActions } from './registry';
export { ActionError, type Actor } from './types';
export { answerHint, answerHintText } from './answer';
