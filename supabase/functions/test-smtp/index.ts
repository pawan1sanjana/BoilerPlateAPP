// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { config } = await req.json()
    const { host, port, encryption, username, password, fromEmail, fromName } = config
    
    if (!host || !port) {
      throw new Error("SMTP host and port are required.")
    }

    const client = new SmtpClient();

    const connectConfig = {
      hostname: host,
      port: port,
      username: username,
      password: password,
    };
    
    // For Deno SMTP client, tls config:
    if (encryption === 'ssl/tls') {
      await client.connectTLS(connectConfig);
    } else {
      await client.connect(connectConfig);
    }
    
    await client.send({
      from: fromEmail || "test@example.com",
      to: fromEmail || "test@example.com", // send to themselves for testing
      subject: "Test Email - SMTP Configuration",
      content: "This is a test email to verify your SMTP configuration.",
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
