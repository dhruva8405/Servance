-- 1. Create Customers Table
CREATE TABLE customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text
);

-- 2. Create Devices (AC Units) Table
CREATE TABLE devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  purchase_date date NOT NULL,
  service_interval_days integer NOT NULL DEFAULT 180
);

-- 3. Create Reminders Table
CREATE TABLE reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  next_service_date date NOT NULL,
  notify_before_days integer NOT NULL DEFAULT 7,
  notification_sent boolean NOT NULL DEFAULT false
);

-- 4. Create Service Logs Table
CREATE TABLE service_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  serviced_at date NOT NULL,
  notes text
);

-- 5. Create Database Trigger for Automatic Reminders

-- Function to create a reminder when a device is added
CREATE OR REPLACE FUNCTION auto_create_reminder()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO reminders (device_id, next_service_date)
  VALUES (NEW.id, NEW.purchase_date + NEW.service_interval_days);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_device_reminder
AFTER INSERT ON devices
FOR EACH ROW
EXECUTE FUNCTION auto_create_reminder();

-- Function to reset reminder when a service is completed
CREATE OR REPLACE FUNCTION reset_reminder_after_service()
RETURNS TRIGGER AS $$
DECLARE
  v_interval integer;
BEGIN
  -- Get the device's service interval
  SELECT service_interval_days INTO v_interval FROM devices WHERE id = NEW.device_id;
  
  -- Delete the old reminder (or mark as sent) and create a new one, OR just update the existing one.
  -- Here we update the existing reminder for the device to false + new date
  UPDATE reminders 
  SET next_service_date = NEW.serviced_at + v_interval,
      notification_sent = false
  WHERE device_id = NEW.device_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminder_on_service
AFTER INSERT ON service_logs
FOR EACH ROW
EXECUTE FUNCTION reset_reminder_after_service();

-- 6. Add Indexes for Performance
CREATE INDEX idx_reminders_status ON reminders(next_service_date, notification_sent);
CREATE INDEX idx_devices_customer ON devices(customer_id);

-- Optional: Enable Row Level Security (If using Supabase Auth for Admin)
-- For an internal tool, you can disable RLS or just require authenticated access:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (Assuming Admin is logged in) to do everything
CREATE POLICY "Allow authenticated users full access to customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access to devices" ON devices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access to reminders" ON reminders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access to service_logs" ON service_logs FOR ALL TO authenticated USING (true);
