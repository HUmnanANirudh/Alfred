/**
 * Alfred — ID generation utilities
 * All IDs use the generateId(prefix) pattern with nanoid(5) suffix.
 * See 03_DATA_MODELS.md §4 for the full prefix table.
 */

import { nanoid } from 'nanoid';

/** Core generator — prefix + 5-char nanoid */
export const generateId = (prefix: string): string => `${prefix}_${nanoid(5)}`;

// Entity-specific helpers — use these in services and seed data
export const newProjectId    = (): string => generateId('proj');
export const newSourceId     = (): string => generateId('src');
export const newVideoId      = (): string => generateId('vid');
export const newTranscriptId = (): string => generateId('trs');
export const newClipId       = (): string => generateId('clip');
export const newShortId      = (): string => generateId('shrt');
export const newAudioId      = (): string => generateId('aud');
export const newWritingId    = (): string => generateId('wrt');
export const newPostId       = (): string => generateId('pst');
export const newVoiceId      = (): string => generateId('vce');
export const newJobId        = (): string => generateId('job');
export const newStepId       = (): string => generateId('stp');
