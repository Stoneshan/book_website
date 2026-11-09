-- 墨阅 · Supabase schema
-- Run this once in Supabase Dashboard -> SQL Editor.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  author text not null default '佚名' check (char_length(author) <= 200),
  description text not null default '',
  cover_path text,
  format text not null default 'txt'
    check (format in ('txt', 'md', 'epub', 'mobi', 'azw3', 'pdf')),
  render_mode text not null default 'text'
    check (render_mode in ('text', 'pdf')),
  status text not null default 'uploading'
    check (status in ('uploading', 'parsing', 'ready', 'failed')),
  parse_error text,
  chapter_count integer not null default 0 check (chapter_count >= 0),
  page_count integer check (page_count is null or page_count > 0),
  word_count integer not null default 0 check (word_count >= 0),
  search_text text generated always as (coalesce(title, '') || ' ' || coalesce(author, '')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private table: never expose storage paths to public readers.
create table if not exists public.book_files (
  book_id uuid primary key references public.books(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  format text not null check (format in ('txt', 'md', 'epub', 'mobi', 'azw3', 'pdf')),
  bytes bigint not null default 0 check (bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_no integer not null check (chapter_no > 0),
  title text not null,
  content text not null,
  word_count integer not null default 0 check (word_count >= 0),
  unique (book_id, chapter_no)
);

create table if not exists public.book_categories (
  book_id uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (book_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists books_status_updated on public.books (status, updated_at desc);
create index if not exists books_search_trgm on public.books using gin (search_text gin_trgm_ops);
create index if not exists chapters_book_no on public.chapters (book_id, chapter_no);
create index if not exists book_categories_category on public.book_categories (category_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at
before update on public.books
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.books enable row level security;
alter table public.book_files enable row level security;
alter table public.chapters enable row level security;
alter table public.categories enable row level security;
alter table public.book_categories enable row level security;

drop policy if exists "books public read ready" on public.books;
create policy "books public read ready"
on public.books for select to anon, authenticated
using (status = 'ready');

drop policy if exists "chapters public read ready" on public.chapters;
create policy "chapters public read ready"
on public.chapters for select to anon, authenticated
using (
  exists (
    select 1 from public.books b
    where b.id = chapters.book_id and b.status = 'ready'
  )
);

drop policy if exists "categories public read" on public.categories;
create policy "categories public read"
on public.categories for select to anon, authenticated
using (true);

drop policy if exists "book_categories public read ready" on public.book_categories;
create policy "book_categories public read ready"
on public.book_categories for select to anon, authenticated
using (
  exists (
    select 1 from public.books b
    where b.id = book_categories.book_id and b.status = 'ready'
  )
);

revoke insert, update, delete on public.books from anon, authenticated;
revoke insert, update, delete on public.chapters from anon, authenticated;
revoke insert, update, delete on public.categories from anon, authenticated;
revoke insert, update, delete on public.book_categories from anon, authenticated;
revoke all on public.book_files from anon, authenticated;

-- Service role bypasses RLS; all writes go through server actions / route handlers.

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('books', 'books', false, 52428800,
   array['text/plain', 'text/markdown', 'application/epub+zip', 'application/pdf',
         'application/x-mobipocket-ebook', 'application/vnd.amazon.ebook',
         'application/octet-stream'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers public read" on storage.objects;
create policy "covers public read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'covers');

-- No policies for the private "books" bucket: service role only.

notify pgrst, 'reload schema';
