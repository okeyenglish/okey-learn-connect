-- Enable realtime for whatsapp_sessions table
ALTER TABLE whatsapp_sessions REPLICA IDENTITY FULL;

-- Add whatsapp_sessions to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sessions;