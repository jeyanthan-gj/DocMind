-- 1. PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- 2. CHAT SESSIONS TABLE
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_sessions enable row level security;

create policy "Users can view their own sessions." on chat_sessions
  for select using (auth.uid() = user_id);

create policy "Users can create their own sessions." on chat_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own sessions." on chat_sessions
  for delete using (auth.uid() = user_id);

-- 3. CHAT MESSAGES TABLE
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

create policy "Users can view messages of their sessions." on chat_messages
  for select using (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert messages into their sessions." on chat_messages
  for insert with check (
    exists (
      select 1 from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = auth.uid()
    )
  );

-- 4. AI MODELS TABLE
create table public.ai_models (
  id uuid default gen_random_uuid() primary key,
  display_name text not null,
  api_model_name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_models enable row level security;
create policy "Everyone can view active models." on ai_models for select using (true);
create policy "Admins can manage models." on ai_models using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 5. SYSTEM SETTINGS TABLE
create table public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.system_settings enable row level security;
create policy "Admins can manage settings." on system_settings using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- TRIGGER for profiles on auth.users creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    'user', 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Initial Admin (Replace with your actual ID after first login)
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';

-- Seed Models
insert into public.ai_models (display_name, api_model_name, is_active)
values 
('Llama 3 8B', 'llama-3.1-8b-instant', true),
('Llama 3 70B', 'llama-3.1-70b-versatile', true),
('Mixtral 8x7B', 'mixtral-8x7b-32768', true);
