-- Добавляем недостающие RLS политики для price_list_items
CREATE POLICY "Users can manage price list items through price lists"
ON public.price_list_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM price_lists pl, profiles p
    WHERE pl.id = price_list_items.price_list_id
    AND p.id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'branch_manager') OR has_role(auth.uid(), 'manager'))
    AND (pl.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = pl.branch
    ))
  )
);

CREATE POLICY "Users can view price list items from their branches"
ON public.price_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM price_lists pl, profiles p
    WHERE pl.id = price_list_items.price_list_id
    AND p.id = auth.uid()
    AND (pl.branch = p.branch OR EXISTS (
      SELECT 1 FROM manager_branches mb 
      WHERE mb.manager_id = auth.uid() AND mb.branch = pl.branch
    ))
  )
);