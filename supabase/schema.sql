-- Thapra Coffee — orders and delivery addresses.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  phone       text not null,
  email       text,
  line1       text not null,
  line2       text,
  landmark    text,
  city        text not null,
  state       text not null,
  pincode     text not null,
  notes       text
);

create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  order_number         text not null unique,
  address_id           uuid not null references public.addresses (id),
  items                jsonb not null,
  subtotal             integer not null,
  shipping             integer not null,
  total                integer not null,
  currency             text not null default 'INR',
  status               text not null default 'pending',  -- pending | paid | failed
  razorpay_order_id    text,
  razorpay_payment_id  text,
  paid_at              timestamptz
);

create index if not exists orders_order_number_idx on public.orders (order_number);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Locked down: nobody reads or writes these from the browser. The Edge Functions use the
-- service-role key, which bypasses row-level security, and no policy is granted to anon.
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
