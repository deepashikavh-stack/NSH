-- Enable Realtime for the visitors table
begin;
  -- Enable publication for the table
  alter publication supabase_realtime add table visitors;
commit;
