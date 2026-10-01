// Data model – BAUVORLAGE §4. RLS policies, functions, triggers and extra
// indexes live in hand-written SQL migrations (lib/db/migrations).
import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

const id = () => uuid('id').primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const stamps = () => ({
  created_at: ts('created_at').notNull().defaultNow(),
  updated_at: ts('updated_at').notNull().defaultNow(),
});

export const reviewState = pgEnum('review_state', ['unreviewed', 'accepted', 'discarded']);
export const connectionKind = pgEnum('connection_kind', ['mail', 'calendar', 'drive']);
export const connectionProvider = pgEnum('connection_provider', ['imap', 'graph', 'caldav', 'smb', 'fixture']);
export const connectionStatus = pgEnum('connection_status', ['ok', 'error', 'disabled']);
export const matterKind = pgEnum('matter_kind', ['org_based', 'dated', 'period', 'item']);
export const orgRole = pgEnum('org_role', ['founding_team', 'partner', 'university', 'other']);
export const personRole = pgEnum('person_role', ['founder', 'mentor', 'partner', 'speaker', 'university', 'other']);
export const emailSource = pgEnum('email_source', ['mail', 'calendar', 'manual']);
export const openDone = pgEnum('open_done', ['open', 'done']);
export const createdByType = pgEnum('created_by_type', ['user', 'system']);
export const entryKind = pgEnum('entry_kind', ['mail', 'event', 'file', 'note', 'instruction', 'system']);
export const entryVisibility = pgEnum('entry_visibility', ['team', 'restricted']);
export const processingState = pgEnum('processing_state', ['pending', 'done', 'error', 'skipped']);
export const linkTargetType = pgEnum('link_target_type', ['matter', 'person', 'org']);
export const linkOrigin = pgEnum('link_origin', ['rule', 'model', 'human']);
export const confidence = pgEnum('confidence', ['high', 'medium', 'low']);
export const taskDirection = pgEnum('task_direction', ['ours', 'theirs']);
export const taskVisibility = pgEnum('task_visibility', ['team', 'private']);
export const actorType = pgEnum('actor_type', ['user', 'system', 'model']);
export const hintKind = pgEnum('hint_kind', [
  'clarify', 'overdue', 'waiting', 'stale', 'after_event', 'outcome', 'handover', 'review_batch', 'advice',
]);
export const hintStatus = pgEnum('hint_status', ['open', 'done', 'dismissed']);
export const chatRole = pgEnum('chat_role', ['user', 'assistant']);

// 4.1
export const users = pgTable('users', {
  id: id(),
  ...stamps(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  is_admin: boolean('is_admin').notNull().default(false),
});

// 4.2
export const connections = pgTable('connections', {
  id: id(),
  ...stamps(),
  user_id: uuid('user_id').references(() => users.id),
  kind: connectionKind('kind').notNull(),
  provider: connectionProvider('provider').notNull(),
  label: text('label').notNull(),
  config: jsonb('config').notNull().default({}),
  cursor: jsonb('cursor'),
  status: connectionStatus('status').notNull().default('ok'),
  last_sync_at: ts('last_sync_at'),
  last_error: text('last_error'),
  import_since: date('import_since').notNull().default(sql`(current_date - interval '12 months')`),
});

// 4.3
export const areas = pgTable('areas', {
  id: id(),
  ...stamps(),
  key: text('key').notNull().unique(),
  name_singular: text('name_singular').notNull(),
  name_plural: text('name_plural').notNull(),
  description: text('description').notNull().default(''),
  matter_kind: matterKind('matter_kind').notNull(),
  fields: jsonb('fields').notNull().default([]),
  phases: text('phases').array().notNull().default(sql`'{}'::text[]`),
  sort: integer('sort').notNull().default(0),
  actions: jsonb('actions').notNull().default([]),
});

// 4.4
export const orgs = pgTable('orgs', {
  id: id(),
  ...stamps(),
  name: text('name').notNull(),
  role: orgRole('role').notNull().default('other'),
  domains: text('domains').array().notNull().default(sql`'{}'::text[]`),
  fields: jsonb('fields').notNull().default({}),
  phase: text('phase'),
  owner_user_id: uuid('owner_user_id').references(() => users.id),
  review_state: reviewState('review_state').notNull().default('accepted'),
  discard_reason: text('discard_reason'),
  merged_into_id: uuid('merged_into_id').references((): AnyPgColumn => orgs.id),
});

// 4.5
export const people = pgTable('people', {
  id: id(),
  ...stamps(),
  name: text('name').notNull(),
  org_id: uuid('org_id').references(() => orgs.id),
  role: personRole('role').notNull().default('other'),
  notes: text('notes'),
  review_state: reviewState('review_state').notNull().default('accepted'),
  discard_reason: text('discard_reason'),
  merged_into_id: uuid('merged_into_id').references((): AnyPgColumn => people.id),
});

export const personEmails = pgTable('person_emails', {
  id: id(),
  ...stamps(),
  person_id: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  source: emailSource('source').notNull(),
  confirmed: boolean('confirmed').notNull().default(false),
});

// 4.6
export const matters = pgTable('matters', {
  id: id(),
  ...stamps(),
  area_id: uuid('area_id').notNull().references(() => areas.id),
  title: text('title').notNull(),
  owner_user_id: uuid('owner_user_id').references(() => users.id),
  status: openDone('status').notNull().default('open'),
  phase: text('phase'),
  fields: jsonb('fields').notNull().default({}),
  org_id: uuid('org_id').references(() => orgs.id),
  parent_id: uuid('parent_id').references((): AnyPgColumn => matters.id),
  date_start: ts('date_start'),
  date_end: ts('date_end'),
  predecessor_id: uuid('predecessor_id').references((): AnyPgColumn => matters.id),
  review_state: reviewState('review_state').notNull().default('accepted'),
  discard_reason: text('discard_reason'),
  created_by_type: createdByType('created_by_type').notNull().default('user'),
  outcome_note: text('outcome_note'),
});

// 4.7
export const entries = pgTable('entries', {
  id: id(),
  ...stamps(),
  kind: entryKind('kind').notNull(),
  connection_id: uuid('connection_id').references(() => connections.id),
  external_id: text('external_id'),
  dedupe_key: text('dedupe_key').notNull().unique(),
  thread_key: text('thread_key'),
  occurred_at: ts('occurred_at').notNull(),
  author_user_id: uuid('author_user_id').references(() => users.id),
  author_person_id: uuid('author_person_id').references(() => people.id),
  title: text('title'),
  body_text: text('body_text'),
  summary: text('summary'),
  blob_path: text('blob_path'),
  meta: jsonb('meta').notNull().default({}),
  visibility: entryVisibility('visibility').notNull().default('restricted'),
  visible_to: uuid('visible_to').array().notNull().default(sql`'{}'::uuid[]`),
  instruction_area_id: uuid('instruction_area_id').references(() => areas.id),
  instruction_user_id: uuid('instruction_user_id').references(() => users.id),
  historical: boolean('historical').notNull().default(false),
  processing_state: processingState('processing_state').notNull().default('pending'),
  search: tsvector('search').generatedAlwaysAs(
    sql`to_tsvector('german'::regconfig, coalesce(title, '') || ' ' || coalesce(body_text, '') || ' ' || coalesce(summary, ''))`,
  ),
});

// 4.12 (declared before actions because actions.chat_id references it)
export const chats = pgTable('chats', {
  id: id(),
  ...stamps(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  title: text('title'),
  context_type: text('context_type'),
  context_id: uuid('context_id'),
  pinned: boolean('pinned').notNull().default(false),
});

export const chatMessages = pgTable('chat_messages', {
  id: id(),
  ...stamps(),
  chat_id: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: chatRole('role').notNull(),
  content: jsonb('content').notNull(),
});

// 4.10
export const actions = pgTable('actions', {
  id: id(),
  ...stamps(),
  actor_type: actorType('actor_type').notNull(),
  actor_user_id: uuid('actor_user_id').references(() => users.id),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  inverse: jsonb('inverse'),
  parent_action_id: uuid('parent_action_id').references((): AnyPgColumn => actions.id),
  reason: text('reason'),
  applied_instruction_ids: uuid('applied_instruction_ids').array().notNull().default(sql`'{}'::uuid[]`),
  chat_id: uuid('chat_id').references(() => chats.id),
  undone_at: ts('undone_at'),
  undone_by: uuid('undone_by').references(() => users.id),
});

// 4.8
export const links = pgTable(
  'links',
  {
    id: id(),
    ...stamps(),
    entry_id: uuid('entry_id').notNull().references(() => entries.id),
    target_type: linkTargetType('target_type').notNull(),
    target_id: uuid('target_id').notNull(),
    origin: linkOrigin('origin').notNull(),
    confidence: confidence('confidence').notNull(),
    action_id: uuid('action_id').references(() => actions.id),
  },
  (t) => [unique('links_entry_target_unique').on(t.entry_id, t.target_type, t.target_id)],
);

// 4.9
export const tasks = pgTable('tasks', {
  id: id(),
  ...stamps(),
  title: text('title').notNull(),
  direction: taskDirection('direction').notNull(),
  owner_user_id: uuid('owner_user_id').references(() => users.id),
  owner_person_id: uuid('owner_person_id').references(() => people.id),
  due_at: ts('due_at'),
  status: openDone('status').notNull().default('open'),
  done_at: ts('done_at'),
  matter_id: uuid('matter_id').references(() => matters.id),
  org_id: uuid('org_id').references(() => orgs.id),
  source_entry_id: uuid('source_entry_id').references(() => entries.id),
  visibility: taskVisibility('visibility').notNull().default('team'),
  owner_of_private: uuid('owner_of_private').references(() => users.id),
  action_id: uuid('action_id').references(() => actions.id),
});

// 4.11
export const hints = pgTable('hints', {
  id: id(),
  ...stamps(),
  user_id: uuid('user_id').references(() => users.id),
  kind: hintKind('kind').notNull(),
  text: text('text').notNull(),
  reason: text('reason'),
  area_id: uuid('area_id').references(() => areas.id),
  target_type: text('target_type'),
  target_id: uuid('target_id'),
  options: jsonb('options').notNull().default([]),
  status: hintStatus('status').notNull().default('open'),
  show_from: ts('show_from'),
  dedupe_key: text('dedupe_key').notNull().unique(),
});
