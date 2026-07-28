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

  if old.mrp is distinct from new.mrp then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'mrp', old.mrp::text, new.mrp::text, actor_email, actor_id);
  end if;

  if old.sp is distinct from new.sp then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'sp', old.sp::text, new.sp::text, actor_email, actor_id);
  end if;

  if old.master_qty is distinct from new.master_qty then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'master_qty', old.master_qty::text, new.master_qty::text, actor_email, actor_id);
  end if;

  if old.inner_qty is distinct from new.inner_qty then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'inner_qty', old.inner_qty::text, new.inner_qty::text, actor_email, actor_id);
  end if;

  if old.master_l is distinct from new.master_l then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'master_l', old.master_l::text, new.master_l::text, actor_email, actor_id);
  end if;

  if old.master_w is distinct from new.master_w then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'master_w', old.master_w::text, new.master_w::text, actor_email, actor_id);
  end if;

  if old.master_h is distinct from new.master_h then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'master_h', old.master_h::text, new.master_h::text, actor_email, actor_id);
  end if;

  if old.master_dim_unit is distinct from new.master_dim_unit then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'master_dim_unit', old.master_dim_unit, new.master_dim_unit, actor_email, actor_id);
  end if;

  if old.inner_l is distinct from new.inner_l then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'inner_l', old.inner_l::text, new.inner_l::text, actor_email, actor_id);
  end if;

  if old.inner_w is distinct from new.inner_w then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'inner_w', old.inner_w::text, new.inner_w::text, actor_email, actor_id);
  end if;

  if old.inner_h is distinct from new.inner_h then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'inner_h', old.inner_h::text, new.inner_h::text, actor_email, actor_id);
  end if;

  if old.inner_dim_unit is distinct from new.inner_dim_unit then
    insert into product_field_changes (product_id, field_name, old_value, new_value, changed_by_email, changed_by_id)
    values (new.id, 'inner_dim_unit', old.inner_dim_unit, new.inner_dim_unit, actor_email, actor_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_product_field_changes on products;
create trigger trg_log_product_field_changes
  after update on products
  for each row execute function log_product_field_changes();
