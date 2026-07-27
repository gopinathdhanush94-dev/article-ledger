-- ============================================================
-- Article Ledger — product change history (audit trail)
-- Run this once in Supabase SQL Editor, after schema.sql.
--
-- Automatically records who changed what and when, whenever MRP, Selling
-- Price, Master/Inner Carton Qty, or Master/Inner Carton dimensions are
-- edited on an existing product. Nothing in the app needs to call this
-- directly — it fires from a database trigger on every UPDATE, so it
-- catches edits made through the app AND anything done via SQL directly.
-- ============================================================

create table if not exists product_field_changes (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid references products(id) on delete cascade,
  field_name       text not null,
  old_value        text,
  new_value        text,
  changed_by_email text,
  changed_by_id    uuid,
  changed_at       timestamptz default now()
);

create index if not exists idx_product_field_changes_product on product_field_changes (product_id, changed_at desc);

alter table product_field_changes enable row level security;

drop policy if exists "Authenticated can read change log" on product_field_changes;
create policy "Authenticated can read change log"
  on product_field_changes for select
  to authenticated
  using (true);

-- The trigger function below is SECURITY DEFINER, so it can insert into
-- product_field_changes regardless of who performed the UPDATE — no INSERT
-- policy is needed for regular users.

create or replace function log_product_field_changes()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  tracked_fields text[] := array[
    'mrp', 'sp', 'master_qty', 'inner_qty',
    'master_l', 'master_w', 'master_h', 'master_dim_unit',
    'inner_l', 'inner_w', 'inner_h', 'inner_dim_unit'
  ];
  f text;
  old_val text;
  new_val text;
  actor_email text;
  actor_id uuid;
begin
  begin
    actor_email := auth.email();
    actor_id := auth.uid();
  exception when others then
    actor_email := null;
    actor_id := null;
  end;

  foreach f in array tracked_fields loop
    execute format('select ($1).%I::text', f) into old_val using old;
    execute format('select ($1).%I::text', f) into new_val using new;
    if old_val is distinct from new_val then
      insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
      values (new.id, f, old_val, new_val, actor_email, actor_id);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_log_product_field_changes on products;
create trigger trg_log_product_field_changes
  after update on products
  for each row execute function log_product_field_changes();
