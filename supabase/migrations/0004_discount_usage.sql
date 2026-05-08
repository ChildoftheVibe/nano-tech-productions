CREATE OR REPLACE FUNCTION increment_discount_usage(code_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE discount_codes
     SET current_uses = COALESCE(current_uses, 0) + 1
   WHERE id = code_id;
$$;
