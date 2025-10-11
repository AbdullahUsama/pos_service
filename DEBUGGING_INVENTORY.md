# Debugging Inventory Quantity Issues

## Step 1: Verify Database Column Exists

First, run this SQL in your Supabase SQL Editor to check if the quantity column exists:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'quantity';
```

**Expected Result:** Should show one row with:
- column_name: quantity
- data_type: integer
- is_nullable: YES

**If no results:** Run the migration first:
```sql
ALTER TABLE items ADD COLUMN quantity INTEGER;
```

## Step 2: Check Current Items

```sql
SELECT id, name, price, quantity, created_at 
FROM items 
ORDER BY name;
```

**Check:** Do your items have quantity values? NULL means unlimited stock.

## Step 3: Test Manual Update

Pick an item ID and test manual update:
```sql
UPDATE items SET quantity = 10 WHERE id = 'your-item-id-here';
```

## Step 4: Add Test Item with Quantity

```sql
INSERT INTO items (name, price, quantity) VALUES ('Test Item', 5.99, 20);
```

## Step 5: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to make a sale with the test item
4. Look for these console messages:
   - "Fetched items: [...]" - Shows if quantity is being loaded
   - "Processing item: ..." - Shows sale process
   - "Current quantity in DB: ..." - Shows database value
   - "Updating quantity from X to Y" - Shows calculation
   - "Successfully updated..." - Shows if update worked

## Step 6: Check Recent Sales

```sql
SELECT id, cashier_id, total_amount, payment_method, cart_details, created_at 
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;
```

**Check:** Are sales being recorded with correct cart_details?

## Step 7: Verify RLS Policies

Check if Row Level Security is blocking updates:

```sql
-- Check current policies on items table
SELECT * FROM pg_policies WHERE tablename = 'items';

-- If needed, allow updates for authenticated users
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to update items" ON items
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
```

## Common Issues & Solutions:

### Issue 1: Column doesn't exist
**Solution:** Run the migration SQL first

### Issue 2: Updates are blocked by RLS
**Solution:** Check and update Row Level Security policies

### Issue 3: Type mismatches
**Solution:** Ensure quantity is INTEGER type in database

### Issue 4: Null vs undefined handling
**Solution:** Check console logs for proper null checks

## Test Checklist:

- [ ] Quantity column exists in database
- [ ] Items have quantity values set (not all NULL)
- [ ] Console shows "Fetched items" with quantity data
- [ ] Console shows update process during sales
- [ ] Database quantity actually decreases after sale
- [ ] POS interface shows updated stock levels
- [ ] Out of stock items are disabled properly

## If still not working:

1. Share the console output from a test sale
2. Share the result of the database queries above
3. Check Supabase logs for any errors