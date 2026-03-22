// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req: Request) => {
    try {
        // 1. Fetch due reminders
        // We want reminders where notification_sent is false and next_service_date is coming up
        const { data: reminders, error: fetchError } = await supabase
            .from('reminders')
            .select(`
        id,
        next_service_date,
        notify_before_days,
        device_id,
        devices (
          device_name,
          customers (
            name,
            email
          )
        )
      `)
            .eq('notification_sent', false)
        // Basic check: is today >= (next_service_date - notify_before_days)?
        // For simplicity in the edge function, we can just fetch all unsent and filter in memory if volume is low,
        // or rely on a DB view. Let's do a simple memory filter for the exact date math, or raw SQL via RPC.
        // Since it's an edge function, let's fetch unsent and filter by date.

        if (fetchError) throw fetchError

        const today = new Date()
        const dueReminders = reminders?.filter(r => {
            const nextDate = new Date(r.next_service_date)
            const notifyDate = new Date(nextDate)
            notifyDate.setDate(notifyDate.getDate() - r.notify_before_days)
            return today >= notifyDate
        }) || []

        if (dueReminders.length === 0) {
            return new Response(JSON.stringify({ message: 'No reminders due.' }), { status: 200 })
        }

        const sentIds = []

        // 2. Process and send emails
        for (const reminder of dueReminders) {
            const customerEmail = reminder.devices.customers.email
            const customerName = reminder.devices.customers.name
            const deviceName = reminder.devices.device_name

            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Servance Alerts <onboarding@resend.dev>', // Update with verified domain
                    to: customerEmail,
                    subject: `Service Reminder: ${deviceName}`,
                    html: `
            <h2>Hello ${customerName},</h2>
            <p>This is a friendly reminder that your AC Unit (<strong>${deviceName}</strong>) is due for service on <strong>${reminder.next_service_date}</strong>.</p>
            <p>Please contact us to schedule your maintenance!</p>
            <br/>
            <p>Best regards,<br/>The Servance Team</p>
          `
                })
            })

            if (res.ok) {
                sentIds.push(reminder.id)
            } else {
                console.error('Failed to send email to', customerEmail, await res.text())
            }
        }

        // 3. Mark as sent in DB
        if (sentIds.length > 0) {
            await supabase
                .from('reminders')
                .update({ notification_sent: true })
                .in('id', sentIds)
        }

        return new Response(JSON.stringify({ message: `Sent ${sentIds.length} emails.` }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        return new Response(String(err?.message ?? err), { status: 500 })
    }
})
