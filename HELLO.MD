Build a **Service Reminder System (AC-focused, extensible to any device)** as a **complete full-stack product**. Ignore any predefined tech stack. Focus on clarity, scalability, and a premium user experience while staying simple enough to run on a free-tier backend (e.g., Supabase).

---

# 🧠 WHAT YOU ARE BUILDING (FULL SYSTEM)

This is a **time-based automation product with a user interface**.

It has 3 main parts:

1. **Frontend (UI for users/admin)**
2. **Backend / Database (data + logic)**
3. **Scheduler + Notification system (automation engine)**

---

# 🔁 CORE SYSTEM FLOW

```text
User adds device (AC)
→ system calculates next_service_date

Scheduler runs (hourly)
→ finds due reminders

If due:
→ send email
→ mark as sent

User marks service complete:
→ reset cycle
→ calculate next date again
```

---

# 🎨 FRONTEND (VERY IMPORTANT)

## Purpose

* Allow users/admin to interact with system
* Provide premium, clean experience

---

## Pages / Screens

### 1. Authentication

* Login / Signup
* Simple email-based auth

---

### 2. Dashboard (Main Screen)

Show:

* Upcoming reminders
* Overdue services
* Completed services
* Summary cards:

  * Total devices
  * Pending reminders
  * Completed services

---

### 3. Devices Page

User can:

* Add new AC/device
* Edit device
* Delete device

Form fields:

* Device name
* Purchase date
* Service interval

---

### 4. Reminders View

* List of all reminders
* Status:

  * Pending
  * Sent
  * Overdue

---

### 5. Service History

* List past services
* Mark a service as completed

---

### 6. Add Device Flow (IMPORTANT UX)

```text
Click "Add Device"
→ Fill form
→ Save
→ System auto-creates reminder
```

---

## UI/UX STYLE (Premium feel)

* Minimal design
* Card-based layout
* Soft shadows
* Clean typography
* Dark + light mode (optional)
* Smooth transitions

---

# ⚙️ BACKEND / DATABASE

## Tables

### users

* id
* name
* email

---

### devices

* id
* user_id
* device_name
* purchase_date
* service_interval_days

---

### reminders

* id
* device_id
* next_service_date
* notify_before_days
* notification_sent (boolean)

---

### service_logs

* id
* device_id
* serviced_at

---

# 🧠 CORE LOGIC

## When device is added:

```text
next_service_date = purchase_date + interval
```

---

## Scheduler logic (runs hourly):

```sql
SELECT * FROM reminders
WHERE notification_sent = false
AND NOW() >= (next_service_date - notify_before_days);
```

---

## For each result:

* Send email
* Update:

```sql
notification_sent = true
```

---

## When service completed:

```text
next_service_date = serviced_at + interval
notification_sent = false
```

---

# ⏰ SCHEDULER SYSTEM

* Runs every 1 hour (recommended)
* Lightweight function
* Must:

  * fetch due reminders
  * process in batches (LIMIT 100)
  * send emails

---

# 📧 EMAIL SYSTEM

* Integrate email API
* Send:

  * subject
  * device name
  * due date

Example:
“Your AC service is due tomorrow”

---

# 📈 PERFORMANCE DESIGN

* Handle:

  * 10,000–25,000 users
* Add index:

```sql
(next_service_date, notification_sent)
```

* Never scan full table

---

# 🧩 SYSTEM ARCHITECTURE

```text
Frontend (UI)
        ↓
Backend / DB (Supabase)
        ↓
Scheduler (cron function)
        ↓
Email API
        ↓
User
```

---

# 🧠 DESIGN PRINCIPLES

## 1. Simplicity

* No queues
* No heavy infra
* Keep logic clean

---

## 2. Idempotency

* Avoid duplicate emails

---

## 3. Separation

* UI
* Data
* Automation

---

## 4. Time-driven system

Everything revolves around:

* dates
* scheduled checks

---

# 🚀 FUTURE EXTENSIONS

Design so you can later add:

* SMS notifications
* Push notifications
* Multiple reminder stages
* Multiple device types

---

# 📌 FINAL EXPECTATION

Output should include:

1. Frontend structure (pages + flows)
2. Backend schema
3. Reminder logic
4. Scheduler design
5. Email integration
6. Clean architecture

Focus on:

* clarity
* real-world usability
* scalability without over-engineering
