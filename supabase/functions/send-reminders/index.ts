// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3.490.0"

// API Keys
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// AWS SNS Config (Automatically uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from env)
const snsClient = new SNSClient({
    region: Deno.env.get('AWS_REGION') || 'us-east-1',
})

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
            email,
            phone
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

        // 2. Process and send emails & SMS
        for (const reminder of dueReminders) {
            const customerEmail = reminder.devices.customers.email
            const customerName = reminder.devices.customers.name
            const customerPhone = reminder.devices.customers.phone
            const deviceName = reminder.devices.device_name

            // --- A. SEND EMAIL VIA RESEND ---
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

            let emailSent = false
            if (res.ok) {
                emailSent = true
            } else {
                console.error('Failed to send email to', customerEmail, await res.text())
            }

            // --- B. SEND SMS OUTBOUND VIA AWS SNS ---
            // Ensure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set in Supabase Secrets
            let smsSent = false
            try {
                if (customerPhone && Deno.env.get('AWS_ACCESS_KEY_ID')) {
                    const snsMessage = `Servance: Friendly reminder, your AC Unit (${deviceName}) is due for service on ${reminder.next_service_date}. Reply to schedule!`

                    const command = new PublishCommand({
                        Message: snsMessage,
                        PhoneNumber: customerPhone,
                    });

                    await snsClient.send(command);
                    smsSent = true;
                    console.log(`Successfully sent SMS to ${customerPhone}`);
                }
            } catch (snsErr) {
                console.error('Failed to send AWS SNS SMS to', customerPhone, snsErr)
            }

            // Mark as sent if either delivered successfully
            if (emailSent || smsSent) {
                sentIds.push(reminder.id)
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
